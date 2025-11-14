import * as fs from 'fs';
import * as path from 'path';
import { TraceLog } from './types.js';
import Supermemory from 'supermemory';

/**
 * Comprehensive trace logger for all tool executions
 * Logs to JSON Lines format for easy parsing and analysis
 * Optionally sends to Supermemory for semantic search and agent learning
 */
export class TraceLogger {
  private logPath: string;
  private sessionId: string;
  private previousTools: string[] = [];
  private supermemory?: Supermemory;
  private supermemoryEnabled: boolean = false;

  constructor(logDir: string = 'logs', enableSupermemory: boolean = false) {
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logPath = path.join(logDir, 'traces.jsonl');
    this.sessionId = this.generateSessionId();

    // Initialize Supermemory if enabled and API key is available
    if (enableSupermemory && process.env.SUPERMEMORY_API_KEY) {
      try {
        this.supermemory = new Supermemory({
          apiKey: process.env.SUPERMEMORY_API_KEY
        });
        this.supermemoryEnabled = true;
        console.log('[TraceLogger] Supermemory integration enabled');
      } catch (error) {
        console.error('[TraceLogger] Failed to initialize Supermemory:', error);
        this.supermemoryEnabled = false;
      }
    } else if (enableSupermemory && !process.env.SUPERMEMORY_API_KEY) {
      console.warn('[TraceLogger] Supermemory enabled but SUPERMEMORY_API_KEY not found');
    }
  }

  /**
   * Log a tool execution
   */
  async log(
    tool: string,
    parameters: Record<string, any>,
    status: 'success' | 'error',
    duration_ms: number,
    url: string,
    domain: string,
    error_details?: string
  ): Promise<void> {
    const trace: TraceLog = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      tool,
      parameters,
      duration_ms,
      status,
      error_details,
      context: {
        url,
        domain,
        previous_tools: [...this.previousTools]
      }
    };

    // Add to previous tools
    this.previousTools.push(tool);
    if (this.previousTools.length > 10) {
      this.previousTools.shift(); // Keep last 10 tools
    }

    // 1. ALWAYS write to JSONL (raw audit log)
    const logLine = JSON.stringify(trace) + '\n';
    fs.appendFileSync(this.logPath, logLine);

    // 2. OPTIONALLY send to Supermemory (semantic search)
    if (this.supermemoryEnabled && this.supermemory) {
      try {
        await this.sendToSupermemory(trace);
      } catch (error) {
        // Don't fail the log if Supermemory fails
        console.error('[TraceLogger] Failed to send to Supermemory:', error);
      }
    }
  }

  /**
   * Sanitize tags for Supermemory (alphanumeric, hyphens, underscores only)
   */
  private sanitizeTag(tag: string): string {
    return tag.replace(/[^a-zA-Z0-9\-_]/g, '_');
  }

  /**
   * Send trace to Supermemory for semantic search and learning
   */
  private async sendToSupermemory(trace: TraceLog): Promise<void> {
    if (!this.supermemory) return;

    // Format trace as a narrative for semantic search
    const narrative = this.formatTraceAsNarrative(trace);

    // Send to Supermemory with metadata
    const metadata: Record<string, string | number> = {
      session_id: trace.session_id,
      tool: trace.tool,
      status: trace.status,
      duration_ms: trace.duration_ms,
      domain: trace.context.domain,
      timestamp: trace.timestamp,
      url: trace.context.url
    };

    // Only add error if it exists
    if (trace.error_details) {
      metadata.error = trace.error_details;
    }

    await this.supermemory.memories.add({
      content: narrative,
      metadata,
      containerTags: [
        this.sanitizeTag(trace.context.domain),
        `tool_${trace.tool}`,
        `status_${trace.status}`,
        'browser-mcp-traces'
      ]
    });
  }

  /**
   * Format trace as a natural language narrative
   */
  private formatTraceAsNarrative(trace: TraceLog): string {
    const { tool, status, duration_ms, error_details, context } = trace;

    let narrative = `Session ${trace.session_id} executed ${tool} on ${context.domain}.`;

    // Add outcome
    if (status === 'success') {
      narrative += ` Status: SUCCESS in ${duration_ms}ms.`;
    } else {
      narrative += ` Status: FAILED in ${duration_ms}ms. Error: ${error_details || 'Unknown error'}.`;
    }

    // Add context
    if (context.previous_tools.length > 0) {
      narrative += ` Previous actions: ${context.previous_tools.slice(-3).join(', ')}.`;
    }

    // Add URL if meaningful
    if (context.url && context.url !== 'unknown') {
      narrative += ` URL: ${context.url}`;
    }

    return narrative;
  }

  /**
   * Get all traces for analysis
   */
  getTraces(filter?: {
    sessionId?: string;
    tool?: string;
    status?: 'success' | 'error';
    since?: Date;
  }): TraceLog[] {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const lines = fs.readFileSync(this.logPath, 'utf-8').split('\n').filter(l => l.trim());
    let traces = lines.map(line => JSON.parse(line) as TraceLog);

    // Apply filters
    if (filter) {
      if (filter.sessionId) {
        traces = traces.filter(t => t.session_id === filter.sessionId);
      }
      if (filter.tool) {
        traces = traces.filter(t => t.tool === filter.tool);
      }
      if (filter.status) {
        traces = traces.filter(t => t.status === filter.status);
      }
      if (filter.since) {
        traces = traces.filter(t => new Date(t.timestamp) >= filter.since!);
      }
    }

    return traces;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    if (fs.existsSync(this.logPath)) {
      fs.unlinkSync(this.logPath);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Singleton instance
export const traceLogger = new TraceLogger();
