import {
  saveSession,
  listSessions,
  clearSession,
  enableSharedContext,
  disableSharedContext,
} from '../../src/tools/sessions';
import { browserManager } from '../../src/browser-manager';
import { traceLogger } from '../../src/trace-logger';

jest.mock('../../src/browser-manager');
jest.mock('../../src/trace-logger');

describe('Session Management Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (traceLogger.log as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  describe('saveSession', () => {
    it('should confirm session persistence', async () => {
      const result = await saveSession('example.com');

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        domain: 'example.com',
        message: 'Session is automatically persisted',
      });
      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_save_session',
        { domain: 'example.com' },
        'success',
        expect.any(Number),
        '',
        'example.com'
      );
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      const mockSessions = [
        { domain: 'example.com', lastActivity: new Date() },
        { domain: 'test.com', lastActivity: new Date() },
      ];
      (browserManager.listSessions as jest.Mock) = jest.fn().mockReturnValue(mockSessions);

      const result = await listSessions();

      expect(result.status).toBe('success');
      expect(result.data.sessions).toEqual(mockSessions);
      expect(result.data.count).toBe(2);
    });

    it('should return empty list when no sessions exist', async () => {
      (browserManager.listSessions as jest.Mock) = jest.fn().mockReturnValue([]);

      const result = await listSessions();

      expect(result.status).toBe('success');
      expect(result.data.count).toBe(0);
    });

    it('should handle errors', async () => {
      (browserManager.listSessions as jest.Mock) = jest.fn().mockImplementation(() => {
        throw new Error('Failed to list sessions');
      });

      const result = await listSessions();

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('session_error');
    });
  });

  describe('clearSession', () => {
    it('should clear session successfully', async () => {
      (browserManager.clearSession as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      const result = await clearSession('example.com');

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        domain: 'example.com',
        cleared: true,
      });
      expect(browserManager.clearSession).toHaveBeenCalledWith('example.com');
    });

    it('should handle clear errors', async () => {
      (browserManager.clearSession as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Session not found')
      );

      const result = await clearSession('nonexistent.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('session_error');
    });
  });

  describe('enableSharedContext', () => {
    it('should enable shared context mode', async () => {
      (browserManager.enableSharedContext as jest.Mock) = jest.fn();

      const result = await enableSharedContext();

      expect(result.status).toBe('success');
      expect(result.data.shared_context_enabled).toBe(true);
      expect(result.data.message).toContain('Shared context mode enabled');
      expect(browserManager.enableSharedContext).toHaveBeenCalled();
    });

    it('should handle enable errors', async () => {
      (browserManager.enableSharedContext as jest.Mock) = jest.fn().mockImplementation(() => {
        throw new Error('Failed to enable shared context');
      });

      const result = await enableSharedContext();

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('session_error');
    });
  });

  describe('disableSharedContext', () => {
    it('should disable shared context mode', async () => {
      (browserManager.disableSharedContext as jest.Mock) = jest.fn();

      const result = await disableSharedContext();

      expect(result.status).toBe('success');
      expect(result.data.shared_context_enabled).toBe(false);
      expect(result.data.message).toContain('Back to per-domain isolation');
      expect(browserManager.disableSharedContext).toHaveBeenCalled();
    });

    it('should handle disable errors', async () => {
      (browserManager.disableSharedContext as jest.Mock) = jest.fn().mockImplementation(() => {
        throw new Error('Failed to disable shared context');
      });

      const result = await disableSharedContext();

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('session_error');
    });
  });
});
