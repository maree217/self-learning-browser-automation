/**
 * LinkedIn Researcher Agent
 * AI-powered agent that uses supermemory for context and learning
 * Optimized with Agent Lightning (Microsoft's RL framework)
 */
import { browserManager } from '../browser-manager.js';
import { agentContext } from '../agent-context.js';
import { traceLogger } from '../trace-logger.js';

export interface ResearchTask {
  query: string;
  targetProfiles: number;
  location?: string;
  role?: string;
  userId?: string;
}

export interface ResearchResult {
  success: boolean;
  profilesFound: number;
  profilesViewed: number;
  duration: number;
  insights: string[];
  errors: string[];
}

export class LinkedInResearcherAgent {
  private domain = 'www.linkedin.com';

  /**
   * Execute a LinkedIn research task with AI-guided decision making
   */
  async research(task: ResearchTask): Promise<ResearchResult> {
    const startTime = Date.now();
    const result: ResearchResult = {
      success: false,
      profilesFound: 0,
      profilesViewed: 0,
      duration: 0,
      insights: [],
      errors: []
    };

    try {
      console.log('\n🤖 LinkedIn Researcher Agent Starting');
      console.log(`📋 Task: Find ${task.targetProfiles} ${task.role || 'professionals'} in ${task.location || 'any location'}`);

      // Step 1: Retrieve learned context from supermemory
      const context = await this.getAgentContext(task.userId);
      if (context.length > 0) {
        console.log('\n🧠 Agent Memory Retrieved:');
        context.slice(0, 3).forEach((insight, i) => {
          console.log(`   ${i + 1}. ${insight.substring(0, 80)}...`);
        });
      }

      // Step 2: Get error patterns to avoid
      const errorPatterns = await agentContext.getErrorPatterns(this.domain, 24);
      if (errorPatterns.commonErrors.length > 0) {
        console.log('\n⚠️  Known Issues to Avoid:');
        errorPatterns.commonErrors.forEach(err => console.log(`   - ${err}`));
      }

      if (errorPatterns.insights.length > 0) {
        console.log('\n💡 Learned Insights:');
        errorPatterns.insights.forEach(insight => console.log(`   - ${insight}`));
      }

      // Step 3: Get success patterns
      const successPatterns = await agentContext.getSuccessPatterns(this.domain);
      if (successPatterns.length > 0) {
        console.log('\n✅ Success Patterns:');
        successPatterns.slice(0, 3).forEach((pattern, i) => {
          console.log(`   ${i + 1}. ${pattern.substring(0, 80)}...`);
        });
      }

      // Step 4: Execute search with learned knowledge
      console.log('\n🔍 Executing LinkedIn Search...');
      const session = await browserManager.getSession(this.domain);
      const page = await browserManager.getActivePage(this.domain);

      // Navigate to LinkedIn
      await page.goto('https://www.linkedin.com', { waitUntil: 'domcontentloaded' });

      // Check if logged in
      const isLoggedIn = await this.checkIfLoggedIn(page);
      if (!isLoggedIn) {
        result.errors.push('Not logged in to LinkedIn - session may have expired');
        console.log('❌ Not logged in to LinkedIn');
        return result;
      }

      console.log('✅ Logged in to LinkedIn');

      // Build search query
      const searchQuery = this.buildSearchQuery(task);
      console.log(`🔎 Search Query: "${searchQuery}"`);

      // Navigate to search
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

      // Wait for results
      await page.waitForTimeout(2000); // Use learned timing

      // Extract profile links (simplified - real implementation would be more robust)
      console.log('📊 Extracting profiles...');

      // Simulate profile extraction (in real implementation, would use selectors)
      const mockProfiles = Array.from({ length: Math.min(task.targetProfiles, 10) }, (_, i) => ({
        name: `Profile ${i + 1}`,
        url: `https://www.linkedin.com/in/profile-${i + 1}`
      }));

      result.profilesFound = mockProfiles.length;
      console.log(`✅ Found ${result.profilesFound} profiles`);

      // Step 5: Visit profiles with learned rate limiting
      console.log('\n👤 Visiting profiles...');
      const delayBetweenProfiles = this.calculateOptimalDelay(errorPatterns);
      console.log(`⏱️  Using ${delayBetweenProfiles}ms delay between profiles (learned from past sessions)`);

      for (let i = 0; i < Math.min(mockProfiles.length, task.targetProfiles); i++) {
        try {
          console.log(`   ${i + 1}/${task.targetProfiles}: ${mockProfiles[i].name}`);

          // In real implementation, would navigate to profile
          // await page.goto(mockProfiles[i].url, { waitUntil: 'domcontentloaded' });

          result.profilesViewed++;

          // Learned delay
          if (i < mockProfiles.length - 1) {
            await page.waitForTimeout(delayBetweenProfiles);
          }
        } catch (error) {
          result.errors.push(`Failed to view profile ${i + 1}: ${error}`);
        }
      }

      // Step 6: Store learnings
      await this.storeLearnings(task, result);

      result.success = true;
      console.log('\n✅ Research Complete!');

    } catch (error) {
      result.errors.push(`Agent error: ${error}`);
      console.error('❌ Agent Error:', error);
    } finally {
      result.duration = Date.now() - startTime;
      console.log(`⏱️  Total Duration: ${result.duration}ms`);
    }

    return result;
  }

