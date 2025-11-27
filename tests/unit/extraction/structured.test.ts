/**
 * Unit tests for browser_extract_structured
 * TDD: Write tests first, then implement
 */

import { extractStructured } from '../../../src/tools/extraction/structured';
import { browserManager } from '../../../src/browser-manager';
import { traceLogger } from '../../../src/trace-logger';

// Mock browser manager and trace logger
jest.mock('../../../src/browser-manager');
jest.mock('../../../src/trace-logger');

describe('browser_extract_structured', () => {
  let mockPage: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock page
    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com'),
      evaluate: jest.fn()
    };

    (browserManager.getActivePage as jest.Mock).mockResolvedValue(mockPage);
    (traceLogger.log as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Link Extraction', () => {
    it('should extract all links from page', async () => {
      const mockLinks = [
        {
          uid: 'link_0',
          text: 'Home',
          href: 'https://example.com/home',
          selector: 'a.nav-link',
          attributes: { class: 'nav-link' },
          visible: true,
          position: { x: 10, y: 20, width: 80, height: 30 }
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockLinks);

      const result = await extractStructured(
        { types: ['links'], depth: 'shallow' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.links).toBeDefined();
      expect(result.data.links).toHaveLength(1);
      expect(result.data.links[0].uid).toBe('link_0');
      expect(result.data.links[0].href).toBe('https://example.com/home');
    });

    it('should filter invisible links when visible_only is true', async () => {
      // The implementation filters in the browser context, so we mock the filtered result
      const mockLinks = [
        { uid: 'link_0', visible: true, text: 'Visible' }
      ];

      mockPage.evaluate.mockResolvedValue(mockLinks);

      const result = await extractStructured(
        {
          types: ['links'],
          filters: { visible_only: true }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.links).toHaveLength(1);
      expect(result.data.links.every((l: any) => l.visible)).toBe(true);
    });

    it('should include all links when visible_only is false', async () => {
      const mockLinks = [
        { uid: 'link_0', visible: true },
        { uid: 'link_1', visible: false }
      ];

      mockPage.evaluate.mockResolvedValue(mockLinks);

      const result = await extractStructured(
        {
          types: ['links'],
          filters: { visible_only: false }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.links).toHaveLength(2);
    });
  });

  describe('Form Extraction', () => {
    it('should extract all forms from page', async () => {
      const mockForms = [
        {
          uid: 'form_0',
          action: '/submit',
          method: 'POST',
          selector: 'form#login',
          fields: [
            {
              uid: 'field_0_0',
              name: 'email',
              type: 'email',
              value: '',
              required: true,
              selector: 'input[name="email"]'
            }
          ]
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockForms);

      const result = await extractStructured(
        { types: ['forms'] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.forms).toBeDefined();
      expect(result.data.forms).toHaveLength(1);
      expect(result.data.forms[0].fields).toHaveLength(1);
      expect(result.data.forms[0].fields[0].name).toBe('email');
    });

    it('should extract field metadata correctly', async () => {
      const mockForms = [
        {
          uid: 'form_0',
          fields: [
            {
              uid: 'field_0_0',
              name: 'username',
              type: 'text',
              value: 'testuser',
              required: true,
              selector: 'input[name="username"]'
            }
          ]
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockForms);

      const result = await extractStructured(
        { types: ['forms'] },
        'example.com'
      );

      const field = result.data.forms[0].fields[0];
      expect(field.name).toBe('username');
      expect(field.type).toBe('text');
      expect(field.required).toBe(true);
      expect(field.selector).toBeDefined();
    });
  });

  describe('Table Extraction', () => {
    it('should extract tables with headers and rows', async () => {
      const mockTables = [
        {
          uid: 'table_0',
          selector: 'table.data',
          headers: ['Name', 'Email', 'Role'],
          rows: [
            ['John Doe', 'john@example.com', 'Admin'],
            ['Jane Smith', 'jane@example.com', 'User']
          ]
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockTables);

      const result = await extractStructured(
        { types: ['tables'] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.tables).toBeDefined();
      expect(result.data.tables[0].headers).toEqual(['Name', 'Email', 'Role']);
      expect(result.data.tables[0].rows).toHaveLength(2);
    });
  });

  describe('Interactive Elements', () => {
    it('should extract buttons and interactive elements', async () => {
      const mockInteractive = [
        {
          uid: 'button_0',
          type: 'button',
          text: 'Submit',
          selector: 'button[type="submit"]',
          role: 'button',
          disabled: false
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockInteractive);

      const result = await extractStructured(
        { types: ['buttons'] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.interactive).toBeDefined();
      expect(result.data.interactive[0].type).toBe('button');
      expect(result.data.interactive[0].disabled).toBe(false);
    });
  });

  describe('All Types Extraction', () => {
    it('should extract all types when types includes "all"', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([{ uid: 'link_0' }])  // links
        .mockResolvedValueOnce([{ uid: 'form_0' }])  // forms
        .mockResolvedValueOnce([{ uid: 'table_0' }]) // tables
        .mockResolvedValueOnce([{ uid: 'button_0' }]); // interactive

      const result = await extractStructured(
        { types: ['all'] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.links).toBeDefined();
      expect(result.data.forms).toBeDefined();
      expect(result.data.tables).toBeDefined();
      expect(result.data.interactive).toBeDefined();
    });
  });

  describe('Depth Parameter', () => {
    it('should handle shallow depth extraction', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractStructured(
        { types: ['links'], depth: 'shallow' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle deep depth extraction', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractStructured(
        { types: ['links'], depth: 'deep' },
        'example.com'
      );

      expect(result.status).toBe('success');
    });
  });

  describe('TraceLogger Integration', () => {
    it('should log successful extraction to trace logger', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      await extractStructured(
        { types: ['links'] },
        'example.com'
      );

      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_extract_structured',
        expect.objectContaining({ types: ['links'] }),
        'success',
        expect.any(Number),
        'https://example.com',
        'example.com'
      );
    });

    it('should log errors to trace logger', async () => {
      const error = new Error('Extraction failed');
      mockPage.evaluate.mockRejectedValue(error);

      const result = await extractStructured(
        { types: ['links'] },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_extract_structured',
        expect.any(Object),
        'error',
        expect.any(Number),
        'https://example.com',
        'example.com',
        'Extraction failed'
      );
    });

    it('should measure and report duration', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractStructured(
        { types: ['links'] },
        'example.com'
      );

      expect(result.duration_ms).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle page evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Page not found'));

      const result = await extractStructured(
        { types: ['links'] },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toBe('Page not found');
      expect(result.error_type).toBe('extraction_error');
    });

    it('should handle browser manager errors', async () => {
      (browserManager.getActivePage as jest.Mock).mockRejectedValue(
        new Error('Browser not initialized')
      );

      const result = await extractStructured(
        { types: ['links'] },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Browser not initialized');
    });

    it('should handle empty extraction results gracefully', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractStructured(
        { types: ['links'] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.links).toEqual([]);
    });
  });

  describe('Default Parameters', () => {
    it('should use default values when parameters not provided', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractStructured(
        {},
        'example.com'
      );

      expect(result.status).toBe('success');
      // Should default to types: ['all'], depth: 'shallow'
    });
  });

  describe('Filter Parameters', () => {
    it('should apply exclude_selectors filter', async () => {
      const mockLinks = [
        { uid: 'link_0', selector: 'a.keep' },
        { uid: 'link_1', selector: 'a.exclude' }
      ];

      mockPage.evaluate.mockResolvedValue(mockLinks);

      const result = await extractStructured(
        {
          types: ['links'],
          filters: { exclude_selectors: ['a.exclude'] }
        },
        'example.com'
      );

      // Implementation should filter out excluded selectors
      expect(result.status).toBe('success');
    });

    it('should apply interactive_only filter', async () => {
      const mockElements = [
        { uid: 'el_0', interactive: true },
        { uid: 'el_1', interactive: false }
      ];

      mockPage.evaluate.mockResolvedValue(mockElements);

      const result = await extractStructured(
        {
          types: ['all'],
          filters: { interactive_only: true }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
    });
  });
});
