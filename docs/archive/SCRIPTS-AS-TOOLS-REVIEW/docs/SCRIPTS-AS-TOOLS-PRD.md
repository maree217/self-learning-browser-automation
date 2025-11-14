# Product Requirements Document: Scripts as Tools Architecture

**Version:** 1.0.0
**Date:** November 10, 2025
**Status:** Implementation Phase

---

## Executive Summary

Transform the existing social-browser-mcp MCP server into a dual-mode system that supports both:
1. **MCP Server Mode** (existing): For Claude Code and multi-agent systems
2. **Scripts Mode** (new): For direct CLI usage, maximum context efficiency, and universal AI tool compatibility

The scripts approach implements progressive disclosure to reduce context consumption by 90% while maintaining full functionality and enabling cross-platform AI agent usage.

---

## Problem Statement

### Current State (MCP Only)
- **Context Bleeding**: All 20 tools exposed upfront (~50-80KB context)
- **Vendor Lock-in**: Only works with Claude Code and MCP-compatible agents
- **Limited Reusability**: Can't be used by human developers directly
- **Opaque Execution**: Tool logic buried in MCP server, hard to debug
- **No Interoperability**: Can't use with Cursor, Windsurf, Gemini CLI, or other AI tools

### Desired State (Dual Mode)
- **Progressive Disclosure**: Tools loaded on-demand (~500 bytes → 3-5KB per tool)
- **Universal Compatibility**: Works with any AI, CLI, or automation system
- **Maximum Reusability**: Same scripts for humans, AI agents, and CI/CD
- **Transparent Execution**: Clear inputs/outputs, easy to debug
- **Interoperability**: Wrap scripts in MCP when needed, use standalone otherwise

---

## Goals & Non-Goals

### Goals
1. ✅ Create standalone scripts for all 20 MCP tools
2. ✅ Implement progressive disclosure pattern (tool registry)
3. ✅ Build unified CLI wrapper for script execution
4. ✅ Maintain 100% feature parity with MCP tools
5. ✅ Reduce context consumption by 90%
6. ✅ Enable human + AI usage of same scripts
7. ✅ Provide comparison benchmarks (MCP vs Scripts)

### Non-Goals
1. ❌ Remove or deprecate existing MCP server
2. ❌ Change MCP tool behavior or APIs
3. ❌ Optimize existing MCP implementation
4. ❌ Add new features beyond current MCP capabilities

---

## Architecture Overview

### Directory Structure

```
social-browser-mcp/
├── src/                           # Existing MCP server (unchanged)
│   ├── index.ts
│   ├── browser-manager.ts
│   ├── tools/
│   │   ├── navigation.ts
│   │   ├── interaction.ts
│   │   ├── content.ts
│   │   ├── tabs.ts
│   │   ├── sessions.ts
│   │   └── advanced.ts
│   └── types.ts
│
├── scripts/                       # NEW: Standalone scripts
│   ├── README.md                  # Usage guide
│   ├── tools.json                 # Progressive disclosure registry
│   ├── cli.ts                     # Unified CLI entry point
│   │
│   ├── core/                      # Shared infrastructure
│   │   ├── browser-session.ts     # Session management
│   │   ├── progressive-loader.ts  # Tool registry loader
│   │   ├── output-formatter.ts    # JSON output formatting
│   │   └── types.ts               # Shared types
│   │
│   ├── navigation/                # Navigation scripts
│   │   ├── navigate.ts
│   │   ├── go-back.ts
│   │   └── go-forward.ts
│   │
│   ├── interaction/               # Interaction scripts
│   │   ├── click.ts
│   │   ├── type.ts
│   │   ├── fill.ts
│   │   ├── select.ts
│   │   ├── press.ts
│   │   ├── hover.ts
│   │   └── wait-for.ts
│   │
│   ├── content/                   # Content extraction scripts
│   │   ├── snapshot.ts
│   │   ├── screenshot.ts
│   │   ├── evaluate.ts
│   │   └── get-content.ts
│   │
│   ├── tabs/                      # Tab management scripts
│   │   └── manage-tabs.ts
│   │
│   ├── sessions/                  # Session management scripts
│   │   ├── save-session.ts
│   │   ├── list-sessions.ts
│   │   ├── clear-session.ts
│   │   ├── enable-shared-context.ts
│   │   └── disable-shared-context.ts
│   │
│   └── advanced/                  # Advanced scripts
│       ├── upload-file.ts
│       └── handle-dialog.ts
│
├── examples/                      # NEW: Comparison examples
│   ├── mcp-workflow.md            # Using MCP approach
│   ├── scripts-workflow.md        # Using scripts approach
│   └── comparison-results.md      # Context usage comparison
│
└── tests/
    └── scripts/                   # NEW: Script tests
        └── integration/
```

