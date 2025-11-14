# Supermemory Integration

This document describes the Supermemory integration for semantic memory and agent learning in Social Browser MCP.

## Overview

Supermemory provides a knowledge graph-based semantic memory layer that allows the browser automation system to:

- **Learn from past sessions** - Store and retrieve successful patterns and failure modes
- **Natural language queries** - Ask "Why did LinkedIn sessions fail last week?" instead of parsing logs
- **Agent intelligence** - Provide context for AI agents to make better decisions
- **Pattern detection** - Automatically detect relationships between actions and outcomes

## Architecture

```
┌─────────────────────────────────────────┐
│       Social Browser MCP Tool           │
│            Execution                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         Trace Logger                    │
│  ┌─────────────┐   ┌────────────────┐  │
│  │   JSONL     │   │  Supermemory   │  │
│  │  (Raw Log)  │   │   (Semantic)   │  │
│  └─────────────┘   └────────────────┘  │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Agent Context Provider             │
│   - getLinkedInContext()                │
│   - getErrorPatterns()                  │
│   - getSuccessPatterns()                │
│   - storeInsight()                      │
│   - query()                             │
└─────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install supermemory
```

Already installed in `package.json`.

### 2. Get Supermemory API Key

1. Sign up at [console.supermemory.ai](https://console.supermemory.ai)
2. Navigate to **API Keys** → **Create API Key**
3. Copy your API key

### 3. Configure Environment

Create or update `.env` file:

```bash
SUPERMEMORY_API_KEY="your_api_key_here"
```

### 4. Enable Supermemory (Optional)

Supermemory integration is **optional** and **disabled by default**. To enable:

```typescript
// In your code
import { TraceLogger } from './trace-logger';

const logger = new TraceLogger('logs', true);  // Second param enables Supermemory
```

**Note:** Even without Supermemory, all traces are still logged to `logs/traces.jsonl`.

## Features

### 1. Automatic Trace Logging

Every tool execution is automatically sent to Supermemory as a semantic memory:

```typescript
// Automatically logged as:
// "Session sess_xyz executed browser_navigate on linkedin.com.
//  Status: SUCCESS in 1523ms. Previous actions: browser_click, browser_type."
```

**Metadata stored:**
- `session_id`: Unique session identifier
- `tool`: Tool name (e.g., `browser_navigate`)
- `status`: `success` or `error`
- `duration_ms`: Execution time
- `domain`: Target domain (e.g., `linkedin.com`)
- `timestamp`: ISO timestamp
- `url`: Target URL
- `error`: Error message (if failed)

**Container tags:**
- Domain (e.g., `linkedin.com`)
- Tool (e.g., `tool:browser_navigate`)
- Status (e.g., `status:success`)
- `browser-mcp-traces` (all traces)

### 2. Agent Context Provider

The `AgentContextProvider` class provides methods to query learned patterns:

```typescript
import { agentContext } from './agent-context';

// Get LinkedIn-specific context
const linkedinTips = await agentContext.getLinkedInContext();
// Returns: [
//   "LinkedIn rate limiting kicks in after 50 profile views in 1 hour",
//   "Optimal strategy: 20 profiles/session with 5-minute gaps",
//   ...
// ]

// Get error patterns
const errors = await agentContext.getErrorPatterns('linkedin.com', 24);
// Returns: {
//   commonErrors: ["timeout (5 occurrences)", "rate limit (3 occurrences)"],
//   failureRate: 0.08,
//   insights: ["Consider increasing timeout values..."]
// }

// Get successful patterns
const successes = await agentContext.getSuccessPatterns('linkedin.com');
// Returns: [
//   "Session succeeded when using 2-second delays between clicks",
//   "Weekday afternoons have 95% success rate",
//   ...
// ]

// Natural language query
const results = await agentContext.query(
  "What patterns lead to successful profile extraction?"
);
```

### 3. Store Learned Insights

Store insights for future agent learning:

```typescript
await agentContext.storeInsight(
  'linkedin.com',
  'LinkedIn CAPTCHA appears when navigating faster than 1 action per 2 seconds',
  'rate_limit',
  {
    actions_per_minute: 30,
    threshold: 50
  }
);
```

**Insight types:**
- `rate_limit`: Rate limiting patterns
- `optimal_timing`: Best times for actions
- `successful_strategy`: Successful approaches
- `error_recovery`: Recovery from errors
- `user_preference`: User-specific preferences

### 4. Domain-Specific Queries

Query context for any domain:

```typescript
const facebookContext = await agentContext.getDomainContext(
  'facebook.com',
  'How do I avoid getting blocked on Facebook?'
);
```

## Usage Examples

### Example 1: Pre-Action Context Retrieval

Before starting a LinkedIn session, retrieve learned context:

```typescript
import { agentContext } from './agent-context';

async function startLinkedInSession(userId: string) {
  // Get learned context
  const context = await agentContext.getLinkedInContext(userId);
  const errorPatterns = await agentContext.getErrorPatterns('linkedin.com');

  console.log('Learned context:');
  context.forEach(c => console.log(`  - ${c}`));

  console.log('\nKnown error patterns:');
  errorPatterns.commonErrors.forEach(e => console.log(`  - ${e}`));

  console.log('\nInsights:');
  errorPatterns.insights.forEach(i => console.log(`  - ${i}`));

  // Now navigate with knowledge of what works and what doesn't
  // ...
}
```

### Example 2: Post-Session Analysis

After a session, store learnings:

```typescript
async function afterSession(sessionResult) {
  if (sessionResult.success) {
    await agentContext.storeInsight(
      sessionResult.domain,
      `Session succeeded with ${sessionResult.profilesViewed} profiles viewed ` +
      `using ${sessionResult.strategy} strategy. Average time per profile: ${sessionResult.avgTime}ms.`,
      'successful_strategy',
      {
        profiles: sessionResult.profilesViewed,
        avg_time_ms: sessionResult.avgTime,
        strategy: sessionResult.strategy
      }
    );
  } else {
    // Error patterns automatically captured in trace logs
  }
}
```

### Example 3: Natural Language Debugging

Debug issues using natural language:

```typescript
// Query: "Why are LinkedIn sessions failing?"
const results = await agentContext.query(
  "Why are LinkedIn sessions failing?",
  ['linkedin.com']
);

results.forEach(r => console.log(r));

// Output:
// - "Session failed with timeout after 30000ms"
// - "CAPTCHA detected after 50 rapid navigations"
// - "Connection refused - possible rate limiting"
```

## Data Storage

### Local (JSONL)
- **Location:** `logs/traces.jsonl`
- **Format:** One JSON object per line
- **Purpose:** Raw audit log, immutable
- **Retention:** Indefinite (manual cleanup)

### Remote (Supermemory)
- **Location:** Supermemory cloud (or self-hosted)
- **Format:** Semantic memory graph
- **Purpose:** Searchable knowledge, relationships
- **Retention:** Per Supermemory settings

## Cost

### Free Tier
- **1,000 requests/day**
- **Perfect for development and testing**

### Paid Plans
- **$99/month**: 100,000 requests/month
- **Enterprise**: Custom pricing, self-hosting option

**Estimated usage:**
- ~10-50 traces per session
- ~100-500 traces per day for active development
- Free tier should cover most use cases

## Privacy & Security

### Data Sent to Supermemory
- Tool execution summaries (e.g., "navigated to linkedin.com")
- Performance metrics (duration, status)
- Domain names
- **NOT sent:** Passwords, authentication tokens, personal data

### Self-Hosting (Enterprise Only)
For complete data sovereignty, Supermemory supports self-hosting:
- Requires PostgreSQL with pgvector
- Cloudflare Workers deployment
- See [Supermemory self-hosting docs](https://supermemory.ai/docs/deployment/self-hosting)

## Disabling Supermemory

Supermemory is **optional**. To disable:

1. **Don't set** `SUPERMEMORY_API_KEY` environment variable
2. **Or** initialize TraceLogger with `enableSupermemory: false`:

```typescript
const logger = new TraceLogger('logs', false);
```

All traces will still be logged to `logs/traces.jsonl`.

## Troubleshooting

### "SUPERMEMORY_API_KEY not found"

**Solution:** Add API key to `.env` file or environment variables.

### "Failed to send to Supermemory"

**Cause:** Network error, invalid API key, or rate limit exceeded.

**Solution:**
1. Check API key is correct
2. Check network connectivity
3. Check Supermemory API status
4. Verify you haven't exceeded free tier limits

**Note:** Traces are still logged to JSONL even if Supermemory fails.

### Build Errors

**Issue:** TypeScript compilation errors related to Supermemory types.

**Solution:** Ensure `supermemory` package is installed:
```bash
npm install supermemory
```

## API Reference

### TraceLogger

```typescript
class TraceLogger {
  constructor(logDir?: string, enableSupermemory?: boolean)

  async log(
    tool: string,
    parameters: Record<string, any>,
    status: 'success' | 'error',
    duration_ms: number,
    url: string,
    domain: string,
    error_details?: string
  ): Promise<void>
}
```

### AgentContextProvider

```typescript
class AgentContextProvider {
  isEnabled(): boolean

  async getLinkedInContext(userId?: string): Promise<string[]>

  async getDomainContext(domain: string, query: string): Promise<string[]>

  async getErrorPatterns(domain: string, sinceHours?: number): Promise<{
    commonErrors: string[];
    failureRate: number;
    insights: string[];
  }>

  async getSuccessPatterns(domain: string): Promise<string[]>

  async storeInsight(
    domain: string,
    insight: string,
    insightType: 'rate_limit' | 'optimal_timing' | 'successful_strategy' |
                 'error_recovery' | 'user_preference',
    metadata?: Record<string, any>
  ): Promise<void>

  async getInsights(domain: string, insightType?: string): Promise<string[]>

  async query(question: string, domains?: string[]): Promise<string[]>
}
```

## Next Steps

1. **Get API key** from [console.supermemory.ai](https://console.supermemory.ai)
2. **Set environment variable** `SUPERMEMORY_API_KEY`
3. **Enable in trace logger** when needed
4. **Query context** before agent actions
5. **Store insights** after sessions

## Resources

- [Supermemory Documentation](https://supermemory.ai/docs)
- [TypeScript SDK Reference](https://supermemory.ai/docs/memory-api/sdks/typescript)
- [API Reference](https://supermemory.ai/docs/api-reference)
- [Developer Console](https://console.supermemory.ai)
