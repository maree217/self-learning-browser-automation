#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';
import { NavigateResult } from '../core/types';

const program = new Command();

program
  .name('go-back')
  .description('Navigate back in browser history')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Going back in history for ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Go back
    await page.goBack({ waitUntil: 'load' });

    // Get current URL and title
    const url = page.url();
    const title = await page.title();

    if (opts.verbose) {
      console.error(`Navigated back to: ${title}`);
    }

    // Format output
    const result = success<NavigateResult>(
      {
        url,
        domain: opts.domain,
        title,
      },
      Date.now() - startTime
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'NavigationError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