---

## Progressive Disclosure Design

### Phase 1: Tool Registry (500 bytes)

**What AI Sees Initially:**
```json
{
  "social-browser-scripts": {
    "version": "1.0.0",
    "categories": ["navigation", "interaction", "content", "tabs", "sessions", "advanced"],
    "total_tools": 20,
    "usage": "Run 'sb list <category>' to see available tools"
  }
}
```

### Phase 2: Category Listing (~1-2KB per category)

**Example: User runs `sb list navigation`**
```json
{
  "category": "navigation",
  "tools": [
    {
      "name": "navigate",
      "description": "Navigate to a URL with session persistence",
      "usage": "sb navigate --url <url> --domain <domain>",
      "context_cost": "~3KB"
    },
    {
      "name": "go-back",
      "description": "Navigate back in browser history",
      "usage": "sb go-back --domain <domain>",
      "context_cost": "~2KB"
    },
    {
      "name": "go-forward",
      "description": "Navigate forward in browser history",
      "usage": "sb go-forward --domain <domain>",
      "context_cost": "~2KB"
    }
  ]
}
```

### Phase 3: Detailed Tool Info (3-5KB per tool)

**Example: User runs `sb help navigate`**
```json
{
  "tool": "navigate",
  "description": "Navigate to a URL. Sessions are automatically saved per domain.",
  "usage": "sb navigate [options]",
  "options": [
    {
      "flag": "--url, -u",
      "type": "string",
      "required": true,
      "description": "URL to navigate to"
    },
    {
      "flag": "--domain, -d",
      "type": "string",
      "required": false,
      "description": "Domain for session persistence (auto-extracted from URL)"
    },
    {
      "flag": "--wait-until",
      "type": "string",
      "enum": ["load", "domcontentloaded", "networkidle"],
      "default": "load",
      "description": "Wait until this event fires"
    },
    {
      "flag": "--timeout",
      "type": "number",
      "default": 60000,
      "description": "Timeout in milliseconds"
    },
    {
      "flag": "--output, -o",
      "type": "string",
      "description": "Output file for result JSON"
    }
  ],
  "examples": [
    {
      "command": "sb navigate --url https://linkedin.com/jobs",
      "description": "Navigate to LinkedIn jobs page"
    },
    {
      "command": "sb navigate -u https://facebook.com -d facebook.com --wait-until networkidle",
      "description": "Navigate to Facebook and wait for network idle"
    }
  ],
  "output_format": {
    "status": "success | error",
    "data": {
      "url": "Final URL after redirects",
      "domain": "Domain used for session",
      "title": "Page title"
    },
    "duration_ms": "Execution time"
  },
  "related_tools": ["go-back", "go-forward", "snapshot"]
}
```

---

## Script Design Principles

### 1. Minimal Output by Default
Scripts output only JSON results, no verbose logs unless `--verbose` flag is used.

```typescript
// Good: Minimal output
console.log(JSON.stringify({ status: 'success', data: { jobIds: [...] } }));

// Bad: Verbose output
console.log('Starting job search...');
console.log('Found 25 jobs');
console.log('Extracting job IDs...');
```

### 2. Structured JSON Output
All scripts output JSON with consistent structure:

```typescript
interface ScriptOutput {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  duration_ms?: number;
  next_steps?: string[];  // Suggest follow-up scripts
}
```

### 3. File I/O for Large Data
For large outputs (>10KB), scripts write to files and return file paths:

```typescript
// Good: Write large data to file
await fs.writeFile('jobs.json', JSON.stringify(jobs));
console.log(JSON.stringify({
  status: 'success',
  data: { output_file: 'jobs.json', count: jobs.length }
}));

// Bad: Output large data to stdout
console.log(JSON.stringify({ status: 'success', data: jobs }));
```

### 4. Composability
Scripts accept input from stdin or files, enabling chaining:

```bash
# Chain scripts via pipes
sb navigation/navigate --url linkedin.com | \
  sb content/snapshot | \
  sb content/evaluate --script extract-jobs.js
```

### 5. Idempotency
Scripts are safe to re-run (e.g., sessions are reused, not recreated):

```typescript
// Reuse existing session if available
const context = await getOrCreateSession(domain);
```

---

## CLI Design

### Command Structure

```bash
sb <category>/<tool> [options]
sb <tool> [options]              # Shorthand for common tools
sb list [category]               # List tools
sb help <tool>                   # Get detailed tool info
```

