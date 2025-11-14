/**
 * Evaluation Framework Types
 * For LLM-as-a-Judge automated quality assessment
 */

export interface JudgeScore {
  dimension: 'correctness' | 'efficiency' | 'safety';
  score: number; // 0-10
  reasoning: string;
  suggestions?: string[];
}

export interface TestEvaluation {
  testId: string;
  testDescription: string;
  scores: JudgeScore[];
  overallScore: number; // Average of all dimension scores
  verdict: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'failed';
}

export interface EvaluationReport {
  timestamp: string;
  totalTests: number;
  evaluations: TestEvaluation[];
  summary: {
    avgCorrectness: number;
    avgEfficiency: number;
    avgSafety: number;
    overallScore: number;
  };
  breakdown: {
    excellent: number;
    good: number;
    acceptable: number;
    needs_improvement: number;
    failed: number;
  };
}

export interface BenchmarkResult {
  id: string;
  description: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
  details?: any;
}

export interface JudgePrompt {
  test: BenchmarkResult;
  context: {
    tool: string;
    expected: any;
    actual: any;
  };
}
