#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';
import { NavigateResult } from '../core/types';

const program = new Command();

program
  .name('navigate')
  .description('Navigate to a URL with session persistence')
  .requiredOption('-u, --url <url>', 'URL to navigate to')
  .option('-d, --domain <domain>', 'Domain for session (auto-detected from URL)')
  .option('--wait-until <event>', 'Wait until event (load, domcontentloaded, networkidle)', 'load')
  .option('--timeout <ms>', 'Timeout in milliseconds', '60000')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    // Extract domain from URL if not provided
    const domain = opts.domain || sessionManager.extractDomain(opts.url);

    if (opts.verbose) {
      console.error(`Navigating to ${opts.url} (domain: ${domain})`);
    }

    // Get or create session
    const { page } = await sessionManager.getOrCreateSession(domain);

    // Navigate
    await page.goto(opts.url, {
      waitUntil: opts.waitUntil as any,
      timeout: parseInt(opts.timeout),
    });

    // Get final URL and title
    const finalUrl = page.url();
    const title = await page.title();

    if (opts.verbose) {
      console.error(`Navigation complete: ${title}`);
    }

    // Format output
    const result = success<NavigateResult>(
      {
        url: finalUrl,
        domain,
        title,
      },
      Date.now() - startTime,
      [
        'Use "sb snapshot --domain ' + domain + '" to capture page structure',
        'Use "sb screenshot --domain ' + domain + '" to take a screenshot',
      ]
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'NavigationError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
