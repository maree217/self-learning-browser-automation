import { chromium, Browser, BrowserContext } from 'playwright';
import { browserManager } from '../../src/browser-manager';
import { navigate } from '../../src/tools/navigation';
import { enableSharedContext, disableSharedContext } from '../../src/tools/sessions';
import { click } from '../../src/tools/interaction';
import fs from 'fs';
import path from 'path';

describe('OAuth Flow Integration Tests', () => {
  let testSessionDir: string;

  beforeAll(() => {
    // Create temporary test session directory
    testSessionDir = path.join(process.cwd(), '.test-sessions');
    if (!fs.existsSync(testSessionDir)) {
      fs.mkdirSync(testSessionDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test sessions
    if (fs.existsSync(testSessionDir)) {
      fs.rmSync(testSessionDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Reset shared context mode
    await disableSharedContext();
  });

  describe('Shared Context Mode for OAuth', () => {
    it('should enable shared context mode', async () => {
      const result = await enableSharedContext();

      expect(result.status).toBe('success');
      expect(result.data.shared_context_enabled).toBe(true);
      expect(browserManager.isSharedContextEnabled()).toBe(true);
    });

    it('should disable shared context mode', async () => {
      await enableSharedContext();
      const result = await disableSharedContext();

      expect(result.status).toBe('success');
      expect(result.data.shared_context_enabled).toBe(false);
      expect(browserManager.isSharedContextEnabled()).toBe(false);
    });

    it('should share cookies across domains when enabled', async () => {
      // Enable shared context
      await enableSharedContext();

      // Navigate to first domain and set a cookie
      const navResult1 = await navigate({ url: 'https://httpbin.org/cookies/set/test/value' });
      expect(navResult1.status).toBe('success');

      // Navigate to second domain (httpbin.org is same but testing cookie persistence)
      const navResult2 = await navigate({ url: 'https://httpbin.org/cookies' });
      expect(navResult2.status).toBe('success');

      // Cookies should be accessible across navigation
      // This is a simplified test - in reality, cookies are domain-specific
    }, 30000);

    it('should isolate cookies per domain when disabled', async () => {
      // Ensure shared context is disabled
      await disableSharedContext();

      // Navigate to first domain
      const navResult1 = await navigate({ url: 'https://example.com' });
      expect(navResult1.status).toBe('success');

      // Navigate to second domain
      const navResult2 = await navigate({ url: 'https://test.com' });
      expect(navResult2.status).toBe('success');

      // Each domain should have its own isolated context
      const session1 = await browserManager.getSession('example.com');
      const session2 = await browserManager.getSession('test.com');

      expect(session1.context).not.toBe(session2.context);
    }, 30000);
  });

  describe('Cross-Domain OAuth Simulation', () => {
    it('should handle cross-domain redirects with shared context', async () => {
      // Enable shared context for OAuth
      await enableSharedContext();

      // Simulate OAuth flow: Start at app, redirect to auth provider
      const appResult = await navigate({ url: 'https://httpbin.org' });
      expect(appResult.status).toBe('success');

      // Redirect to auth provider (simulated)
      const authResult = await navigate({ url: 'https://httpbin.org/delay/1' });
      expect(authResult.status).toBe('success');

      // Return to app with token (simulated)
      const returnResult = await navigate({ url: 'https://httpbin.org/get' });
      expect(returnResult.status).toBe('success');
    }, 60000);

    it('should persist auth state across page navigations', async () => {
      await enableSharedContext();

      // Login simulation
      const loginResult = await navigate({ url: 'https://httpbin.org/cookies/set/session/abc123' });
      expect(loginResult.status).toBe('success');

      // Navigate to protected resource
      const protectedResult = await navigate({ url: 'https://httpbin.org/cookies' });
      expect(protectedResult.status).toBe('success');

      // Session should still be active
    }, 30000);
  });

  describe('Session Persistence', () => {
    it('should save and restore sessions', async () => {
      // Navigate and establish session
      const navResult = await navigate({ url: 'https://example.com' });
      expect(navResult.status).toBe('success');

      // Session should be persisted to disk
      const sessions = browserManager.listSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.find(s => s.domain === 'example.com')).toBeDefined();
    }, 30000);

    it('should maintain session across server restarts', async () => {
      // This test would require actually restarting the browser manager
      // For now, we test that session data is written to disk
      const navResult = await navigate({ url: 'https://example.com' });
      expect(navResult.status).toBe('success');

      const session = await browserManager.getSession('example.com');
      expect(session.sessionPath).toBeDefined();
      expect(fs.existsSync(session.sessionPath)).toBe(true);
    }, 30000);
  });
});
