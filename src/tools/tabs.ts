import { browserManager } from '../browser-manager.js';
import { traceLogger } from '../trace-logger.js';
import { ToolResult, TabsParams } from '../types.js';

/**
 * Manage tabs (list, create, close, switch)
 */
export async function manageTabs(params: TabsParams, domain: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { action, url, pageId } = params;

    switch (action) {
      case 'list': {
        const pages = await browserManager.getAllPages(domain);
        const pageList = await Promise.all(
          pages.map(async (page, index) => ({
            id: index,
            url: page.url(),
            title: await page.title()
          }))
        );

        const duration = Date.now() - startTime;
        await traceLogger.log(
          'browser_tabs',
          params,
          'success',
          duration,
          pageList[0]?.url || '',
          domain
        );

        return {
          status: 'success',
          data: { pages: pageList },
          duration_ms: duration
        };
      }

      case 'create': {
        const newPage = await browserManager.createPage(domain);
        if (url) {
          await newPage.goto(url);
        }

        const duration = Date.now() - startTime;
        await traceLogger.log(
          'browser_tabs',
          params,
          'success',
          duration,
          url || 'about:blank',
          domain
        );

        return {
          status: 'success',
          data: {
            created: true,
            url: newPage.url(),
            title: await newPage.title()
          },
          duration_ms: duration
        };
      }

      case 'close': {
        const pages = await browserManager.getAllPages(domain);
        const pageIndex = parseInt(pageId || '0');

        if (pageIndex >= 0 && pageIndex < pages.length) {
          await browserManager.closePage(domain, pages[pageIndex]);
        } else {
          throw new Error(`Invalid page index: ${pageIndex}`);
        }

        const duration = Date.now() - startTime;
        await traceLogger.log(
          'browser_tabs',
          params,
          'success',
          duration,
          '',
          domain
        );

        return {
          status: 'success',
          data: { closed: true, pageId: pageIndex },
          duration_ms: duration
        };
      }

      case 'switch': {
        const pages = await browserManager.getAllPages(domain);
        const pageIndex = parseInt(pageId || '0');

        if (pageIndex >= 0 && pageIndex < pages.length) {
          await pages[pageIndex].bringToFront();
        } else {
          throw new Error(`Invalid page index: ${pageIndex}`);
        }

        const duration = Date.now() - startTime;
        await traceLogger.log(
          'browser_tabs',
          params,
          'success',
          duration,
          pages[pageIndex].url(),
          domain
        );

        return {
          status: 'success',
          data: {
            switched: true,
            url: pages[pageIndex].url(),
            title: await pages[pageIndex].title()
          },
          duration_ms: duration
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_tabs',
      params,
      'error',
      duration,
      '',
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'tab_error',
      duration_ms: duration
    };
  }
}
