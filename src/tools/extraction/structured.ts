/**
 * Structured Data Extraction Tool
 * Deep extraction of DOM elements: links, forms, tables, interactive elements
 * Eliminates screenshot dependency for data extraction
 */

import { browserManager } from '../../browser-manager.js';
import { traceLogger } from '../../trace-logger.js';
import { ToolResult } from '../../types.js';

export interface ExtractStructuredParams {
  types?: ('links' | 'forms' | 'tables' | 'buttons' | 'inputs' | 'all')[];
  depth?: 'shallow' | 'deep';
  filters?: {
    visible_only?: boolean;
    interactive_only?: boolean;
    exclude_selectors?: string[];
  };
}

export interface LinkData {
  uid: string;
  text: string;
  href: string;
  selector: string;
  attributes: Record<string, string>;
  visible: boolean;
  position: { x: number; y: number; width: number; height: number };
}

export interface FormFieldData {
  uid: string;
  name: string;
  type: string;
  value: string;
  required: boolean;
  selector: string;
}

export interface FormData {
  uid: string;
  action: string;
  method: string;
  selector: string;
  fields: FormFieldData[];
}

export interface TableData {
  uid: string;
  selector: string;
  headers: string[];
  rows: string[][];
}

export interface InteractiveElementData {
  uid: string;
  type: string;
  text: string;
  selector: string;
  role: string;
  disabled: boolean;
}

export interface StructuredData {
  links?: LinkData[];
  forms?: FormData[];
  tables?: TableData[];
  interactive?: InteractiveElementData[];
}

/**
 * Extract structured data from page
 */
export async function extractStructured(
  params: ExtractStructuredParams,
  domain: string
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);
    const { types = ['all'], depth = 'shallow', filters = {} } = params;

    const data: StructuredData = {};

    // Determine which types to extract
    const shouldExtract = (type: string) =>
      types.includes('all') || types.includes(type as any);

    // Extract links
    if (shouldExtract('links')) {
      // @ts-ignore - Browser context code
      data.links = await page.evaluate((filters) => {
        function generateSelector(element: any): string {
          if (element.id) return `#${element.id}`;
          if (element.className) {
            const classes = Array.from(element.classList).join('.');
            return `${element.tagName.toLowerCase()}.${classes}`;
          }
          return element.tagName.toLowerCase();
        }

        function isVisible(element: any): boolean {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' &&
                 style.visibility !== 'hidden' &&
                 style.opacity !== '0';
        }

        const links = Array.from(document.querySelectorAll('a')).map((a, idx) => {
          const rect = a.getBoundingClientRect();
          return {
            uid: `link_${idx}`,
            text: a.textContent?.trim() || '',
            href: a.href,
            selector: generateSelector(a),
            attributes: Object.fromEntries(
              Array.from(a.attributes).map(attr => [attr.name, attr.value])
            ),
            visible: isVisible(a),
            position: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          };
        });

        // Apply filters
        let filtered = links;
        if (filters.visible_only) {
          filtered = filtered.filter((link: any) => link.visible);
        }
        if (filters.exclude_selectors && filters.exclude_selectors.length > 0) {
          const excludeSelectors = filters.exclude_selectors;
          filtered = filtered.filter((link: any) =>
            !excludeSelectors.some((sel: any) => link.selector.includes(sel))
          );
        }

        return filtered;
      }, filters);
    }

    // Extract forms
    if (shouldExtract('forms')) {
      // @ts-ignore - Browser context code
      data.forms = await page.evaluate(() => {
        function generateSelector(element: any): string {
          if (element.id) return `#${element.id}`;
          if (element.className) {
            const classes = Array.from(element.classList).join('.');
            return `${element.tagName.toLowerCase()}.${classes}`;
          }
          return element.tagName.toLowerCase();
        }

        return Array.from(document.querySelectorAll('form')).map((form, idx) => ({
          uid: `form_${idx}`,
          action: form.action,
          method: form.method,
          selector: generateSelector(form),
          fields: Array.from(form.elements).map((field: any, fieldIdx) => ({
            uid: `field_${idx}_${fieldIdx}`,
            name: field.name || '',
            type: field.type || '',
            value: field.value || '',
            required: field.required || false,
            selector: generateSelector(field)
          }))
        }));
      });
    }

    // Extract tables
    if (shouldExtract('tables')) {
      // @ts-ignore - Browser context code
      data.tables = await page.evaluate(() => {
        function generateSelector(element: any): string {
          if (element.id) return `#${element.id}`;
          if (element.className) {
            const classes = Array.from(element.classList).join('.');
            return `${element.tagName.toLowerCase()}.${classes}`;
          }
          return element.tagName.toLowerCase();
        }

        return Array.from(document.querySelectorAll('table')).map((table, idx) => ({
          uid: `table_${idx}`,
          selector: generateSelector(table),
          headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || ''),
          rows: Array.from(table.querySelectorAll('tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
          ).filter(row => row.length > 0)
        }));
      });
    }

    // Extract interactive elements (buttons, inputs)
    if (shouldExtract('buttons') || shouldExtract('inputs')) {
      // @ts-ignore - Browser context code
      data.interactive = await page.evaluate(() => {
        function generateSelector(element: any): string {
          if (element.id) return `#${element.id}`;
          if (element.className) {
            const classes = Array.from(element.classList).join('.');
            return `${element.tagName.toLowerCase()}.${classes}`;
          }
          return element.tagName.toLowerCase();
        }

        const buttons = Array.from(document.querySelectorAll('button')).map((btn, idx) => ({
          uid: `button_${idx}`,
          type: 'button',
          text: btn.textContent?.trim() || '',
          selector: generateSelector(btn),
          role: btn.getAttribute('role') || 'button',
          disabled: btn.disabled,
          interactive: true
        }));

        const inputs = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'))
          .map((input: any, idx) => ({
            uid: `input_button_${idx}`,
            type: 'input',
            text: input.value || '',
            selector: generateSelector(input),
            role: 'button',
            disabled: input.disabled,
            interactive: true
          }));

        return [...buttons, ...inputs];
      });

      // Apply filters
      if (filters.interactive_only && data.interactive) {
        data.interactive = data.interactive.filter(el => (el as any).interactive !== false);
      }
    }

    const duration = Date.now() - startTime;
    const url = page.url();

    // CRITICAL: Log to trace logger for RL training
    await traceLogger.log(
      'browser_extract_structured',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data,
      duration_ms: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    // CRITICAL: Log errors for RL training
    try {
      const page = await browserManager.getActivePage(domain);
      await traceLogger.log(
        'browser_extract_structured',
        params,
        'error',
        duration,
        page.url(),
        domain,
        errorMsg
      );
    } catch (logError) {
      // If we can't get page for logging, still log with unknown URL
      await traceLogger.log(
        'browser_extract_structured',
        params,
        'error',
        duration,
        'unknown',
        domain,
        errorMsg
      );
    }

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'extraction_error',
      duration_ms: duration
    };
  }
}
