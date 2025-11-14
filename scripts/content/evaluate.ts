#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';
import { EvaluateResult } from '../core/types';

const program = new Command();

program
  .name('evaluate')
  .description('Execute JavaScript code on the page and return result')
  .requiredOption('-d, --domain <domain>', 'Domain (e.g., linkedin.com)')
  .requiredOption('-s, --script <code>', 'JavaScript code to execute')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    if (opts.verbose) {
      console.error(`Evaluating script on ${opts.domain}`);
    }

    // Get page for domain
    const page = await sessionManager.getPage(opts.domain);

    // Execute script
    const scriptResult = await page.evaluate((code) => {
      // Wrap in try-catch and execute
      try {
        return eval(code);
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }, opts.script);

    const url = page.url();

    if (opts.verbose) {
      console.error(`Script executed successfully`);
    }

    // Format output
    const result = success<EvaluateResult>(
      {
        domain: opts.domain,
        url,
        result: scriptResult,
      },
      Date.now() - startTime
    );

    writeOutputAndExit(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result = error(errorMsg, 'EvaluateError', Date.now() - startTime);
    writeOutputAndExit(result);
  }
}

main();
