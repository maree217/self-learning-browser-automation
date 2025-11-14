#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';

const program = new Command();

program
  .name('press')
  .description('Press keyboard key(s)')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .requiredOption('-k, --key <key>', 'Key to press (e.g., Enter, Tab, Escape)')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Pressing key ${opts.key} on ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Press key
    await page.keyboard.press(opts.key);

    const url = page.url();

    if (opts.verbose) {
      console.error(`Key pressed successfully`);
    }

    // Format output
    const result = success(
      {
        domain: opts.domain,
        url,
        key: opts.key,
        pressed: true,
      },
      Date.now() - startTime
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'PressError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
