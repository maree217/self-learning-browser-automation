/**
 * Shared types for scripts
 */

export interface ScriptOutput<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  error_type?: string;
  duration_ms?: number;
  next_steps?: string[];
}

export interface SessionInfo {
  domain: string;
  sessionPath: string;
  isActive: boolean;
  lastActivity: Date;
}

export interface NavigateResult {
  url: string;
  domain: string;
  title: string;
}

export interface SnapshotResult {
  domain: string;
  url: string;
  snapshot: string;
  format: 'text' | 'json';
}

export interface ScreenshotResult {
  domain: string;
  url: string;
  imagePath?: string;
  imageData?: string;
  format: 'png' | 'jpeg';
}

export interface EvaluateResult {
  domain: string;
  url: string;
  result: any;
}

export interface TabsResult {
  action: string;
  tabs?: Array<{
    id: string;
    url: string;
    title: string;
  }>;
}

export interface SessionResult {
  domain?: string;
  sessions?: SessionInfo[];
  message?: string;
}
