import { chromium, BrowserContext, Page, Browser } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

/**
 * Shared browser session manager for scripts
 * Handles session persistence and browser lifecycle
 */

interface ActiveSession {
  context: BrowserContext;
  page: Page;
  domain: string;
  sessionPath: string;
  lastActivity: Date;
}

class BrowserSessionManager {
  private sessions: Map<string, ActiveSession> = new Map();
  private browser: Browser | null = null;
  private baseSessionPath: string;
  private sharedContext: BrowserContext | null = null;
  private sharedContextEnabled: boolean = false;

  constructor() {
    // Use same session directory as MCP server
    this.baseSessionPath = path.resolve(process.cwd(), 'sessions');
  }

  /**
   * Get or create a browser session for a domain
   */
  async getOrCreateSession(domain: string): Promise<{ page: Page; context: BrowserContext }> {
    // Check if we have an active session
    const existing = this.sessions.get(domain);
    if (existing) {
      existing.lastActivity = new Date();
      return { page: existing.page, context: existing.context };
    }

    // If shared context is enabled, use that
    if (this.sharedContextEnabled) {
      return this.getOrCreateSharedSession();
    }

    // Create new session
    const sessionPath = path.join(this.baseSessionPath, domain);
    await fs.mkdir(sessionPath, { recursive: true });

    // Launch browser if not already running
    if (!this.browser) {
      this.browser = await chromium.launch({
        channel: 'chrome', // Use Chrome instead of Chromium
        headless: false, // Set to true for CI/CD
      });
    }

    // Create persistent context
    const context = await this.browser.newContext({
      storageState: await this.loadStorageState(sessionPath),
      viewport: { width: 1280, height: 720 },
    });

    // Create page
    const page = await context.newPage();

    // Save session on page close
    page.on('close', async () => {
      await this.saveStorageState(sessionPath, context);
    });

    // Store session
    const session: ActiveSession = {
      context,
      page,
      domain,
      sessionPath,
      lastActivity: new Date(),
    };
    this.sessions.set(domain, session);

    return { page, context };
  }

  /**
   * Get or create shared browser session (for OAuth flows)
   */
  async getOrCreateSharedSession(): Promise<{ page: Page; context: BrowserContext }> {
    if (this.sharedContext) {
      const pages = this.sharedContext.pages();
      if (pages.length > 0) {
        return { page: pages[0], context: this.sharedContext };
      }
      const page = await this.sharedContext.newPage();
      return { page, context: this.sharedContext };
    }

    // Launch browser if not already running
    if (!this.browser) {
      this.browser = await chromium.launch({
        channel: 'chrome', // Use Chrome instead of Chromium
        headless: false,
      });
    }

    // Create shared context
    const sessionPath = path.join(this.baseSessionPath, 'shared');
    await fs.mkdir(sessionPath, { recursive: true });

    this.sharedContext = await this.browser.newContext({
      storageState: await this.loadStorageState(sessionPath),
      viewport: { width: 1280, height: 720 },
    });

    const page = await this.sharedContext.newPage();

    return { page, context: this.sharedContext };
  }

  /**
   * Enable shared context mode
   */
  async enableSharedContext(): Promise<void> {
    this.sharedContextEnabled = true;
  }

  /**
   * Disable shared context mode
   */
  async disableSharedContext(): Promise<void> {
    this.sharedContextEnabled = false;
    if (this.sharedContext) {
      await this.sharedContext.close();
      this.sharedContext = null;
    }
  }

  /**
   * Get active page for a domain
   */
  async getPage(domain: string): Promise<Page> {
    const session = await this.getOrCreateSession(domain);
    return session.page;
  }

  /**
   * Save session storage state
   */
  async saveSession(domain: string): Promise<void> {
    const session = this.sessions.get(domain);
    if (!session) {
      throw new Error(`No active session for domain: ${domain}`);
    }

    await this.saveStorageState(session.sessionPath, session.context);
  }

  /**
   * List all saved sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.baseSessionPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear session for a domain
   */
  async clearSession(domain: string): Promise<void> {
    // Close active session if exists
    const session = this.sessions.get(domain);
    if (session) {
      await session.context.close();
      this.sessions.delete(domain);
    }

    // Delete session directory
    const sessionPath = path.join(this.baseSessionPath, domain);
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  /**
   * Close all sessions and browser
   */
  async close(): Promise<void> {
    // Close all active sessions
    for (const session of this.sessions.values()) {
      await session.context.close();
    }
    this.sessions.clear();

    // Close shared context
    if (this.sharedContext) {
      await this.sharedContext.close();
      this.sharedContext = null;
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Load storage state from file
   */
  private async loadStorageState(sessionPath: string): Promise<any> {
    const statePath = path.join(sessionPath, 'state.json');
    try {
      const state = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(state);
    } catch (error) {
      // No existing state, return empty
      return undefined;
    }
  }

  /**
   * Save storage state to file
   */
  private async saveStorageState(sessionPath: string, context: BrowserContext): Promise<void> {
    const statePath = path.join(sessionPath, 'state.json');
    const state = await context.storageState();
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
}

// Singleton instance
export const sessionManager = new BrowserSessionManager();

// Cleanup on exit
process.on('SIGINT', async () => {
  await sessionManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sessionManager.close();
  process.exit(0);
});
