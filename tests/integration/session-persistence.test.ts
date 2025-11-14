import { BrowserManager } from '../../src/browser-manager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Integration tests for session persistence fix
 * Tests that sessions survive restarts and cookies are properly loaded
 *
 * This validates the fix for: "Every time it starts up, your memory is empty"
 */
describe('Session Persistence Integration Tests', () => {
  const testSessionDir = path.join(os.tmpdir(), 'browser-mcp-test-sessions', String(Date.now()));
  let manager: BrowserManager;

  beforeEach(() => {
    // Create clean test session directory
    if (fs.existsSync(testSessionDir)) {
      fs.rmSync(testSessionDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testSessionDir, { recursive: true });
  });

  afterEach(async () => {
    // Close browser manager
    if (manager) {
      await manager.close();
    }

    // Cleanup test directory
    if (fs.existsSync(testSessionDir)) {
      fs.rmSync(testSessionDir, { recursive: true, force: true });
    }
  });

  describe('Session Discovery on Startup', () => {
    it('should discover existing sessions on startup (fix for empty memory)', async () => {
      // SETUP: Create a manager and save a session
      const manager1 = new BrowserManager(testSessionDir, true, false);

      // Create a session with cookies by navigating
      const session1 = await manager1.getSession('httpbin.org');
      const page = await manager1.getActivePage('httpbin.org');

      // Navigate and set a cookie
      await page.goto('https://httpbin.org/cookies/set?test=session_persistence');
      await page.waitForTimeout(1000); // Wait for cookie to be set

      // Verify cookie was set
      const cookies1 = await session1.context.cookies();
      expect(cookies1.length).toBeGreaterThan(0);
      expect(cookies1.some(c => c.name === 'test')).toBe(true);

      // Close the manager (simulate app restart)
      await manager1.close();

      // VERIFY: Create new manager - should discover existing session
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const manager2 = new BrowserManager(testSessionDir, true, false);

      // Check that discoverSessions logged the found session
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BrowserManager] Discovered 1 existing session')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('httpbin.org')
      );

      consoleSpy.mockRestore();

      // Load the session and verify cookies persisted
      const session2 = await manager2.getSession('httpbin.org');
      const cookies2 = await session2.context.cookies();

      expect(cookies2.length).toBeGreaterThan(0);
      expect(cookies2.some(c => c.name === 'test' && c.value === 'session_persistence')).toBe(true);

      await manager2.close();
    }, 30000);

    it('should report when no sessions exist', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create manager in empty directory
      manager = new BrowserManager(testSessionDir, true, false);

      // Should log that no sessions were found
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BrowserManager] No existing sessions found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Multi-Domain Session Isolation', () => {
    it('should maintain separate sessions for different domains', async () => {
      manager = new BrowserManager(testSessionDir, true, false);

      // Create sessions for two domains
      const session1 = await manager.getSession('httpbin.org');
      const session2 = await manager.getSession('example.com');

      // Set different cookies for each domain
      const page1 = await manager.getActivePage('httpbin.org');
      const page2 = await manager.getActivePage('example.com');

      await page1.goto('https://httpbin.org/cookies/set?domain1=value1');
      await page1.waitForTimeout(500);

      await page2.goto('https://example.com');
      await page2.context().addCookies([{
        name: 'domain2',
        value: 'value2',
        domain: 'example.com',
        path: '/',
      }]);

      // Verify cookies are isolated
      const cookies1 = await session1.context.cookies();
      const cookies2 = await session2.context.cookies();

      expect(cookies1.some(c => c.name === 'domain1')).toBe(true);
      expect(cookies1.some(c => c.name === 'domain2')).toBe(false);

      expect(cookies2.some(c => c.name === 'domain2')).toBe(true);
      expect(cookies2.some(c => c.name === 'domain1')).toBe(false);

      // Verify both sessions persist after restart
      await manager.close();

      const manager2 = new BrowserManager(testSessionDir, true, false);
      const listedSessions = manager2.listSessions();

      expect(listedSessions).toContain('httpbin.org');
      expect(listedSessions).toContain('example.com');
      expect(listedSessions.length).toBe(2);

      await manager2.close();
    }, 30000);
  });

  describe('Cookie Persistence Across Restarts', () => {
    it('should persist multiple cookies across restarts', async () => {
      // Create session with multiple cookies
      const manager1 = new BrowserManager(testSessionDir, true, false);
      const session1 = await manager1.getSession('httpbin.org');
      const page = await manager1.getActivePage('httpbin.org');

      // Set multiple cookies
      await page.goto('https://httpbin.org');
      await page.context().addCookies([
        { name: 'cookie1', value: 'value1', domain: 'httpbin.org', path: '/' },
        { name: 'cookie2', value: 'value2', domain: 'httpbin.org', path: '/' },
        { name: 'cookie3', value: 'value3', domain: 'httpbin.org', path: '/' },
      ]);

      const cookies1 = await session1.context.cookies();
      expect(cookies1.length).toBe(3);

      await manager1.close();

      // Restart and verify all cookies persist
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const manager2 = new BrowserManager(testSessionDir, true, false);

      // Should log loading existing session
      const session2 = await manager2.getSession('httpbin.org');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BrowserManager] Loading existing session for domain: httpbin.org')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 3 cookie(s) for httpbin.org')
      );

      consoleSpy.mockRestore();

      const cookies2 = await session2.context.cookies();
      expect(cookies2.length).toBe(3);
      expect(cookies2.some(c => c.name === 'cookie1' && c.value === 'value1')).toBe(true);
      expect(cookies2.some(c => c.name === 'cookie2' && c.value === 'value2')).toBe(true);
      expect(cookies2.some(c => c.name === 'cookie3' && c.value === 'value3')).toBe(true);

      await manager2.close();
    }, 30000);
  });

  describe('Shared Context Mode', () => {
    it('should use shared context when enabled', async () => {
      manager = new BrowserManager(testSessionDir, true, true); // Enable shared context

      expect(manager.isSharedContextEnabled()).toBe(true);

      // Create sessions for different domains - they should share cookies
      const session1 = await manager.getSession('example.com');
      const page1 = await manager.getActivePage('example.com');

      await page1.goto('https://example.com');
      await page1.context().addCookies([{
        name: 'shared_cookie',
        value: 'shared_value',
        domain: 'example.com',
        path: '/',
      }]);

      // Second domain should see the same context
      const session2 = await manager.getSession('httpbin.org');

      // In shared context mode, both sessions use the same context
      expect(session1.context === session2.context).toBe(true);
    }, 30000);

    it('should persist shared context across restarts', async () => {
      // Create shared context session
      const manager1 = new BrowserManager(testSessionDir, true, true);
      const session1 = await manager1.getSession('example.com');

      await session1.context.addCookies([{
        name: 'shared_cookie',
        value: 'oauth_token',
        domain: 'example.com',
        path: '/',
      }]);

      const cookies1 = await session1.context.cookies();
      expect(cookies1.some(c => c.name === 'shared_cookie')).toBe(true);

      await manager1.close();

      // Restart with shared context
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const manager2 = new BrowserManager(testSessionDir, true, true);
      const session2 = await manager2.getSession('example.com');

      // Should log loading existing shared session
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BrowserManager] Loading existing SHARED context session')
      );

      consoleSpy.mockRestore();

      const cookies2 = await session2.context.cookies();
      expect(cookies2.some(c => c.name === 'shared_cookie' && c.value === 'oauth_token')).toBe(true);

      await manager2.close();
    }, 30000);
  });

  describe('Session Logging and Visibility', () => {
    it('should log detailed session information when loading', async () => {
      // Create initial session
      const manager1 = new BrowserManager(testSessionDir, true, false);
      await manager1.getSession('example.com');
      await manager1.close();

      // Restart and capture logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const manager2 = new BrowserManager(testSessionDir, true, false);

      // Should log discovery
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BrowserManager] Discovered 1 existing session')
      );

      // Should log last modified time
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/- example\.com \(last modified:.*\)/)
      );

      // Load session - should log loading
      await manager2.getSession('example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BrowserManager] Loading existing session for domain: example.com')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session path:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Loaded \d+ cookie\(s\) for example\.com/)
      );

      consoleSpy.mockRestore();
      await manager2.close();
    }, 30000);
  });

  describe('Session Cleanup', () => {
    it('should remove session from disk when cleared', async () => {
      manager = new BrowserManager(testSessionDir, true, false);

      // Create session
      await manager.getSession('example.com');

      // Verify session exists on disk
      const sessionsBeforeClear = manager.listSessions();
      expect(sessionsBeforeClear).toContain('example.com');

      // Clear session
      await manager.clearSession('example.com');

      // Verify session removed from disk
      const sessionsAfterClear = manager.listSessions();
      expect(sessionsAfterClear).not.toContain('example.com');

      // Verify session directory was deleted
      const sessionPath = path.join(testSessionDir, 'example.com');
      expect(fs.existsSync(sessionPath)).toBe(false);
    }, 30000);
  });
});
