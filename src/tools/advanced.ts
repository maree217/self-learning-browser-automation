import { browserManager } from '../browser-manager.js';
import { traceLogger } from '../trace-logger.js';
import { ToolResult, UploadFileParams, HandleDialogParams } from '../types.js';

/**
 * Upload file(s)
 */
export async function uploadFile(params: UploadFileParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { selector, filePaths, timeout = 30000 } = params;

    const page = await browserManager.getActivePage(domain);
    const fileInput = await page.$(selector);

    if (!fileInput) {
      throw new Error(`File input not found: ${selector}`);
    }

    await fileInput.setInputFiles(filePaths, { timeout });

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_upload_file',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        selector,
        files: filePaths,
        uploaded: true
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_upload_file',
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
      error_type: 'upload_error',
      duration_ms: duration
    };
  }
}

/**
 * Handle browser dialogs (alert, confirm, prompt)
 */
export async function handleDialog(params: HandleDialogParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { action, text } = params;

    const page = await browserManager.getActivePage(domain);

    // Set up dialog handler
    page.once('dialog', async (dialog) => {
      if (action === 'accept') {
        await dialog.accept(text);
      } else {
        await dialog.dismiss();
      }
    });

    const duration = Date.now() - startTime;
    const url = page.url();

    await traceLogger.log(
      'browser_handle_dialog',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        action,
        handled: true
      },
      duration_ms: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    const page = await browserManager.getActivePage(domain);
    await traceLogger.log(
      'browser_handle_dialog',
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
      error_type: 'dialog_error',
      duration_ms: duration
    };
  }
}
