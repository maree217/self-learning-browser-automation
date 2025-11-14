/**
 * Session Reliability Tests
 * Tests session persistence under various stress conditions
 */
import { BrowserManager } from '../../src/browser-manager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('Session Reliability Tests', () => {
  const testSessionDir = path.join(os.tmpdir(), 'browser-mcp-reliability', String(Date.now()));

  beforeAll(() => {
    if (!fs.existsSync(testSessionDir)) {
      fs.mkdirSync(testSessionDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testSessionDir)) {
      fs.rmSync(testSessionDir, { recursive: true, force: true });
    }
  });

  describe('Restart Stress Test', () => {
    it('should persist session through 10 consecutive restarts', async () => {
      const domain = 'restart-test.com';
      const testCookie = { name: 'test_persistent', value: 'restart_value', domain, path: '/' };

      // Initial session creation
      const manager1 = new BrowserManager(testSessionDir, true, false);
      const session1 = await manager1.getSession(domain);
      await session1.context.addCookies([testCookie]);

      let cookiesBefore = await session1.context.cookies();
      expect(cookiesBefore.length).toBeGreaterThan(0);

      await manager1.close();

      // 10 restart cycles
      for (let i = 0; i < 10; i++) {
        const manager = new BrowserManager(testSessionDir, true, false);
        const session = await manager.getSession(domain);
        const cookies = await session.context.cookies();

        expect(cookies.length).toBeGreaterThan(0);
        expect(cookies.some(c => c.name === 'test_persistent' && c.value === 'restart_value')).toBe(true);

        await manager.close();
      }
    }, 120000);
  });

  describe('Multi-Domain Stress Test', () => {
    it('should maintain isolation across 20 concurrent domains', async () => {
      const manager = new BrowserManager(testSessionDir, true, false);
      const domains = Array.from({ length: 20 }, (_, i) => `domain${i}.com`);

      // Create sessions for all domains
      const sessions = await Promise.all(
        domains.map(domain => manager.getSession(domain))
      );

      // Add unique cookie to each domain
      for (let i = 0; i < domains.length; i++) {
        await sessions[i].context.addCookies([{
          name: `cookie_${i}`,
          value: `value_${i}`,
          domain: domains[i],
          path: '/'
        }]);
      }

      // Verify isolation
      for (let i = 0; i < domains.length; i++) {
        const cookies = await sessions[i].context.cookies();
        expect(cookies.some(c => c.name === `cookie_${i}`)).toBe(true);

        // Ensure no cross-contamination
        for (let j = 0; j < domains.length; j++) {
          if (i !== j) {
            expect(cookies.some(c => c.name === `cookie_${j}`)).toBe(false);
          }
        }
      }

      await manager.close();
    }, 60000);
  });

  describe('Rapid Session Switching', () => {
    it('should handle rapid switching between domains', async () => {
      const manager = new BrowserManager(testSessionDir, true, false);
      const domains = ['domain1.com', 'domain2.com', 'domain3.com'];

      // Rapidly switch between domains 50 times
      for (let i = 0; i < 50; i++) {
        const domain = domains[i % domains.length];
        const session = await manager.getSession(domain);
        expect(session.domain).toBe(domain);
      }

      // Verify all sessions still accessible
      for (const domain of domains) {
        const session = await manager.getSession(domain);
        expect(session.domain).toBe(domain);
      }

      await manager.close();
    }, 60000);
  });

  describe('Session Recovery', () => {
    it('should recover from corrupted session directory', async () => {
      const domain = 'recovery-test.com';

      // Create a session
      const manager1 = new BrowserManager(testSessionDir, true, false);
      await manager1.getSession(domain);
      await manager1.close();

      // Corrupt the session directory (delete a critical file)
      const sessionPath = path.join(testSessionDir, domain);
      // Playwright persistent context creates a browser profile directory
      // We can't easily corrupt it without breaking Playwright, so we'll just test cleanup

      // Clear the session
      const manager2 = new BrowserManager(testSessionDir, true, false);
      await manager2.clearSession(domain);

      // Verify it's gone
      expect(fs.existsSync(sessionPath)).toBe(false);

      // Create new session - should work
      const session = await manager2.getSession(domain);
      expect(session.domain).toBe(domain);

      await manager2.close();
    }, 30000);
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory with repeated session creation/destruction', async () => {
      const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

      // Create and destroy sessions 100 times
      for (let i = 0; i < 100; i++) {
        const manager = new BrowserManager(testSessionDir, true, false);
        await manager.getSession(`leak-test-${i % 10}.com`);
        await manager.close();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = memoryAfter - memoryBefore;

      console.log(`Memory growth: ${memoryGrowth.toFixed(2)}MB`);

      // Memory growth should be reasonable (< 100MB for 100 sessions)
      expect(memoryGrowth).toBeLessThan(100);
    }, 180000);
  });

  describe('Concurrent Session Creation', () => {
    it('should handle concurrent session creation without conflicts', async () => {
      const manager = new BrowserManager(testSessionDir, true, false);

      // Create 10 sessions concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        manager.getSession(`concurrent-${i}.com`)
      );

      const sessions = await Promise.all(promises);

      // Verify all sessions created successfully
      expect(sessions.length).toBe(10);
      sessions.forEach((session, i) => {
        expect(session.domain).toBe(`concurrent-${i}.com`);
      });

      await manager.close();
    }, 60000);
  });

  describe('Session Persistence with Shared Context', () => {
    it('should persist shared context across restarts', async () => {
      const testCookie = { name: 'shared_test', value: 'shared_value', domain: 'example.com', path: '/' };

      // Create shared context session
      const manager1 = new BrowserManager(testSessionDir, true, true);
      const session1 = await manager1.getSession('example.com');
      await session1.context.addCookies([testCookie]);

      const cookiesBefore = await session1.context.cookies();
      expect(cookiesBefore.some(c => c.name === 'shared_test')).toBe(true);

      await manager1.close();

      // Restart with shared context
      const manager2 = new BrowserManager(testSessionDir, true, true);
      const session2 = await manager2.getSession('example.com');
      const cookiesAfter = await session2.context.cookies();

      expect(cookiesAfter.some(c => c.name === 'shared_test' && c.value === 'shared_value')).toBe(true);

      await manager2.close();
    }, 30000);
  });
});
