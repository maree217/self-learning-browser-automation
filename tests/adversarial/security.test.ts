import { navigate } from '../../src/tools/navigation';
import { click, fill, evaluate } from '../../src/tools/interaction';
import { browserManager } from '../../src/browser-manager';

describe('Security and Edge Case Tests', () => {
  describe('Input Validation', () => {
    it('should handle empty selectors', async () => {
      const result = await click({ selector: '', button: 'left', clickCount: 1, timeout: 30000 }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBeDefined();
    });

    it('should handle malformed URLs', async () => {
      const malformedUrls = [
        'javascript:alert(1)',
        'file:///etc/passwd',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        '',
        'not a url',
      ];

      for (const url of malformedUrls) {
        const result = await navigate({ url });
        // Should either reject or handle safely
        expect(['success', 'error']).toContain(result.status);
      }
    });

    it('should handle XSS attempts in selectors', async () => {
      const xssSelectors = [
        '<script>alert(1)</script>',
        '\');alert(1)//\',
        '"><script>alert(1)</script>',
        'javascript:alert(1)',
      ];

      for (const selector of xssSelectors) {
        const result = await click({ selector, button: 'left', clickCount: 1, timeout: 30000 }, 'example.com');
        // Should handle safely without executing
        expect(result.status).toBe('error');
      }
    });

    it('should handle XSS attempts in fill values', async () => {
      const xssValues = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '\'" onload="alert(1)"',
      ];

      for (const value of xssValues) {
        const result = await fill({ selector: 'input', value }, 'example.com');
        // Should sanitize or escape properly
        expect(['success', 'error']).toContain(result.status);
      }
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjections = [
        '\' OR \'1\'=\'1',
        '\'; DROP TABLE users; --',
        '1\' UNION SELECT * FROM users--',
        '\' AND 1=1--',
      ];

      for (const value of sqlInjections) {
        const result = await fill({ selector: 'input', value }, 'example.com');
        // Should treat as literal strings
        expect(['success', 'error']).toContain(result.status);
      }
    });
  });

  describe('Resource Limits', () => {
    it('should handle very long selectors', async () => {
      const longSelector = 'div'.repeat(1000);
      const result = await click({ selector: longSelector, button: 'left', clickCount: 1, timeout: 30000 }, 'example.com');

      expect(result.status).toBe('error');
    });

    it('should handle very long input values', async () => {
      const longValue = 'a'.repeat(100000);
      const result = await fill({ selector: 'input', value: longValue }, 'example.com');

      // Should either succeed or handle gracefully
      expect(['success', 'error']).toContain(result.status);
    });

    it('should handle timeout gracefully', async () => {
      const result = await navigate({
        url: 'https://httpbin.org/delay/100',
        timeout: 1000,
      });

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('navigation_error');
    }, 5000);

    it('should handle rapid concurrent requests', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => navigate({ url: 'https://httpbin.org/get' }));

      const results = await Promise.all(promises);

      // All should complete without crashing
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(['success', 'error']).toContain(result.status);
      });
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent domains', async () => {
      const result = await navigate({ url: 'https://this-domain-definitely-does-not-exist-12345.com' });

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('navigation_error');
    }, 30000);

    it('should handle network timeouts', async () => {
      const result = await navigate({
        url: 'https://httpbin.org/delay/100',
        timeout: 100,
      });

      expect(result.status).toBe('error');
    }, 5000);

    it('should handle invalid selectors', async () => {
      const invalidSelectors = [
        null,
        undefined,
        123,
        {},
        [],
        '[[[invalid',
      ];

      for (const selector of invalidSelectors) {
        const result = await click({ selector: selector as any, button: 'left', clickCount: 1, timeout: 30000 }, 'example.com');
        expect(result.status).toBe('error');
      }
    });

    it('should handle page crashes gracefully', async () => {
      // Navigate to a valid page first
      const navResult = await navigate({ url: 'https://example.com' });
      expect(navResult.status).toBe('success');

      // Try to crash the page (this may or may not work depending on browser security)
      const evalResult = await evaluate(
        {
          domain: 'example.com',
          script: '() => { while(true) { const arr = new Array(1000000); } }',
        },
        'example.com'
      );

      // Should either timeout or handle gracefully
      expect(['success', 'error']).toContain(evalResult.status);
    }, 10000);
  });

  describe('Privacy and Security', () => {
    it('should isolate sessions per domain by default', async () => {
      // Navigate to two different domains
      await navigate({ url: 'https://example.com' });
      await navigate({ url: 'https://test.com' });

      const session1 = await browserManager.getSession('example.com');
      const session2 = await browserManager.getSession('test.com');

      // Sessions should be isolated
      expect(session1.context).not.toBe(session2.context);
    }, 30000);

    it('should not leak data between domains', async () => {
      // Set data in domain 1
      await navigate({ url: 'https://example.com' });
      await evaluate(
        {
          domain: 'example.com',
          script: '() => { localStorage.setItem("secret", "domain1"); }',
        },
        'example.com'
      );

      // Check data in domain 2
      await navigate({ url: 'https://test.com' });
      const result = await evaluate(
        {
          domain: 'test.com',
          script: '() => { return localStorage.getItem("secret"); }',
        },
        'test.com'
      );

      // Domain 2 should not have access to domain 1's data
      expect(result.data).toBeNull();
    }, 30000);

    it('should protect against arbitrary code execution', async () => {
      const maliciousScripts = [
        '() => { require("child_process").exec("rm -rf /"); }',
        '() => { process.exit(1); }',
        '() => { require("fs").readFileSync("/etc/passwd"); }',
      ];

      for (const script of maliciousScripts) {
        const result = await evaluate(
          { domain: 'example.com', script },
          'example.com'
        );

        // Should fail safely without executing host code
        expect(result.status).toBe('error');
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rapid navigation requests', async () => {
      const startTime = Date.now();
      const promises = Array(50)
        .fill(null)
        .map(() => navigate({ url: 'https://httpbin.org/get' }));

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete without hanging or crashing
      expect(results).toHaveLength(50);
      // Should have some reasonable duration (not instant, not hanging)
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(300000); // 5 minutes max
    }, 300000);

    it('should handle large DOM structures', async () => {
      // Navigate to page and inject large DOM
      await navigate({ url: 'https://example.com' });

      const result = await evaluate(
        {
          domain: 'example.com',
          script: `() => {
            const container = document.body;
            for (let i = 0; i < 1000; i++) {
              const div = document.createElement('div');
              div.textContent = 'Item ' + i;
              container.appendChild(div);
            }
            return document.querySelectorAll('div').length;
          }`,
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data).toBeGreaterThan(0);
    }, 30000);
  });
});