### Examples

```bash
# Navigation
sb navigate --url https://linkedin.com
sb go-back --domain linkedin.com

# Interaction
sb click --domain linkedin.com --selector ".job-apply-button"
sb fill --domain linkedin.com --selector "#search" --value "AI Engineer"

# Content
sb snapshot --domain linkedin.com --output snapshot.json
sb evaluate --domain linkedin.com --script "document.title"

# Sessions
sb list-sessions
sb clear-session --domain linkedin.com

# List commands
sb list                          # List all categories
sb list navigation              # List navigation tools
sb list interaction             # List interaction tools

# Help
sb help navigate                # Detailed help for navigate
sb --version                    # Show version
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 hours)
- [ ] Create `scripts/` directory structure
- [ ] Implement `scripts/core/browser-session.ts` (session management)
- [ ] Implement `scripts/core/output-formatter.ts` (JSON formatting)
- [ ] Implement `scripts/core/progressive-loader.ts` (tool registry)
- [ ] Create `scripts/tools.json` (progressive disclosure registry)
- [ ] Implement `scripts/cli.ts` (CLI entry point)

### Phase 2: Navigation Scripts (1 hour)
- [ ] Translate `navigate` MCP tool → `scripts/navigation/navigate.ts`
- [ ] Translate `go-back` MCP tool → `scripts/navigation/go-back.ts`
- [ ] Translate `go-forward` MCP tool → `scripts/navigation/go-forward.ts`

### Phase 3: Interaction Scripts (2 hours)
- [ ] Translate `click` → `scripts/interaction/click.ts`
- [ ] Translate `type` → `scripts/interaction/type.ts`
- [ ] Translate `fill` → `scripts/interaction/fill.ts`
- [ ] Translate `select` → `scripts/interaction/select.ts`
- [ ] Translate `press` → `scripts/interaction/press.ts`
- [ ] Translate `hover` → `scripts/interaction/hover.ts`
- [ ] Translate `wait-for` → `scripts/interaction/wait-for.ts`

### Phase 4: Content Scripts (1.5 hours)
- [ ] Translate `snapshot` → `scripts/content/snapshot.ts`
- [ ] Translate `screenshot` → `scripts/content/screenshot.ts`
- [ ] Translate `evaluate` → `scripts/content/evaluate.ts`
- [ ] Translate `get-content` → `scripts/content/get-content.ts`

### Phase 5: Tabs & Sessions Scripts (1 hour)
- [ ] Translate `manage-tabs` → `scripts/tabs/manage-tabs.ts`
- [ ] Translate session tools → `scripts/sessions/*.ts` (5 files)

### Phase 6: Advanced Scripts (1 hour)
- [ ] Translate `upload-file` → `scripts/advanced/upload-file.ts`
- [ ] Translate `handle-dialog` → `scripts/advanced/handle-dialog.ts`

### Phase 7: Testing & Documentation (2 hours)
- [ ] Create integration tests for all scripts
- [ ] Write usage examples (MCP vs Scripts comparison)
- [ ] Document context savings benchmarks
- [ ] Create migration guide for existing users

**Total Estimated Time: 10-11 hours**

---

## Success Metrics

### Context Efficiency
- **Initial Exposure**: ≤ 500 bytes (tool catalog)
- **Per-Category Load**: ≤ 2KB
- **Per-Tool Detail**: ≤ 5KB
- **Total Context Savings**: ≥ 90% vs MCP

### Functional Parity
- **Coverage**: 100% of MCP tools (20/20)
- **Behavior**: Identical outputs to MCP tools
- **Session Persistence**: Works identically

### Usability
- **Human Usage**: ≥ 5 common workflows documented
- **AI Usage**: Compatible with Claude, Cursor, Gemini, etc.
- **Error Handling**: Clear error messages with suggested fixes

### Performance
- **Execution Time**: ≤ MCP tool execution time + 100ms
- **Startup Time**: ≤ 500ms for CLI initialization

---

## Context Usage Comparison

### Scenario: LinkedIn Job Search Workflow

#### MCP Approach
```
Initial Tool List: 50KB (all 20 tools exposed)
+ Tool Execution: 5KB per tool
= 50KB + (5KB × 5 tools) = 75KB total
```

#### Scripts Approach
```
Initial Registry: 0.5KB (tool catalog)
+ Category List: 1.5KB (interaction + content categories)
+ Tool Details: 3KB × 3 tools (only tools actually used)
= 0.5KB + 1.5KB + 9KB = 11KB total

Context Savings: 85% 🎉
```

---

## Migration Path for Existing Users

### No Breaking Changes
- Existing MCP server continues to work
- Scripts are additive, not replacing MCP

### Gradual Adoption
1. **Week 1**: Try scripts for simple tasks (navigate, snapshot)
2. **Week 2**: Use scripts for full workflows (job search)
3. **Week 3**: Measure context savings and developer experience
4. **Week 4**: Decide: keep both, prefer scripts, or wrap scripts in MCP

### Hybrid Usage
```bash
# Use scripts for common operations
sb navigate --url linkedin.com
sb snapshot --domain linkedin.com

# Use MCP for complex debugging
# (full Chrome DevTools access via MCP)
```

---

## Risk Mitigation

### Risk 1: Increased Maintenance Burden
**Mitigation**:
- Scripts are thin wrappers around shared `browser-session.ts` code
- Both MCP and scripts use same Playwright logic
- Update both paths when browser behavior changes

### Risk 2: Feature Drift (MCP vs Scripts)
**Mitigation**:
- Automated tests compare MCP vs Scripts outputs
- CI/CD checks ensure 100% parity
- Shared type definitions (`scripts/core/types.ts`)

### Risk 3: Developer Confusion (When to use which?)
**Mitigation**:
- Clear decision tree in documentation:
  - CLI usage → Scripts
  - Claude Code → Skills (that call scripts)
  - Multi-agent systems → MCP
  - Real-time debugging → MCP

### Risk 4: Build Complexity
**Mitigation**:
- Single `npm run build` compiles both MCP and scripts
- Scripts use same `tsconfig.json` as MCP
- No additional dependencies required

---

## Open Questions

1. **Q**: Should scripts reuse MCP tool implementations or be fully standalone?
   **A**: Standalone with shared core. Easier to debug and optimize separately.

2. **Q**: How to handle sessions across MCP and scripts?
   **A**: Share same `./sessions/` directory. Both use Playwright persistent contexts.

3. **Q**: Should we build an MCP wrapper around scripts later?
   **A**: Yes! Phase 8 (future): `scripts-mcp-wrapper.ts` that exposes scripts as MCP tools.

4. **Q**: How to handle breaking changes in Playwright?
   **A**: Both MCP and scripts affected equally. Update shared `browser-session.ts`.

---

## Appendix A: Tool Registry Schema

```typescript
// scripts/tools.json
{
  "version": "1.0.0",
  "categories": {
    "navigation": {
      "description": "Browser navigation tools",
      "tools": {
        "navigate": {
          "script": "navigation/navigate.js",
          "description": "Navigate to a URL",
          "usage": "sb navigate --url <url>",
          "context_cost": "~3KB",
          "related": ["go-back", "go-forward"]
        }
        // ... more tools
      }
    }
    // ... more categories
  }
}
```

---

## Appendix B: Example Script Template

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { getOrCreateSession } from '../core/browser-session';
import { formatOutput } from '../core/output-formatter';

const program = new Command();

program
  .name('navigate')
  .description('Navigate to a URL with session persistence')
  .requiredOption('-u, --url <url>', 'URL to navigate to')
  .option('-d, --domain <domain>', 'Domain for session (auto-detected from URL)')
  .option('--wait-until <event>', 'Wait until event', 'load')
  .option('--timeout <ms>', 'Timeout in milliseconds', '60000')
  .option('-o, --output <file>', 'Output file for JSON result')
  .option('--verbose', 'Enable verbose logging')
  .parse();

async function main() {
  const opts = program.opts();
  const startTime = Date.now();

  try {
    // Extract domain from URL
    const domain = opts.domain || new URL(opts.url).hostname;

    // Get or create session
    const { page, context } = await getOrCreateSession(domain);

    // Navigate
    await page.goto(opts.url, {
      waitUntil: opts.waitUntil as any,
      timeout: parseInt(opts.timeout)
    });

    // Get final URL and title
    const finalUrl = page.url();
    const title = await page.title();

    // Format output
    const result = formatOutput({
      status: 'success',
      data: { url: finalUrl, domain, title },
      duration_ms: Date.now() - startTime
    });

    // Write output
    if (opts.output) {
      await fs.writeFile(opts.output, JSON.stringify(result, null, 2));
    } else {
      console.log(JSON.stringify(result));
    }

  } catch (error) {
    const result = formatOutput({
      status: 'error',
      error: error.message,
      duration_ms: Date.now() - startTime
    });

    console.error(JSON.stringify(result));
    process.exit(1);
  }
}

main();
```

---

**End of PRD**
