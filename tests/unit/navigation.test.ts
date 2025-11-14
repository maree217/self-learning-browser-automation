import { navigate, goBack, goForward } from '../../src/tools/navigation';
import { browserManager } from '../../src/browser-manager';
import { traceLogger } from '../../src/trace-logger';

// Mock dependencies
jest.mock('../../src/browser-manager');
jest.mock('../../src/trace-logger');

describe('Navigation Tools', () => {
  let mockPage: any;
  let mockSession: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock page
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      goBack: jest.fn().mockResolvedValue(undefined),
      goForward: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://example.com'),
      title: jest.fn().mockResolvedValue('Example Page'),
    };

    // Setup mock session
    mockSession = {
      domain: 'example.com',
      context: {},
      pages: new Map(),
      sessionPath: '/mock/path',
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Mock browser manager methods
    (browserManager.extractDomain as jest.Mock) = jest.fn().mockReturnValue('example.com');
    (browserManager.getActivePage as jest.Mock) = jest.fn().mockResolvedValue(mockPage);
    (browserManager.getSession as jest.Mock) = jest.fn().mockResolvedValue(mockSession);

    // Mock trace logger
    (traceLogger.log as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  describe('navigate', () => {
    it('should navigate to URL successfully', async () => {
      const result = await navigate({
        url: 'https://example.com',
        waitUntil: 'load',
        timeout: 60000,
      });

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        url: 'https://example.com',
        title: 'Example Page',
        domain: 'example.com',
      });
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'load',
        timeout: 60000,
      });
      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_navigate',
        expect.any(Object),
        'success',
        expect.any(Number),
        'https://example.com',
        'example.com'
      );
    });

    it('should handle navigation timeout', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const result = await navigate({
        url: 'https://example.com',
        waitUntil: 'load',
        timeout: 1000,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Navigation timeout');
      expect(result.error_type).toBe('navigation_error');
    });

    it('should use default values for optional parameters', async () => {
      await navigate({ url: 'https://example.com' });

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'load',
        timeout: 60000,
      });
    });

    it('should handle invalid URLs', async () => {
      mockPage.goto.mockRejectedValue(new Error('Invalid URL'));

      const result = await navigate({ url: 'not-a-valid-url' });

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('navigation_error');
    });
  });

  describe('goBack', () => {
    it('should navigate back successfully', async () => {
      const result = await goBack('example.com');

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        url: 'https://example.com',
        title: 'Example Page',
      });
      expect(mockPage.goBack).toHaveBeenCalled();
    });

    it('should handle error when cannot go back', async () => {
      mockPage.goBack.mockRejectedValue(new Error('Cannot go back'));

      const result = await goBack('example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Cannot go back');
      expect(result.error_type).toBe('navigation_error');
    });
  });

  describe('goForward', () => {
    it('should navigate forward successfully', async () => {
      const result = await goForward('example.com');

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        url: 'https://example.com',
        title: 'Example Page',
      });
      expect(mockPage.goForward).toHaveBeenCalled();
    });

    it('should handle error when cannot go forward', async () => {
      mockPage.goForward.mockRejectedValue(new Error('Cannot go forward'));

      const result = await goForward('example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Cannot go forward');
      expect(result.error_type).toBe('navigation_error');
    });
  });
});