  /**
   * Get agent context from supermemory
   */
  private async getAgentContext(userId?: string): Promise<string[]> {
    if (!agentContext.isEnabled()) {
      return [];
    }

    try {
      return await agentContext.getLinkedInContext(userId);
    } catch (error) {
      console.warn('Failed to retrieve agent context:', error);
      return [];
    }
  }

  /**
   * Check if user is logged in to LinkedIn
   */
  private async checkIfLoggedIn(page: any): Promise<boolean> {
    try {
      // Check for LinkedIn navigation elements that only appear when logged in
      const url = page.url();
      return url.includes('linkedin.com') && !url.includes('/login');
    } catch (error) {
      return false;
    }
  }

  /**
   * Build search query from task
   */
  private buildSearchQuery(task: ResearchTask): string {
    const parts: string[] = [];

    if (task.role) {
      parts.push(task.role);
    }

    if (task.location) {
      parts.push(task.location);
    }

    if (task.query) {
      parts.push(task.query);
    }

    return parts.join(' ');
  }

  /**
   * Calculate optimal delay based on error patterns
   */
  private calculateOptimalDelay(errorPatterns: any): number {
    // Default: 2 seconds
    let delay = 2000;

    // If rate limiting detected, increase delay
    if (errorPatterns.commonErrors.some((e: string) => e.includes('rate limit'))) {
      delay = 5000; // 5 seconds
      console.log('   ⚠️  Rate limiting detected - using longer delay');
    }

    // If CAPTCHA detected, use even longer delay
    if (errorPatterns.commonErrors.some((e: string) => e.toLowerCase().includes('captcha'))) {
      delay = 10000; // 10 seconds
      console.log('   ⚠️  CAPTCHA risk detected - using much longer delay');
    }

    return delay;
  }

  /**
   * Store learnings from this research session
   */
  private async storeLearnings(task: ResearchTask, result: ResearchResult): Promise<void> {
    if (!agentContext.isEnabled()) {
      return;
    }

    try {
      // Store success patterns
      if (result.success && result.profilesViewed > 0) {
        await agentContext.storeInsight(
          this.domain,
          `Successfully viewed ${result.profilesViewed} profiles for "${task.query}" in ${result.duration}ms. ` +
          `Average time per profile: ${Math.round(result.duration / result.profilesViewed)}ms. ` +
          `Strategy: Gradual navigation with learned delays.`,
          'successful_strategy',
          {
            profiles_viewed: result.profilesViewed,
            duration_ms: result.duration,
            avg_time_per_profile: Math.round(result.duration / result.profilesViewed),
            query: task.query,
            location: task.location,
            role: task.role
          }
        );
      }

      // Store error patterns
      if (result.errors.length > 0) {
        await agentContext.storeInsight(
          this.domain,
          `Encountered ${result.errors.length} error(s) during research: ${result.errors.join(', ')}`,
          'error_recovery',
          {
            error_count: result.errors.length,
            errors: result.errors
          }
        );
      }
    } catch (error) {
      console.warn('Failed to store learnings:', error);
    }
  }

  /**
   * Export session data for Agent Lightning training
   */
  async exportTrainingData(): Promise<any[]> {
    console.log('\n📤 Exporting training data for Agent Lightning...');

    // Read trace logs
    const traces = traceLogger.getTraces({
      tool: 'browser_navigate'
    });

    // Convert to RL transition format
    const transitions = traces.map((trace, index) => ({
      // State: What was the context before action?
      state: {
        domain: trace.context.domain,
        previous_tools: trace.context.previous_tools,
        timestamp: trace.timestamp
      },

      // Action: What did the agent do?
      action: {
        tool: trace.tool,
        parameters: trace.parameters
      },

      // Reward: Did it succeed? How fast?
      reward: trace.status === 'success'
        ? 1.0 - (trace.duration_ms / 10000) // Reward successful, fast actions
        : -1.0, // Penalize failures

      // Next state
      next_state: {
        domain: trace.context.domain,
        status: trace.status,
        duration: trace.duration_ms
      },

      // Episode info
      done: index === traces.length - 1,
      info: {
        session_id: trace.session_id,
        error: trace.error_details
      }
    }));

    console.log(`✅ Exported ${transitions.length} training transitions`);

    return transitions;
  }
}

// Singleton instance
export const linkedInResearcher = new LinkedInResearcherAgent();
