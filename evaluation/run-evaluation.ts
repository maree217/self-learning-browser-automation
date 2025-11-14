/**
 * Main Evaluation Runner
 * Runs LLM-as-a-Judge evaluation on benchmark results
 */

import fs from 'fs';
import path from 'path';
import { BenchmarkResult, TestEvaluation, EvaluationReport, JudgePrompt } from './types';
import { evaluateCorrectness } from './judges/correctness-judge';
import { evaluateEfficiency } from './judges/efficiency-judge';
import { evaluateSafety } from './judges/safety-judge';

async function evaluateTest(result: BenchmarkResult): Promise<TestEvaluation> {
  // Create judge prompt
  const prompt: JudgePrompt = {
    test: result,
    context: {
      tool: extractToolFromId(result.id),
      expected: result.details?.expected || {},
      actual: result.details?.actual || result.details?.result || {},
    },
  };

  // Run all three judges
  const correctnessScore = await evaluateCorrectness(prompt);
  const efficiencyScore = await evaluateEfficiency(prompt);
  const safetyScore = await evaluateSafety(prompt);

  const scores = [correctnessScore, efficiencyScore, safetyScore];

  // Calculate overall score (average)
  const overallScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  // Determine verdict
  let verdict: TestEvaluation['verdict'];
  if (overallScore >= 9) {
    verdict = 'excellent';
  } else if (overallScore >= 7.5) {
    verdict = 'good';
  } else if (overallScore >= 6) {
    verdict = 'acceptable';
  } else if (overallScore >= 4) {
    verdict = 'needs_improvement';
  } else {
    verdict = 'failed';
  }

  return {
    testId: result.id,
    testDescription: result.description,
    scores,
    overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
    verdict,
  };
}

function extractToolFromId(id: string): string {
  // Extract tool name from test ID (e.g., "nav_001" -> "browser_navigate")
  if (id.startsWith('nav_')) return 'browser_navigate';
  if (id.startsWith('click_')) return 'browser_click';
  if (id.startsWith('fill_')) return 'browser_fill';
  if (id.startsWith('type_')) return 'browser_type';
  if (id.startsWith('snap_')) return 'browser_snapshot';
  if (id.startsWith('eval_')) return 'browser_evaluate';
  if (id.startsWith('sess_')) return 'browser_session';
  return 'default';
}

