/**
 * Correctness Judge
 * Evaluates: Did the tool do the right thing?
 */

import { JudgeScore, JudgePrompt } from '../types';

export async function evaluateCorrectness(prompt: JudgePrompt): Promise<JudgeScore> {
  const { test, context } = prompt;

  // Automated scoring logic
  let score = 10;
  const suggestions: string[] = [];
  let reasoning = '';

  // Check if test passed
  if (test.status === 'failed') {
    score -= 5;
    reasoning += 'Test failed. ';
    suggestions.push('Fix the failing test case');
  }

  // Check if there was an error
  if (test.error) {
    score -= 3;
    reasoning += `Error encountered: ${test.error}. `;
    suggestions.push('Handle error cases more gracefully');
  }

  // Check expected vs actual (if available)
  if (context.expected && context.actual) {
    if (context.expected.status && context.actual.status !== context.expected.status) {
      score -= 4;
      reasoning += `Expected status "${context.expected.status}" but got "${context.actual.status}". `;
      suggestions.push('Ensure correct status is returned');
    }
  }

  // Check duration (efficiency-related but also correctness)
  if (context.expected?.duration_ms_max && test.duration_ms > context.expected.duration_ms_max) {
    score -= 1;
    reasoning += `Exceeded max duration (${test.duration_ms}ms > ${context.expected.duration_ms_max}ms). `;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(10, score));

  // Generate overall reasoning
  if (score >= 9) {
    reasoning = 'Excellent correctness. ' + reasoning + 'Test executed exactly as expected.';
  } else if (score >= 7) {
    reasoning = 'Good correctness. ' + reasoning + 'Minor issues detected but overall correct.';
  } else if (score >= 5) {
    reasoning = 'Acceptable correctness. ' + reasoning + 'Some issues need attention.';
  } else if (score >= 3) {
    reasoning = 'Needs improvement. ' + reasoning + 'Significant correctness issues detected.';
  } else {
    reasoning = 'Failed correctness check. ' + reasoning + 'Critical issues present.';
  }

  return {
    dimension: 'correctness',
    score,
    reasoning,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
