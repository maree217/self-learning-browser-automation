import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { BrowserSession, SessionConfig } from './types.js';

/**
 * Manages browser instances and per-domain session persistence
 * Supports both isolated contexts (per-domain) and shared context (for OAuth flows)
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private sessions: Map<string, BrowserSession> = new Map();
  private sessionBaseDir: string;
  private headless: boolean;
  private sharedContext: BrowserContext | null = null;
  private useSharedContext: boolean = false;

  constructor(sessionDir?: string, headless: boolean = false, sharedContext: boolean = false) {
    // Default session directory
    this.sessionBaseDir = sessionDir || path.join(
      os.homedir(),
      '.browser-mcp',
      'sessions'
    );
    this.headless = headless;
    this.useSharedContext = sharedContext;

    // Ensure base directory exists
    if (!fs.existsSync(this.sessionBaseDir)) {
      fs.mkdirSync(this.sessionBaseDir, { recursive: true });
    }

    // Discover existing sessions on startup
    this.discoverSessions();
  }

  /**
   * Enable shared context mode for OAuth flows
   * All domains will share the same browser context and cookies
   */
  enableSharedContext(): void {
    this.useSharedContext = true;
  }

  /**
   * Disable shared context mode (back to per-domain isolation)
   */
  disableSharedContext(): void {
    this.useSharedContext = false;
  }

  /**
   * Check if shared context mode is enabled
   */
  isSharedContextEnabled(): boolean {
    return this.useSharedContext;
  }

  /**
   * Get or create a browser instance
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        channel: 'chrome',
        headless: this.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ]
      });
    }
    return this.browser;
  }

  /**
   * Get or create a persistent context for a domain
   * Uses shared context if enabled (for OAuth flows), otherwise per-domain isolation
   */
  async getSession(domain: string, config?: SessionConfig): Promise<BrowserSession> {
    // Check if session already exists
    if (this.sessions.has(domain)) {
      const session = this.sessions.get(domain)!;
      session.lastActivity = new Date();
      return session;
    }

    let context: BrowserContext;
    let sessionPath: string;

    if (this.useSharedContext) {
      // Shared context mode: All domains share cookies (for OAuth flows)
      if (!this.sharedContext) {
        sessionPath = path.join(this.sessionBaseDir, '_shared');

        // Check if session already exists on disk
        const sessionExists = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;

        // Ensure session directory exists
        if (!fs.existsSync(sessionPath)) {
          fs.mkdirSync(sessionPath, { recursive: true });
        }

        // Log session loading status
        if (sessionExists) {
          console.log(`[BrowserManager] Loading existing SHARED context session`);
        } else {
          console.log(`[BrowserManager] Creating new SHARED context session`);
        }
        console.log(`  Session path: ${sessionPath}`);

        // Launch shared persistent context
        this.sharedContext = await chromium.launchPersistentContext(sessionPath, {
          channel: 'chrome',
          headless: config?.headless ?? this.headless,
          viewport: config?.viewport ?? { width: 1920, height: 1080 },
          userAgent: config?.userAgent,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
          ]
        });

        // Log cookies loaded
        const cookies = await this.sharedContext.cookies();
        console.log(`  Loaded ${cookies.length} cookie(s) in shared context`);
      }
      context = this.sharedContext;
      sessionPath = path.join(this.sessionBaseDir, '_shared');
    } else {
      // Per-domain isolation mode: Each domain has its own context
      sessionPath = path.join(this.sessionBaseDir, this.sanitizeDomain(domain));

      // Check if session already exists on disk
      const sessionExists = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;

      // Ensure session directory exists
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      // Log session loading status
      if (sessionExists) {
        console.log(`[BrowserManager] Loading existing session for domain: ${domain}`);
        console.log(`  Session path: ${sessionPath}`);
      } else {
        console.log(`[BrowserManager] Creating new session for domain: ${domain}`);
        console.log(`  Session path: ${sessionPath}`);
      }

      // Launch persistent context
      context = await chromium.launchPersistentContext(sessionPath, {
        channel: 'chrome',
        headless: config?.headless ?? this.headless,
        viewport: config?.viewport ?? { width: 1920, height: 1080 },
        userAgent: config?.userAgent,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ]
      });

      // Log cookies loaded (helps verify session was restored)
      const cookies = await context.cookies();
      console.log(`  Loaded ${cookies.length} cookie(s) for ${domain}`);
    }

    const session: BrowserSession = {
      domain,
      context,
      pages: new Map(),
      sessionPath,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(domain, session);
    return session;
  }

  /**
   * Get the current active page for a domain
   */
  async getActivePage(domain: string): Promise<Page> {
    const session = await this.getSession(domain);

    // Get existing pages
    const pages = session.context.pages();

    if (pages.length === 0) {
      // Create new page if none exist
      const page = await session.context.newPage();
      session.pages.set('default', page);
      return page;
    }

    // Return the first page (most recent)
    return pages[0];
  }

  /**
   * Create a new page in the context
   */
  async createPage(domain: string): Promise<Page> {
    const session = await this.getSession(domain);
    const page = await session.context.newPage();

    const pageId = `page_${Date.now()}`;
    session.pages.set(pageId, page);

    return page;
  }

  /**
   * Get all pages for a domain
   */
  async getAllPages(domain: string): Promise<Page[]> {
    const session = await this.getSession(domain);
    return session.context.pages();
  }

  /**
   * Get or create a CDP session for a domain
   * CDP sessions provide access to Chrome DevTools Protocol for advanced features
   * like rich accessibility tree access
   */
  async getOrCreateCDPSession(domain: string): Promise<CDPSession> {
    const session = await this.getSession(domain);

    // Return existing CDP session if available
    if (session.cdpSession) {
      return session.cdpSession;
    }

    // Create new CDP session from the active page
    const page = await this.getActivePage(domain);
    const cdpSession = await page.context().newCDPSession(page);

    // Cache the CDP session in the browser session
    session.cdpSession = cdpSession;
    session.lastActivity = new Date();

    return cdpSession;
  }

  /**
   * Close a specific page
   */
  async closePage(domain: string, page: Page): Promise<void> {
    await page.close();

    // Remove from session pages map
    const session = this.sessions.get(domain);
    if (session) {
      for (const [id, p] of session.pages.entries()) {
        if (p === page) {
          session.pages.delete(id);
          break;
        }
      }
    }
  }

  /**
   * Clear session for a domain
   */
  async clearSession(domain: string): Promise<void> {
    const session = this.sessions.get(domain);

    if (session) {
      // Detach CDP session if exists
      if (session.cdpSession) {
        try {
          await session.cdpSession.detach();
        } catch (error) {
          console.error(`Error detaching CDP session for ${domain}:`, error);
        }
        session.cdpSession = undefined;
      }

      // Close all pages
      const pages = session.context.pages();
      await Promise.all(pages.map(p => p.close()));

      // Close context
      await session.context.close();

      // Remove from sessions map
      this.sessions.delete(domain);

      // Delete session directory
      const sessionPath = path.join(this.sessionBaseDir, this.sanitizeDomain(domain));
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    }
  }

  /**
   * List all saved sessions
   */
  listSessions(): string[] {
    if (!fs.existsSync(this.sessionBaseDir)) {
      return [];
    }

    return fs.readdirSync(this.sessionBaseDir)
      .filter(name => fs.statSync(path.join(this.sessionBaseDir, name)).isDirectory());
  }

  /**
   * Discover existing sessions on disk at startup
   * This allows the browser to "remember" sessions across restarts
   */
  private discoverSessions(): void {
    const existingSessions = this.listSessions();

    if (existingSessions.length > 0) {
      console.log(`[BrowserManager] Discovered ${existingSessions.length} existing session(s):`);
      existingSessions.forEach(domain => {
        const sessionPath = path.join(this.sessionBaseDir, domain);
        const stats = fs.statSync(sessionPath);
        console.log(`  - ${domain} (last modified: ${stats.mtime.toLocaleString()})`);
      });
      console.log(`[BrowserManager] Sessions will be loaded on first use`);
    } else {
      console.log(`[BrowserManager] No existing sessions found. Sessions will be saved to: ${this.sessionBaseDir}`);
    }
  }

  /**
   * Close all sessions and browser
   */
  async close(): Promise<void> {
    // Close all sessions
    for (const [domain, session] of this.sessions.entries()) {
      try {
        // Detach CDP session if exists
        if (session.cdpSession) {
          try {
            await session.cdpSession.detach();
          } catch (error) {
            console.error(`Error detaching CDP session for ${domain}:`, error);
          }
        }

        await session.context.close();
      } catch (error) {
        console.error(`Error closing session for ${domain}:`, error);
      }
    }
    this.sessions.clear();

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Sanitize domain name for use in file paths
   */
  private sanitizeDomain(domain: string): string {
    return domain.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}

// Singleton instance
export const browserManager = new BrowserManager();
