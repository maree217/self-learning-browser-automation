import { Browser, BrowserContext, Page, CDPSession } from 'playwright';

/**
 * Tool execution result
 */
export interface ToolResult {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  error_type?: string;
  duration_ms?: number;
}

/**
 * Trace log entry for every tool execution
 */
export interface TraceLog {
  timestamp: string;
  session_id: string;
  tool: string;
  parameters: Record<string, any>;
  duration_ms: number;
  status: 'success' | 'error';
  error_details?: string;
  context: {
    url: string;
    domain: string;
    previous_tools: string[];
  };
}

/**
 * Browser session info with CDP support
 */
export interface BrowserSession {
  domain: string;
  context: BrowserContext;
  pages: Map<string, Page>;
  sessionPath: string;
  createdAt: Date;
  lastActivity: Date;
  cdpSession?: CDPSession;  // CDP session for accessibility tree access
}

/**
 * Session storage configuration
 */
export interface SessionConfig {
  domain: string;
  headless: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

/**
 * Tool parameter schemas
 */
export interface NavigateParams {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export interface ClickParams {
  selector: string;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  timeout?: number;
}

export interface TypeParams {
  selector: string;
  text: string;
  delay?: number;
  timeout?: number;
}

export interface FillParams {
  selector: string;
  value: string;
  timeout?: number;
}

export interface SelectParams {
  selector: string;
  value: string | string[];
  timeout?: number;
}

export interface PressParams {
  key: string;
  modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>;
  timeout?: number;
}

export interface HoverParams {
  selector: string;
  timeout?: number;
}

export interface WaitForParams {
  selector?: string;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  timeout?: number;
}

export interface ScreenshotParams {
  selector?: string;
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
  path?: string;
}

export interface EvaluateParams {
  script: string;
  args?: any[];
}

export interface TabsParams {
  action: 'list' | 'create' | 'close' | 'switch';
  url?: string;
  pageId?: string;
}

export interface UploadFileParams {
  selector: string;
  filePaths: string[];
  timeout?: number;
}

export interface HandleDialogParams {
  action: 'accept' | 'dismiss';
  text?: string;
}

/**
 * Benchmark test case
 */
export interface BenchmarkTestCase {
  id: string;
  category: 'tool_selection' | 'parameter_extraction' | 'multi_step_workflows' | 'error_handling';
  query: string;
  expected_tool?: string;
  expected_params?: Record<string, any>;
  expected_behavior?: string;
  steps?: Array<{
    tool: string;
    params: Record<string, any>;
  }>;
}

/**
 * LLM Judge evaluation result
 */
export interface JudgeEvaluation {
  correctness: number;  // 0-10
  efficiency: number;   // 0-10
  safety: number;       // 0-10
  reasoning: string;
  overall: number;      // Average of above
}
