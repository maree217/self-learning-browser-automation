import { browserManager } from '../browser-manager.js';
import { traceLogger } from '../trace-logger.js';
import {
  ToolResult,
  ClickParams,
  TypeParams,
  FillParams,
  SelectParams,
  PressParams,
  HoverParams,
  WaitForParams
} from '../types.js';

/**
 * Click an element
 */
export async function click(params: ClickParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, button = 'left', clickCount = 1, timeout = 30000 } = params;

    const page = await browserManager.getActivePage(domain);
    await page.click(selector, { button, clickCount, timeout });

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_click',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { selector, clicked: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_click',
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
      error_type: 'element_not_found',
      duration_ms: duration
    };
  }
}

/**
 * Type text into an element
 */
export async function type(params: TypeParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, text, delay = 0 } = params;

    const page = await browserManager.getActivePage(domain);
    await page.type(selector, text, { delay });

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_type',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { selector, text, typed: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_type',
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
      error_type: 'element_not_found',
      duration_ms: duration
    };
  }
}

/**
 * Fill a form field
 */
export async function fill(params: FillParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, value } = params;

    const page = await browserManager.getActivePage(domain);
    await page.fill(selector, value);

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_fill',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { selector, value, filled: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_fill',
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
      error_type: 'element_not_found',
      duration_ms: duration
    };
  }
}

/**
 * Select option from dropdown
 */
export async function select(params: SelectParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, value, timeout = 30000 } = params;

    const page = await browserManager.getActivePage(domain);
    await page.selectOption(selector, value, { timeout });

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_select',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { selector, value, selected: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_select',
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
      error_type: 'element_not_found',
      duration_ms: duration
    };
  }
}

/**
 * Press keyboard key(s)
 */
export async function press(params: PressParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { key, modifiers } = params;

    const page = await browserManager.getActivePage(domain);

    // Build key combination
    let keyCombo = key;
    if (modifiers && modifiers.length > 0) {
      keyCombo = modifiers.join('+') + '+' + key;
    }

    await page.keyboard.press(keyCombo);

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_press',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { key: keyCombo, pressed: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_press',
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
      error_type: 'keyboard_error',
      duration_ms: duration
    };
  }
}

/**
 * Hover over an element
 */
export async function hover(params: HoverParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, timeout = 30000 } = params;

    const page = await browserManager.getActivePage(domain);
    await page.hover(selector, { timeout });

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_hover',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { selector, hovered: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_hover',
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
      error_type: 'element_not_found',
      duration_ms: duration
    };
  }
}

/**
 * Wait for an element or condition
 */
export async function waitFor(params: WaitForParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, state = 'visible', timeout = 30000 } = params;

    const page = await browserManager.getActivePage(domain);

    if (selector) {
      await page.waitForSelector(selector, { state, timeout });
    } else {
      // Wait for load state if no selector
      await page.waitForLoadState('load', { timeout });
    }

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_wait_for',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: { selector, state, found: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_wait_for',
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
      error_type: 'timeout',
      duration_ms: duration
    };
  }
}
