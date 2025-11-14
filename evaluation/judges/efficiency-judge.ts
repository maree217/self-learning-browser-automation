/**
 * Efficiency Judge
 * Evaluates: Was the execution optimal?
 */

import { JudgeScore, JudgePrompt } from '../types';

export async function evaluateEfficiency(prompt: JudgePrompt): Promise<JudgeScore> {
  const { test, context } = prompt;

  let score = 10;
  const suggestions: string[] = [];
  let reasoning = '';

  // Check duration efficiency
  const duration = test.duration_ms;

  // Define performance thresholds based on tool type
  const PERFORMANCE_THRESHOLDS: Record<string, { fast: number; acceptable: number; slow: number }> = {
    browser_navigate: { fast: 3000, acceptable: 5000, slow: 10000 },
    browser_click: { fast: 100, acceptable: 500, slow: 2000 },
    browser_fill: { fast: 100, acceptable: 300, slow: 1000 },
    browser_type: { fast: 200, acceptable: 500, slow: 1500 },
    browser_snapshot: { fast: 500, acceptable: 1500, slow: 3000 },
    browser_evaluate: { fast: 100, acceptable: 300, slow: 1000 },
    default: { fast: 1000, acceptable: 3000, slow: 5000 },
  };

  const thresholds = PERFORMANCE_THRESHOLDS[context.tool] || PERFORMANCE_THRESHOLDS.default;

  // Score based on duration
  if (duration <= thresholds.fast) {
    score = 10;
    reasoning += `Excellent performance (${duration}ms ≤ ${thresholds.fast}ms). `;
  } else if (duration <= thresholds.acceptable) {
    score = 8;
    reasoning += `Good performance (${duration}ms ≤ ${thresholds.acceptable}ms). `;
    suggestions.push('Consider minor optimizations to reach fast threshold');
  } else if (duration <= thresholds.slow) {
    score = 6;
    reasoning += `Acceptable performance (${duration}ms ≤ ${thresholds.slow}ms). `;
    suggestions.push('Significant performance improvements possible');
  } else {
    score = 4;
    reasoning += `Slow performance (${duration}ms > ${thresholds.slow}ms). `;
    suggestions.push('Critical: Performance optimization needed');
  }

  // Check for redundant steps (if details available)
  if (test.details?.steps && Array.isArray(test.details.steps)) {
    const stepCount = test.details.steps.length;
    if (stepCount > 5) {
      score -= 1;
      reasoning += `Multiple steps detected (${stepCount}). `;
      suggestions.push('Consider consolidating multiple operations');
    }
  }

  // Check for retry logic (if error and then success)
  if (test.status === 'passed' && test.error) {
    score -= 0.5;
    reasoning += 'Test passed after encountering error (retry logic). ';
  }

  // Penalize if test failed (efficiency is zero if incorrect)
  if (test.status === 'failed') {
    score = Math.min(score, 5);
    reasoning += 'Efficiency score capped due to test failure. ';
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(10, score));

  // Generate overall reasoning
  if (score >= 9) {
    reasoning += 'Optimal execution with minimal overhead.';
  } else if (score >= 7) {
    reasoning += 'Good efficiency with room for minor improvements.';
  } else if (score >= 5) {
    reasoning += 'Acceptable efficiency but optimization recommended.';
  } else {
    reasoning += 'Significant efficiency concerns require attention.';
  }

  return {
    dimension: 'efficiency',
    score,
    reasoning,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
