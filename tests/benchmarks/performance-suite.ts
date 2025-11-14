/**
 * Comprehensive Performance Benchmark Suite
 * Measures P50, P95, P99 latency, memory usage, and concurrent execution
 */
import { BrowserManager } from '../../src/browser-manager';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

interface BenchmarkResult {
  name: string;
  iterations: number;
  durations: number[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  memoryUsed: number;
  success: boolean;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private testSessionDir: string;

  constructor() {
    this.testSessionDir = path.join(os.tmpdir(), 'browser-mcp-benchmark', String(Date.now()));
    if (!fs.existsSync(this.testSessionDir)) {
      fs.mkdirSync(this.testSessionDir, { recursive: true });
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  }

  /**
   * Run a benchmark test
   */
  async runBenchmark(
    name: string,
    testFn: () => Promise<void>,
    iterations: number = 10
  ): Promise<BenchmarkResult> {
    console.log(`\n🔬 Running benchmark: ${name} (${iterations} iterations)`);

    const durations: number[] = [];
    const memoryBefore = this.getMemoryUsage();
    let success = true;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        await testFn();
        const duration = Date.now() - start;
        durations.push(duration);
        process.stdout.write(`  ✓ Iteration ${i + 1}/${iterations}: ${duration}ms\r`);
      } catch (error) {
        console.error(`\n  ✗ Iteration ${i + 1} failed:`, error);
        success = false;
        break;
      }
    }

    const memoryAfter = this.getMemoryUsage();
    const memoryUsed = memoryAfter - memoryBefore;

    if (durations.length === 0) {
      console.log('\n  ❌ All iterations failed');
      return {
        name,
        iterations,
        durations: [],
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        mean: 0,
        memoryUsed,
        success: false
      };
    }

    // Calculate statistics
    const sorted = [...durations].sort((a, b) => a - b);
    const result: BenchmarkResult = {
      name,
      iterations: durations.length,
      durations,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      min: Math.min(...durations),
      max: Math.max(...durations),
      mean: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      memoryUsed,
      success
    };

    console.log(`\n  📊 Results:`);
    console.log(`     P50: ${result.p50}ms`);
    console.log(`     P95: ${result.p95}ms`);
    console.log(`     P99: ${result.p99}ms`);
    console.log(`     Mean: ${result.mean}ms`);
    console.log(`     Min/Max: ${result.min}ms / ${result.max}ms`);
    console.log(`     Memory: +${memoryUsed}MB`);

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark 1: Session Creation (Cold Start)
   */
  async benchmarkColdStart(): Promise<BenchmarkResult> {
    return this.runBenchmark(
      'Session Creation (Cold Start)',
      async () => {
        const manager = new BrowserManager(this.testSessionDir, true, false);
        const session = await manager.getSession('httpbin.org');
        await manager.close();
      },
      5  // Fewer iterations since it's slow
    );
  }

  /**
   * Benchmark 2: Session Loading (Warm Start)
   */
  async benchmarkWarmStart(): Promise<BenchmarkResult> {
    // Create a session first
    const setupManager = new BrowserManager(this.testSessionDir, true, false);
    await setupManager.getSession('example.com');
    await setupManager.close();

    return this.runBenchmark(
      'Session Loading (Warm Start)',
      async () => {
        const manager = new BrowserManager(this.testSessionDir, true, false);
        const session = await manager.getSession('example.com');
        await manager.close();
      },
      10
    );
  }

  /**
   * Benchmark 3: Session Discovery Performance
   */
  async benchmarkSessionDiscovery(): Promise<BenchmarkResult> {
    // Create 10 sessions
    const setupManager = new BrowserManager(this.testSessionDir, true, false);
    for (let i = 0; i < 10; i++) {
      await setupManager.getSession(`test${i}.com`);
    }
    await setupManager.close();

    return this.runBenchmark(
      'Session Discovery (10 sessions)',
      async () => {
        const manager = new BrowserManager(this.testSessionDir, true, false);
        manager.listSessions();
        await manager.close();
      },
      20
    );
  }

  /**
   * Benchmark 4: Concurrent Session Access
   */
  async benchmarkConcurrentAccess(): Promise<BenchmarkResult> {
    const manager = new BrowserManager(this.testSessionDir, true, false);

    return this.runBenchmark(
      'Concurrent Session Access (5 domains)',
      async () => {
        await Promise.all([
          manager.getSession('domain1.com'),
          manager.getSession('domain2.com'),
          manager.getSession('domain3.com'),
          manager.getSession('domain4.com'),
          manager.getSession('domain5.com')
        ]);
      },
      10
    );

    await manager.close();
  }

  /**
   * Benchmark 5: Cookie Persistence Performance
   */
  async benchmarkCookiePersistence(): Promise<BenchmarkResult> {
    return this.runBenchmark(
      'Cookie Load Performance',
      async () => {
        const manager = new BrowserManager(this.testSessionDir, true, false);
        const session = await manager.getSession('test-cookies.com');

        // Add multiple cookies
        await session.context.addCookies([
          { name: 'cookie1', value: 'value1', domain: 'test-cookies.com', path: '/' },
          { name: 'cookie2', value: 'value2', domain: 'test-cookies.com', path: '/' },
          { name: 'cookie3', value: 'value3', domain: 'test-cookies.com', path: '/' },
          { name: 'cookie4', value: 'value4', domain: 'test-cookies.com', path: '/' },
          { name: 'cookie5', value: 'value5', domain: 'test-cookies.com', path: '/' }
        ]);

        // Read them back
        const cookies = await session.context.cookies();

        await manager.close();
      },
      15
    );
  }

  /**
   * Generate report
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE BENCHMARK REPORT');
    console.log('='.repeat(80));

    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   Iterations: ${result.iterations}`);
      console.log(`   P50: ${result.p50}ms | P95: ${result.p95}ms | P99: ${result.p99}ms`);
      console.log(`   Mean: ${result.mean}ms | Min: ${result.min}ms | Max: ${result.max}ms`);
      console.log(`   Memory: +${result.memoryUsed}MB`);
      console.log(`   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    });

    // Overall statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 OVERALL STATISTICS');
    console.log('='.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const totalMemory = this.results.reduce((sum, r) => sum + r.memoryUsed, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${Math.round(passedTests / totalTests * 100)}%)`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Total Memory Used: +${totalMemory.toFixed(2)}MB`);

    // Performance targets
    console.log('\n' + '='.repeat(80));
    console.log('🎯 PERFORMANCE TARGETS');
    console.log('='.repeat(80));

    const warmStartResult = this.results.find(r => r.name.includes('Warm Start'));
    const discoveryResult = this.results.find(r => r.name.includes('Discovery'));

    if (warmStartResult) {
      const p50Target = 100;  // Target: < 100ms P50 for warm start
      const p95Target = 500;  // Target: < 500ms P95 for warm start

      console.log('\nWarm Start Performance:');
      console.log(`  P50: ${warmStartResult.p50}ms ${warmStartResult.p50 < p50Target ? '✅' : '⚠️'} (Target: <${p50Target}ms)`);
      console.log(`  P95: ${warmStartResult.p95}ms ${warmStartResult.p95 < p95Target ? '✅' : '⚠️'} (Target: <${p95Target}ms)`);
    }

    if (discoveryResult) {
      const discoveryTarget = 50;  // Target: < 50ms for discovery

      console.log('\nSession Discovery:');
      console.log(`  Mean: ${discoveryResult.mean}ms ${discoveryResult.mean < discoveryTarget ? '✅' : '⚠️'} (Target: <${discoveryTarget}ms)`);
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Save results to JSON
   */
  saveResults(filename: string = 'benchmark-results.json'): void {
    const outputDir = 'logs';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = {
      timestamp: new Date().toISOString(),
      platform: os.platform(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
      results: this.results
    };

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
  }

  /**
   * Cleanup test directory
   */
  cleanup(): void {
    if (fs.existsSync(this.testSessionDir)) {
      fs.rmSync(this.testSessionDir, { recursive: true, force: true });
    }
  }
}

/**
 * Run all benchmarks
 */
async function main() {
  console.log('🚀 Starting Performance Benchmark Suite');
  console.log(`Platform: ${os.platform()}`);
  console.log(`Node: ${process.version}`);
  console.log(`CPUs: ${os.cpus().length}`);
  console.log(`Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);

  const benchmark = new PerformanceBenchmark();

  try {
    // Run all benchmarks
    await benchmark.benchmarkColdStart();
    await benchmark.benchmarkWarmStart();
    await benchmark.benchmarkSessionDiscovery();
    await benchmark.benchmarkConcurrentAccess();
    await benchmark.benchmarkCookiePersistence();

    // Generate report
    benchmark.generateReport();

    // Save results
    benchmark.saveResults();
  } catch (error) {
    console.error('\n❌ Benchmark suite failed:', error);
  } finally {
    benchmark.cleanup();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceBenchmark, BenchmarkResult };
