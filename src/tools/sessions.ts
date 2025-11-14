import { browserManager } from '../browser-manager.js';
import { traceLogger } from '../trace-logger.js';
import { ToolResult } from '../types.js';

/**
 * Save session (manual save - sessions auto-save on navigation)
 */
export async function saveSession(domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Sessions are automatically saved with persistent context
    // This is just a confirmation
    const duration = Date.now() - startTime;

    await traceLogger.log(
      'browser_save_session',
      { domain },
      'success',
      duration,
      '',
      domain
    );

    return {
      status: 'success',
      data: {
        domain,
        message: 'Session is automatically persisted'
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_save_session',
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
      error_type: 'session_error',
      duration_ms: duration
    };
  }
}

/**
 * List all saved sessions
 */
export async function listSessions(): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const sessions = browserManager.listSessions();
    const duration = Date.now() - startTime;

    await traceLogger.log(
      'browser_list_sessions',
      {},
      'success',
      duration,
      '',
      'all'
    );

    return {
      status: 'success',
      data: { sessions, count: sessions.length },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_list_sessions',
      {},
      'error',
      duration,
      '',
      'all',
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'session_error',
      duration_ms: duration
    };
  }
}

/**
 * Clear session for a domain
 */
export async function clearSession(domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    await browserManager.clearSession(domain);
    const duration = Date.now() - startTime;

    await traceLogger.log(
      'browser_clear_session',
      { domain },
      'success',
      duration,
      '',
      domain
    );

    return {
      status: 'success',
      data: { domain, cleared: true },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_clear_session',
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
      error_type: 'session_error',
      duration_ms: duration
    };
  }
}

/**
 * Enable shared context mode for OAuth flows
 * When enabled, all domains share the same browser context and cookies
 */
export async function enableSharedContext(): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    browserManager.enableSharedContext();
    const duration = Date.now() - startTime;

    await traceLogger.log(
      'browser_enable_shared_context',
      {},
      'success',
      duration,
      '',
      'all'
    );

    return {
      status: 'success',
      data: {
        shared_context_enabled: true,
        message: 'Shared context mode enabled for OAuth flows. All domains will now share cookies.'
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_enable_shared_context',
      {},
      'error',
      duration,
      '',
      'all',
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'session_error',
      duration_ms: duration
    };
  }
}

/**
 * Disable shared context mode (back to per-domain isolation)
 */
export async function disableSharedContext(): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    browserManager.disableSharedContext();
    const duration = Date.now() - startTime;

    await traceLogger.log(
      'browser_disable_shared_context',
      {},
      'success',
      duration,
      '',
      'all'
    );

    return {
      status: 'success',
      data: {
        shared_context_enabled: false,
        message: 'Shared context mode disabled. Back to per-domain isolation.'
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_disable_shared_context',
      {},
      'error',
      duration,
      '',
      'all',
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'session_error',
      duration_ms: duration
    };
  }
}
