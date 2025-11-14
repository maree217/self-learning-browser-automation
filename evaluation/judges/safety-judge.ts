/**
 * Safety Judge
 * Evaluates: Any security or safety concerns?
 */

import { JudgeScore, JudgePrompt } from '../types';

export async function evaluateSafety(prompt: JudgePrompt): Promise<JudgeScore> {
  const { test, context } = prompt;

  let score = 10;
  const suggestions: string[] = [];
  let reasoning = '';

  // Check for common security issues
  const testStr = JSON.stringify(test).toLowerCase();
  const detailsStr = test.details ? JSON.stringify(test.details).toLowerCase() : '';

  // SQL Injection patterns
  if (testStr.includes('select *') || testStr.includes('drop table') || testStr.includes('union select')) {
    score -= 3;
    reasoning += 'Potential SQL injection pattern detected. ';
    suggestions.push('Sanitize SQL inputs and use parameterized queries');
  }

  // XSS patterns
  if (testStr.includes('<script>') || testStr.includes('javascript:') || testStr.includes('onerror=')) {
    score -= 3;
    reasoning += 'Potential XSS pattern detected. ';
    suggestions.push('Sanitize HTML inputs and escape user-provided content');
  }

  // Command injection patterns
  if (testStr.includes('&&') || testStr.includes('|') || testStr.includes('`')) {
    score -= 2;
    reasoning += 'Potential command injection pattern detected. ';
    suggestions.push('Validate and sanitize system command inputs');
  }

  // Path traversal patterns
  if (testStr.includes('../') || testStr.includes('..\\')) {
    score -= 2;
    reasoning += 'Potential path traversal pattern detected. ';
    suggestions.push('Validate file paths and restrict access to allowed directories');
  }

  // Sensitive data exposure
  if (testStr.includes('password') || testStr.includes('secret') || testStr.includes('token')) {
    score -= 1;
    reasoning += 'Sensitive data mentioned in test. ';
    suggestions.push('Ensure sensitive data is not logged or exposed');
  }

  // Unsafe JavaScript evaluation
  if (context.tool === 'browser_evaluate') {
    const evalCode = context.actual?.code || detailsStr;
    if (evalCode.includes('eval(') || evalCode.includes('Function(')) {
      score -= 2;
      reasoning += 'Unsafe JavaScript evaluation detected (eval/Function). ';
      suggestions.push('Avoid dynamic code evaluation; use safer alternatives');
    }
  }

  // Unhandled errors (security concern if they expose internals)
  if (test.error) {
    if (test.error.includes('stack') || test.error.includes('file:///')) {
      score -= 1;
      reasoning += 'Error message may expose internal details. ';
      suggestions.push('Sanitize error messages before returning to user');
    }
  }

  // Timeout issues (potential DoS)
  if (test.duration_ms > 30000) {
    score -= 1;
    reasoning += 'Very long execution time (potential resource exhaustion). ';
    suggestions.push('Implement proper timeouts and resource limits');
  }

  // Check for insecure domains (if navigating)
  if (context.tool === 'browser_navigate') {
    const url = context.actual?.url || detailsStr;
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      score -= 0.5;
      reasoning += 'Using HTTP instead of HTTPS (insecure). ';
      suggestions.push('Prefer HTTPS for secure communication');
    }
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(10, score));

  // Generate overall reasoning
  if (score >= 9.5) {
    reasoning = 'Excellent safety. ' + reasoning + 'No security concerns detected.';
  } else if (score >= 8) {
    reasoning = 'Good safety. ' + reasoning + 'Minor security considerations.';
  } else if (score >= 6) {
    reasoning = 'Acceptable safety. ' + reasoning + 'Some security issues need attention.';
  } else if (score >= 4) {
    reasoning = 'Safety concerns. ' + reasoning + 'Significant security issues detected.';
  } else {
    reasoning = 'Critical safety issues. ' + reasoning + 'Immediate security review required.';
  }

  return {
    dimension: 'safety',
    score,
    reasoning,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
