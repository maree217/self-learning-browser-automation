#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';
import { SnapshotResult } from '../core/types';

const program = new Command();

program
  .name('snapshot')
  .description('Get accessibility tree snapshot (LLM-friendly page structure)')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Taking snapshot for ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Get accessibility tree snapshot
    const snapshot = await page.accessibility.snapshot();
    const url = page.url();

    if (opts.verbose) {
      console.error(`Snapshot captured from: ${url}`);
    }

    // Format output
    const result = success<SnapshotResult>(
      {
        domain: opts.domain,
        url,
        snapshot: JSON.stringify(snapshot, null, 2),
        format: 'json',
      },
      Date.now() - startTime,
      [
        'Use "sb evaluate --domain ' + opts.domain + '" to run custom JavaScript',
        'Use "sb screenshot --domain ' + opts.domain + '" for visual capture',
      ]
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'SnapshotError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
