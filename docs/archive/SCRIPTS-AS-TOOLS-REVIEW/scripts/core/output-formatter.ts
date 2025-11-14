import { ScriptOutput } from './types';

/**
 * Format script output as JSON
 */
export function formatOutput<T>(output: ScriptOutput<T>): ScriptOutput<T> {
  return {
    status: output.status,
    ...(output.data && { data: output.data }),
    ...(output.error && { error: output.error }),
    ...(output.error_type && { error_type: output.error_type }),
    ...(output.duration_ms !== undefined && { duration_ms: output.duration_ms }),
    ...(output.next_steps && { next_steps: output.next_steps }),
  };
}

/**
 * Format success result
 */
export function success<T>(data: T, duration_ms?: number, next_steps?: string[]): ScriptOutput<T> {
  return formatOutput({
    status: 'success',
    data,
    duration_ms,
    next_steps,
  });
}

/**
 * Format error result
 */
export function error(errorMessage: string, error_type?: string, duration_ms?: number): ScriptOutput {
  return formatOutput({
    status: 'error',
    error: errorMessage,
    error_type,
    duration_ms,
  });
}

/**
 * Write output to console
 */
export function writeOutput<T>(output: ScriptOutput<T>): void {
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Write output and exit
 */
export function writeOutputAndExit<T>(output: ScriptOutput<T>): never {
  writeOutput(output);
  process.exit(output.status === 'success' ? 0 : 1);
}
