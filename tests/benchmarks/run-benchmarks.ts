import fs from 'fs';
import path from 'path';
import * as navigation from '../../dist/tools/navigation.js';
import * as interaction from '../../dist/tools/interaction.js';
import * as content from '../../dist/tools/content.js';
import * as sessions from '../../dist/tools/sessions.js';

interface BenchmarkTest {
  id: string;
  category: string;
  tool: string;
  description: string;
  setup?: Array<{ tool: string; params: any }>;
  input: any;
  steps?: Array<{ tool: string; params: any }>;
  expected: {
    status?: string;
    error_type?: string;
    duration_ms_max?: number;
    [key: string]: any;
  };
}

interface BenchmarkResult {
  id: string;
  description: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
  details?: any;
}

const toolMap: Record<string, Function> = {
  browser_navigate: navigation.navigate,
  browser_go_back: navigation.goBack,
  browser_go_forward: navigation.goForward,
  browser_click: interaction.click,
  browser_fill: interaction.fill,
  browser_type: interaction.type,
  browser_press: interaction.press,
  browser_hover: interaction.hover,
  browser_wait_for: interaction.waitFor,
  browser_snapshot: content.snapshot,
  browser_get_content: content.getContent,
  browser_evaluate: content.evaluate,
  browser_list_sessions: sessions.listSessions,
  browser_save_session: sessions.saveSession,
  browser_clear_session: sessions.clearSession,
  browser_enable_shared_context: sessions.enableSharedContext,
  browser_disable_shared_context: sessions.disableSharedContext,
};

async function executeTool(tool: string, params: any): Promise<any> {
  const toolFn = toolMap[tool];
  if (!toolFn) {
    throw new Error(`Unknown tool: ${tool}`);
  }

  // Handle different parameter patterns
  if (tool === 'browser_click' || tool === 'browser_fill' ||
      tool === 'browser_type' || tool === 'browser_press' ||
      tool === 'browser_hover' || tool === 'browser_wait_for') {
    return await toolFn(params, params.domain);
  } else if (tool === 'browser_get_content') {
    return await toolFn(params.domain, params.format);
  } else if (tool === 'browser_evaluate') {
    return await toolFn(params, params.domain);
  } else if (tool === 'browser_snapshot') {
    return await toolFn(params.domain);
  } else if (tool === 'browser_go_back' || tool === 'browser_go_forward' ||
             tool === 'browser_save_session' || tool === 'browser_clear_session') {
    return await toolFn(params.domain);
  } else {
    return await toolFn(params);
  }
}

async function runSetup(setup: Array<{ tool: string; params: any }>): Promise<void> {
  for (const step of setup) {
    await executeTool(step.tool, step.params);
  }
}

async function runBenchmarkTest(test: BenchmarkTest): Promise<BenchmarkResult> {
  const startTime = Date.now();

  try {
    // Run setup steps if present
    if (test.setup) {
      await runSetup(test.setup);
    }

    let result: any;

    // Handle multi-step tests
    if (test.tool === 'multi-step' && test.steps) {
      const stepResults = [];
      for (const step of test.steps) {
        const stepResult = await executeTool(step.tool, step.params);
        stepResults.push(stepResult);
      }
      result = {
        status: stepResults.every(r => r.status === 'success') ? 'success' : 'error',
        steps: stepResults,
      };
    } else {
      // Execute the test
      result = await executeTool(test.tool, test.input);
    }

    const duration = Date.now() - startTime;

    // Validate expectations
    let passed = true;
    const details: any = { result };

    if (test.expected.status && result.status !== test.expected.status) {
      passed = false;
      details.expectedStatus = test.expected.status;
      details.actualStatus = result.status;
    }

    if (test.expected.error_type && result.error_type !== test.expected.error_type) {
      passed = false;
      details.expectedErrorType = test.expected.error_type;
      details.actualErrorType = result.error_type;
    }

    if (test.expected.duration_ms_max && duration > test.expected.duration_ms_max) {
      passed = false;
      details.exceedsDurationLimit = true;
      details.maxDuration = test.expected.duration_ms_max;
      details.actualDuration = duration;
    }

    return {
      id: test.id,
      description: test.description,
      status: passed ? 'passed' : 'failed',
      duration_ms: duration,
      details: passed ? undefined : details,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      id: test.id,
      description: test.description,
      status: 'failed',
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runAllBenchmarks(): Promise<void> {
  console.log('Loading benchmark dataset...');
  const datasetPath = path.join(__dirname, 'dataset.json');
  const tests: BenchmarkTest[] = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  console.log(`Running ${tests.length} benchmark tests...\n`);

  const results: BenchmarkResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`[${test.id}] ${test.description}... `);

    const result = await runBenchmarkTest(test);
    results.push(result);

    if (result.status === 'passed') {
      console.log(`✓ PASSED (${result.duration_ms}ms)`);
      passed++;
    } else {
      console.log(`✗ FAILED (${result.duration_ms}ms)`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BENCHMARK RESULTS:`);
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed} (${((passed / tests.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / tests.length) * 100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  // Save detailed results
  const resultsPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`Detailed results saved to: ${resultsPath}`);

  // Exit with error if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run benchmarks
if (require.main === module) {
  runAllBenchmarks().catch(error => {
    console.error('Benchmark suite failed:', error);
    process.exit(1);
  });
}
