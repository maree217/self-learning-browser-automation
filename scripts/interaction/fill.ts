#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';

const program = new Command();

program
  .name('fill')
  .description('Fill a form field (faster than typing)')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .requiredOption('-s, --selector <selector>', 'CSS selector for input element')
  .requiredOption('-v, --value <value>', 'Value to fill')
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Filling ${opts.selector} with "${opts.value}" on ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Fill element
    await page.fill(opts.selector, opts.value, {
      timeout: parseInt(opts.timeout),
    });

    const url = page.url();

    if (opts.verbose) {
      console.error(`Filled successfully`);
    }

    // Format output
    const result = success(
      {
        domain: opts.domain,
        url,
        selector: opts.selector,
        value: opts.value,
        filled: true,
      },
      Date.now() - startTime
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'FillError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