async function runEvaluation(): Promise<void> {
  console.log('🧪 LLM-as-a-Judge Evaluation Framework');
  console.log('═'.repeat(60));
  console.log('Evaluating MCP performance on three dimensions:');
  console.log('  1. Correctness: Did it do the right thing? (0-10)');
  console.log('  2. Efficiency: Was it optimal? (0-10)');
  console.log('  3. Safety: Any security concerns? (0-10)');
  console.log('');

  // Load benchmark results
  const resultsPath = path.join(__dirname, '../tests/benchmarks/results.json');

  if (!fs.existsSync(resultsPath)) {
    console.log('⚠️  No benchmark results found!');
    console.log('   Run benchmarks first: npm run benchmark');
    console.log('');
    process.exit(1);
  }

  console.log('📄 Loading benchmark results...');
  const results: BenchmarkResult[] = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  console.log(`   Loaded ${results.length} test results\\n`);

  // Evaluate each test
  console.log('🔍 Evaluating tests...\\n');
  const evaluations: TestEvaluation[] = [];

  for (const result of results) {
    process.stdout.write(`   [${result.id}] Evaluating... `);

    const evaluation = await evaluateTest(result);
    evaluations.push(evaluation);

    // Show verdict with emoji
    const verdictEmoji = {
      excellent: '🌟',
      good: '✅',
      acceptable: '👍',
      needs_improvement: '⚠️',
      failed: '❌',
    }[evaluation.verdict];

    console.log(`${verdictEmoji} ${evaluation.verdict.toUpperCase()} (${evaluation.overallScore}/10)`);
  }

  // Calculate summary statistics
  const avgCorrectness = evaluations.reduce((sum, e) =>
    sum + e.scores.find(s => s.dimension === 'correctness')!.score, 0
  ) / evaluations.length;

  const avgEfficiency = evaluations.reduce((sum, e) =>
    sum + e.scores.find(s => s.dimension === 'efficiency')!.score, 0
  ) / evaluations.length;

  const avgSafety = evaluations.reduce((sum, e) =>
    sum + e.scores.find(s => s.dimension === 'safety')!.score, 0
  ) / evaluations.length;

  const overallScore = (avgCorrectness + avgEfficiency + avgSafety) / 3;

  // Count by verdict
  const breakdown = {
    excellent: evaluations.filter(e => e.verdict === 'excellent').length,
    good: evaluations.filter(e => e.verdict === 'good').length,
    acceptable: evaluations.filter(e => e.verdict === 'acceptable').length,
    needs_improvement: evaluations.filter(e => e.verdict === 'needs_improvement').length,
    failed: evaluations.filter(e => e.verdict === 'failed').length,
  };

  // Create report
  const report: EvaluationReport = {
    timestamp: new Date().toISOString(),
    totalTests: evaluations.length,
    evaluations,
    summary: {
      avgCorrectness: Math.round(avgCorrectness * 10) / 10,
      avgEfficiency: Math.round(avgEfficiency * 10) / 10,
      avgSafety: Math.round(avgSafety * 10) / 10,
      overallScore: Math.round(overallScore * 10) / 10,
    },
    breakdown,
  };

  // Display summary
  console.log('\\n' + '═'.repeat(60));
  console.log('📊 EVALUATION SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`Total Tests Evaluated: ${report.totalTests}`);
  console.log('');
  console.log('📈 Average Scores:');
  console.log(`   Correctness:  ${report.summary.avgCorrectness.toFixed(1)}/10`);
  console.log(`   Efficiency:   ${report.summary.avgEfficiency.toFixed(1)}/10`);
  console.log(`   Safety:       ${report.summary.avgSafety.toFixed(1)}/10`);
  console.log(`   Overall:      ${report.summary.overallScore.toFixed(1)}/10`);
  console.log('');
  console.log('🎯 Verdict Breakdown:');
  console.log(`   🌟 Excellent:          ${breakdown.excellent} (${Math.round(breakdown.excellent / report.totalTests * 100)}%)`);
  console.log(`   ✅ Good:               ${breakdown.good} (${Math.round(breakdown.good / report.totalTests * 100)}%)`);
  console.log(`   👍 Acceptable:         ${breakdown.acceptable} (${Math.round(breakdown.acceptable / report.totalTests * 100)}%)`);
  console.log(`   ⚠️  Needs Improvement: ${breakdown.needs_improvement} (${Math.round(breakdown.needs_improvement / report.totalTests * 100)}%)`);
  console.log(`   ❌ Failed:             ${breakdown.failed} (${Math.round(breakdown.failed / report.totalTests * 100)}%)`);
  console.log('');

  // Overall verdict
  if (report.summary.overallScore >= 8.5) {
    console.log('🎉 EXCELLENT PERFORMANCE! MCP is production-ready.');
  } else if (report.summary.overallScore >= 7) {
    console.log('✅ GOOD PERFORMANCE! Minor improvements recommended.');
  } else if (report.summary.overallScore >= 5.5) {
    console.log('👍 ACCEPTABLE PERFORMANCE. Optimization suggested.');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT. Significant issues require attention.');
  }

  // Save detailed report
  const reportPath = path.join(__dirname, 'evaluation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`📄 Detailed report saved: ${reportPath}`);

  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(__dirname, 'evaluation-report.md');
  fs.writeFileSync(markdownPath, markdownReport);
  console.log(`📄 Markdown report saved: ${markdownPath}`);
  console.log('');

  // Exit with appropriate code
  if (report.summary.overallScore < 6) {
    process.exit(1);
  }
}

function generateMarkdownReport(report: EvaluationReport): string {
  return `# LLM-as-a-Judge Evaluation Report

**Generated:** ${report.timestamp}
**Total Tests:** ${report.totalTests}

## Summary

| Dimension | Score | Rating |
|-----------|-------|--------|
| **Correctness** | ${report.summary.avgCorrectness.toFixed(1)}/10 | ${getRating(report.summary.avgCorrectness)} |
| **Efficiency** | ${report.summary.avgEfficiency.toFixed(1)}/10 | ${getRating(report.summary.avgEfficiency)} |
| **Safety** | ${report.summary.avgSafety.toFixed(1)}/10 | ${getRating(report.summary.avgSafety)} |
| **Overall** | **${report.summary.overallScore.toFixed(1)}/10** | **${getRating(report.summary.overallScore)}** |

## Verdict Breakdown

- 🌟 **Excellent:** ${report.breakdown.excellent} tests (${Math.round(report.breakdown.excellent / report.totalTests * 100)}%)
- ✅ **Good:** ${report.breakdown.good} tests (${Math.round(report.breakdown.good / report.totalTests * 100)}%)
- 👍 **Acceptable:** ${report.breakdown.acceptable} tests (${Math.round(report.breakdown.acceptable / report.totalTests * 100)}%)
- ⚠️ **Needs Improvement:** ${report.breakdown.needs_improvement} tests (${Math.round(report.breakdown.needs_improvement / report.totalTests * 100)}%)
- ❌ **Failed:** ${report.breakdown.failed} tests (${Math.round(report.breakdown.failed / report.totalTests * 100)}%)

## Detailed Results

${report.evaluations.map((evaluation, idx) => `
### ${idx + 1}. ${evaluation.testDescription}

**Test ID:** \`${evaluation.testId}\`
**Verdict:** ${getVerdictEmoji(evaluation.verdict)} ${evaluation.verdict.toUpperCase()}
**Overall Score:** ${evaluation.overallScore}/10

#### Scores

${evaluation.scores.map(score => `
**${score.dimension.charAt(0).toUpperCase() + score.dimension.slice(1)}:** ${score.score}/10
${score.reasoning}
${score.suggestions ? `\n**Suggestions:**\n${score.suggestions.map(s => `- ${s}`).join('\n')}\n` : ''}
`).join('\n')}
`).join('\n---\n')}

## Conclusion

${getConclusion(report.summary.overallScore)}

---

*Generated by LLM-as-a-Judge Evaluation Framework*
*Location: \`/Users/rammaree/projects/social-browser-mcp/evaluation/\`*
`;
}

