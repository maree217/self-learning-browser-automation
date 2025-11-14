import Supermemory from 'supermemory';

/**
 * Agent Context Provider
 * Retrieves learned patterns, user preferences, and historical insights from Supermemory
 * Provides semantic context to guide agent decision-making
 */
export class AgentContextProvider {
  private supermemory?: Supermemory;
  private enabled: boolean = false;

  constructor() {
    // Initialize Supermemory if API key is available
    if (process.env.SUPERMEMORY_API_KEY) {
      try {
        this.supermemory = new Supermemory({
          apiKey: process.env.SUPERMEMORY_API_KEY
        });
        this.enabled = true;
        console.log('[AgentContext] Supermemory context provider enabled');
      } catch (error) {
        console.error('[AgentContext] Failed to initialize Supermemory:', error);
        this.enabled = false;
      }
    } else {
      console.warn('[AgentContext] SUPERMEMORY_API_KEY not found - context provider disabled');
    }
  }

  /**
   * Check if context provider is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get LinkedIn-specific context and learned patterns
   */
  async getLinkedInContext(userId?: string): Promise<string[]> {
    if (!this.enabled || !this.supermemory) return [];

    try {
      const containerTags = [this.sanitizeTag('linkedin.com'), this.sanitizeTag('www.linkedin.com')];
      if (userId) {
        containerTags.push(this.sanitizeTag(userId));
      }

      const response = await this.supermemory.search.execute({
        q: 'LinkedIn session strategies, successful patterns, things to avoid, rate limits, and optimal timing',
        containerTags,
        limit: 20
      });

      return response.results.map(r => r.content).filter((c): c is string => c != null);
    } catch (error) {
      console.error('[AgentContext] Failed to retrieve LinkedIn context:', error);
      return [];
    }
  }

  /**
   * Get context for a specific domain
   */
  async getDomainContext(domain: string, query: string): Promise<string[]> {
    if (!this.enabled || !this.supermemory) return [];

    try {
      const response = await this.supermemory.search.execute({
        q: query,
        containerTags: [this.sanitizeTag(domain), 'browser-mcp-traces'],
        limit: 15
      });

      return response.results.map(r => r.content).filter((c): c is string => c != null);
    } catch (error) {
      console.error(`[AgentContext] Failed to retrieve context for ${domain}:`, error);
      return [];
    }
  }

  /**
   * Get recent errors and failure patterns for a domain
   */
  async getErrorPatterns(domain: string, sinceHours: number = 24): Promise<{
    commonErrors: string[];
    failureRate: number;
    insights: string[];
  }> {
    if (!this.enabled || !this.supermemory) {
      return { commonErrors: [], failureRate: 0, insights: [] };
    }

    try {
      const response = await this.supermemory.search.execute({
        q: `errors and failures on ${domain} in the last ${sinceHours} hours`,
        containerTags: [this.sanitizeTag(domain), 'status_error'],
        limit: 50
      });

      const errors = response.results.map(r => r.content).filter((c): c is string => c != null);
      const commonErrors = this.extractCommonPatterns(errors);

      return {
        commonErrors,
        failureRate: errors.length > 0 ? errors.length / 50 : 0,
        insights: this.deriveInsights(errors)
      };
    } catch (error) {
      console.error(`[AgentContext] Failed to retrieve error patterns for ${domain}:`, error);
      return { commonErrors: [], failureRate: 0, insights: [] };
    }
  }

  /**
   * Get successful session patterns for a domain
   */
  async getSuccessPatterns(domain: string): Promise<string[]> {
    if (!this.enabled || !this.supermemory) return [];

    try {
      const response = await this.supermemory.search.execute({
        q: `successful sessions and optimal strategies for ${domain}`,
        containerTags: [this.sanitizeTag(domain), 'status_success'],
        limit: 30
      });

      return response.results.map(r => r.content).filter((c): c is string => c != null);
    } catch (error) {
      console.error(`[AgentContext] Failed to retrieve success patterns for ${domain}:`, error);
      return [];
    }
  }

