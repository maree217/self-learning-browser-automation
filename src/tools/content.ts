import { browserManager } from '../browser-manager.js';
import { traceLogger } from '../trace-logger.js';
import { ToolResult, ScreenshotParams, EvaluateParams } from '../types.js';

/**
 * Get accessibility snapshot (LLM-friendly page structure)
 */
export async function snapshot(domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);
    const snapshot = await page.accessibility.snapshot();

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_snapshot',
      { domain },
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { snapshot, url },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_snapshot',
      { domain },
      'error',
      duration,
      page.url(),
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'snapshot_error',
      duration_ms: duration
    };
  }
}

/**
 * Take screenshot
 */
export async function screenshot(params: ScreenshotParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, fullPage = false, type = 'png', quality, path: savePath } = params;

    const page = await browserManager.getActivePage(domain);

    let screenshotData;
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      screenshotData = await element.screenshot({ type, quality, path: savePath });
    } else {
      screenshotData = await page.screenshot({ fullPage, type, quality, path: savePath });
    }

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_screenshot',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        screenshot: screenshotData.toString('base64'),
        type,
        path: savePath
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_screenshot',
      params,
      'error',
      duration,
      page.url(),
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'screenshot_error',
      duration_ms: duration
    };
  }
}

/**
 * Execute JavaScript and return result
 */
export async function evaluate(params: EvaluateParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { script, args = [] } = params;

    const page = await browserManager.getActivePage(domain);
    const result = await page.evaluate(script, ...args);

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_evaluate',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { result },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_evaluate',
      params,
      'error',
      duration,
      page.url(),
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'evaluation_error',
      duration_ms: duration
    };
  }
}

/**
 * Get page content (text or HTML)
 */
export async function getContent(domain: string, format: 'text' | 'html' = 'text'): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);

    let content;
    if (format === 'html') {
      content = await page.content();
    } else {
      content = await page.textContent('body') || '';
    }

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_get_content',
      { domain, format },
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { content, format, url },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_get_content',
      { domain, format },
      'error',
      duration,
      page.url(),
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'content_error',
      duration_ms: duration
    };
  }
}