function getRating(score: number): string {
  if (score >= 9) return '🌟 Excellent';
  if (score >= 7.5) return '✅ Good';
  if (score >= 6) return '👍 Acceptable';
  if (score >= 4) return '⚠️ Needs Improvement';
  return '❌ Failed';
}

function getVerdictEmoji(verdict: string): string {
  const map: Record<string, string> = {
    excellent: '🌟',
    good: '✅',
    acceptable: '👍',
    needs_improvement: '⚠️',
    failed: '❌',
  };
  return map[verdict] || '❓';
}

function getConclusion(overallScore: number): string {
  if (overallScore >= 8.5) {
    return '🎉 **EXCELLENT PERFORMANCE!** The MCP server is production-ready with exceptional quality across all dimensions.';
  } else if (overallScore >= 7) {
    return '✅ **GOOD PERFORMANCE!** The MCP server is functional with minor improvements recommended for optimal performance.';
  } else if (overallScore >= 5.5) {
    return '👍 **ACCEPTABLE PERFORMANCE.** The MCP server works but would benefit from optimization in multiple areas.';
  } else {
    return '⚠️ **NEEDS IMPROVEMENT.** Significant issues were detected that require attention before production deployment.';
  }
}

// Run evaluation
if (require.main === module) {
  runEvaluation().catch(error => {
    console.error('\\n❌ Evaluation failed:', error);
    process.exit(1);
  });
}

export { runEvaluation, evaluateTest };