  /**
   * Sanitize tags for Supermemory (alphanumeric, hyphens, underscores only)
   */
  private sanitizeTag(tag: string): string {
    return tag.replace(/[^a-zA-Z0-9\-_]/g, '_');
  }

  /**
   * Store a learned insight or pattern
   */
  async storeInsight(
    domain: string,
    insight: string,
    insightType: 'rate_limit' | 'optimal_timing' | 'successful_strategy' | 'error_recovery' | 'user_preference',
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled || !this.supermemory) return;

    try {
      await this.supermemory.memories.add({
        content: insight,
        metadata: {
          domain,
          insight_type: insightType,
          timestamp: new Date().toISOString(),
          ...metadata
        },
        containerTags: [
          this.sanitizeTag(domain),
          'agent_learnings',
          `type_${insightType}`
        ]
      });
    } catch (error) {
      console.error('[AgentContext] Failed to store insight:', error);
    }
  }

  /**
   * Get all learned insights for a domain
   */
  async getInsights(domain: string, insightType?: string): Promise<string[]> {
    if (!this.enabled || !this.supermemory) return [];

    try {
      const containerTags = [this.sanitizeTag(domain), 'agent_learnings'];
      if (insightType) {
        containerTags.push(`type_${insightType}`);
      }

      const response = await this.supermemory.search.execute({
        q: `learned insights and patterns for ${domain}`,
        containerTags,
        limit: 20
      });

      return response.results.map(r => r.content).filter((c): c is string => c != null);
    } catch (error) {
      console.error(`[AgentContext] Failed to retrieve insights for ${domain}:`, error);
      return [];
    }
  }

  /**
   * Natural language query across all agent memory
   */
  async query(question: string, domains?: string[]): Promise<string[]> {
    if (!this.enabled || !this.supermemory) return [];

    try {
      const containerTags = domains
        ? domains.map(d => this.sanitizeTag(d))
        : ['browser-mcp-traces'];

      const response = await this.supermemory.search.execute({
        q: question,
        containerTags,
        limit: 25
      });

      return response.results.map(r => r.content).filter((c): c is string => c != null);
    } catch (error) {
      console.error('[AgentContext] Failed to execute query:', error);
      return [];
    }
  }

  /**
   * Extract common patterns from error messages
   */
  private extractCommonPatterns(errors: string[]): string[] {
    const patterns: Map<string, number> = new Map();

    errors.forEach(error => {
      // Extract key phrases (simple pattern matching)
      const keyPhrases = [
        'timeout',
        'rate limit',
        'connection failed',
        'not found',
        'access denied',
        'CAPTCHA',
        'network error'
      ];

      keyPhrases.forEach(phrase => {
        if (error.toLowerCase().includes(phrase)) {
          patterns.set(phrase, (patterns.get(phrase) || 0) + 1);
        }
      });
    });

    // Return top 5 most common patterns
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => `${pattern} (${count} occurrences)`);
  }

  /**
   * Derive actionable insights from error patterns
   */
  private deriveInsights(errors: string[]): string[] {
    const insights: string[] = [];

    const errorText = errors.join(' ').toLowerCase();

    if (errorText.includes('timeout')) {
      insights.push('Consider increasing timeout values or using longer wait conditions');
    }

    if (errorText.includes('rate limit')) {
      insights.push('Reduce request frequency or implement exponential backoff');
    }

    if (errorText.includes('captcha')) {
      insights.push('Slow down navigation speed to avoid triggering CAPTCHA');
    }

    if (errorText.includes('not found') || errorText.includes('selector')) {
      insights.push('Page structure may have changed - verify selectors are up to date');
    }

    return insights;
  }
}

// Singleton instance
export const agentContext = new AgentContextProvider();
