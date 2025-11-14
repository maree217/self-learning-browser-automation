import { searchAndExtractJobs } from './01-job-search-extract';
import { sendConnectionRequests } from './02-connection-requests';
import { analyzeProfiles } from './03-profile-analysis';
import fs from 'fs';
import path from 'path';

/**
 * Master E2E Test Runner
 * Executes all LinkedIn automation tests in sequence
 */
async function runAllE2ETests(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 LINKEDIN AUTOMATION E2E TEST SUITE');
  console.log('='.repeat(70) + '\n');

  const overallStartTime = Date.now();
  const results: Array<{test: string; status: 'passed' | 'failed'; duration: number; error?: string}> = [];

  // Test 1: Job Search & Extract
  console.log('\n📋 TEST SUITE 1: Job Search & Extract\n');
  try {
    const test1Start = Date.now();
    await searchAndExtractJobs();
    const test1Duration = Date.now() - test1Start;
    results.push({ test: 'Job Search & Extract', status: 'passed', duration: test1Duration });
  } catch (error) {
    const test1Duration = Date.now() - Date.now();
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ test: 'Job Search & Extract', status: 'failed', duration: test1Duration, error: errorMsg });
    console.error(`❌ Test Suite 1 FAILED: ${errorMsg}\n`);
  }

  // Delay between test suites
  console.log('\n⏸  Pausing 10 seconds before next test suite...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Test 2: Professional Networking
  console.log('\n📋 TEST SUITE 2: Professional Networking\n');
  try {
    const test2Start = Date.now();
    await sendConnectionRequests();
    const test2Duration = Date.now() - test2Start;
    results.push({ test: 'Professional Networking', status: 'passed', duration: test2Duration });
  } catch (error) {
    const test2Duration = Date.now() - Date.now();
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ test: 'Professional Networking', status: 'failed', duration: test2Duration, error: errorMsg });
    console.error(`❌ Test Suite 2 FAILED: ${errorMsg}\n`);
  }

  // Delay before final test suite
  console.log('\n⏸  Pausing 15 seconds before profile analysis...\n');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Test 3: Profile Analysis
  console.log('\n📋 TEST SUITE 3: Profile Analysis (This will take ~15 minutes)\n');
  try {
    const test3Start = Date.now();
    await analyzeProfiles();
    const test3Duration = Date.now() - test3Start;
    results.push({ test: 'Profile Analysis', status: 'passed', duration: test3Duration });
  } catch (error) {
    const test3Duration = Date.now() - Date.now();
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ test: 'Profile Analysis', status: 'failed', duration: test3Duration, error: errorMsg });
    console.error(`❌ Test Suite 3 FAILED: ${errorMsg}\n`);
  }

  // Generate final report
  const overallDuration = Date.now() - overallStartTime;
  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(70) + '\n');

  results.forEach((result, index) => {
    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    const durationStr = (result.duration / 1000).toFixed(2);
    console.log(`${statusIcon} Test ${index + 1}: ${result.test}`);
    console.log(`   Duration: ${durationStr}s`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passedCount} ✅`);
  console.log(`Failed: ${failedCount} ${failedCount > 0 ? '❌' : ''}`);
  console.log(`Overall Duration: ${(overallDuration / 1000 / 60).toFixed(2)} minutes`);
  console.log('='.repeat(70) + '\n');

  // Save execution report
  const reportFile = path.join(__dirname, 'output', 'test-execution-log.json');
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    overallDurationMs: overallDuration,
    totalTests: results.length,
    passed: passedCount,
    failed: failedCount,
    results
  }, null, 2));

  console.log(`📄 Execution log saved: ${reportFile}\n`);

  // Exit with error if any tests failed
  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run all tests
if (require.main === module) {
  runAllE2ETests().catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
  });
}
