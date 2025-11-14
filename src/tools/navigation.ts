import { browserManager } from '../browser-manager.js';
import { traceLogger } from '../trace-logger.js';
import { ToolResult, NavigateParams } from '../types.js';

/**
 * Navigate to a URL
 */
export async function navigate(params: NavigateParams): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { url, waitUntil = 'load', timeout = 60000 } = params;

    // Extract domain for session management
    const domain = browserManager.extractDomain(url);

    // Get page for this domain
    const page = await browserManager.getActivePage(domain);

    // Navigate
    await page.goto(url, {
      waitUntil,
      timeout
    });

    const duration = Date.now() - startTime;

    // Log trace
    await traceLogger.log(
      'browser_navigate',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        url: page.url(),
        title: await page.title(),
        domain
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_navigate',
      params,
      'error',
      duration,
      params.url,
      browserManager.extractDomain(params.url),
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'navigation_error',
      duration_ms: duration
    };
  }
}

/**
 * Navigate back in history
 */
export async function goBack(domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);
    await page.goBack();

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_go_back',
      { domain },
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        url,
        title: await page.title()
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_go_back',
      { domain },
      'error',
      duration,
      '',
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'navigation_error',
      duration_ms: duration
    };
  }
}

/**
 * Navigate forward in history
 */
export async function goForward(domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);
    await page.goForward();

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_go_forward',
      { domain },
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        url,
        title: await page.title()
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_go_forward',
      { domain },
      'error',
      duration,
      '',
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'navigation_error',
      duration_ms: duration
    };
  }
}
