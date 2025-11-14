#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';

const program = new Command();

program
  .name('wait-for')
  .description('Wait for an element or condition')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .option('-s, --selector <selector>', 'CSS selector to wait for')
  .option('--state <state>', 'Element state (attached, detached, visible, hidden)', 'visible')
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Waiting for ${opts.selector || 'page load'} on ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Wait for selector or just a timeout
    if (opts.selector) {
      await page.waitForSelector(opts.selector, {
        state: opts.state as any,
        timeout: parseInt(opts.timeout),
      });
    } else {
      // Just wait for page to be stable
      await page.waitForLoadState('networkidle', {
        timeout: parseInt(opts.timeout),
      });
    }

    const url = page.url();

    if (opts.verbose) {
      console.error(`Wait complete`);
    }

    // Format output
    const result = success(
      {
        domain: opts.domain,
        url,
        selector: opts.selector,
        waited: true,
      },
      Date.now() - startTime
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'WaitError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
