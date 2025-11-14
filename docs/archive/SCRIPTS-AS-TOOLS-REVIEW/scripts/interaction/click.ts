#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';

const program = new Command();

program
  .name('click')
  .description('Click an element on the page')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .requiredOption('-s, --selector <selector>', 'CSS selector for element to click')
  .option('-b, --button <button>', 'Mouse button (left, right, middle)', 'left')
  .option('-c, --click-count <count>', 'Number of clicks', '1')
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Clicking element: ${opts.selector} on ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Click element
    await page.click(opts.selector, {
      button: opts.button as any,
      clickCount: parseInt(opts.clickCount),
      timeout: parseInt(opts.timeout),
    });

    const url = page.url();

    if (opts.verbose) {
      console.error(`Clicked successfully`);
    }

    // Format output
    const result = success(
      {
        domain: opts.domain,
        url,
        selector: opts.selector,
        clicked: true,
      },
      Date.now() - startTime,
      [
        'Use "sb wait-for --domain ' + opts.domain + '" if you need to wait for elements',
        'Use "sb snapshot --domain ' + opts.domain + '" to verify page state',
      ]
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'ClickError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
