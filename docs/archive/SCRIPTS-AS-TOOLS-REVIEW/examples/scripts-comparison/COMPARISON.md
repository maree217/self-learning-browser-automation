# MCP vs Scripts: Complete Comparison

This document compares the MCP Server approach vs the Scripts approach for the social-browser automation.

## Context Usage Comparison

### Scenario: LinkedIn Job Search

**Task:** Navigate to LinkedIn, search for jobs, extract job listings, and take a snapshot.

---

### Approach 1: MCP Server

**Initial Context Load:**
```
All 20 MCP tools exposed upfront:
- browser_navigate
- browser_go_back
- browser_go_forward
- browser_click
- browser_type
- browser_fill
- browser_select
- browser_press
- browser_hover
- browser_wait_for
- browser_snapshot
- browser_screenshot
- browser_evaluate
- browser_get_content
- browser_tabs
- browser_save_session
- browser_list_sessions
- browser_clear_session
- browser_enable_shared_context
- browser_disable_shared_context
- browser_upload_file
- browser_handle_dialog

Estimated context: ~50-80KB (all tool schemas)
```

**Usage:**
```python
# AI sees all 20 tools immediately
# Must reason about which tools to use from full set
# Context window partially consumed before work begins

await browser_navigate({ url: "https://linkedin.com/jobs", domain: "linkedin.com" })
await browser_fill({ domain: "linkedin.com", selector: "#search", value: "AI Engineer" })
await browser_click({ domain: "linkedin.com", selector: ".search-button" })
await browser_snapshot({ domain: "linkedin.com" })
```

**Total Context:** ~50KB + (5KB × 4 tools) = **~70KB**

---

### Approach 2: Scripts (Progressive Disclosure)

**Phase 1: Initial Context Load**
```bash
$ sb summary
```

**Output** (500 bytes):
```json
{
  "name": "social-browser-scripts",
  "version": "1.0.0",
  "description": "Progressive disclosure tool registry for social-browser scripts",
  "categories": ["navigation", "interaction", "content", "tabs", "sessions", "advanced"],
  "total_tools": 22,
  "usage": "Run \"sb list <category>\" to see available tools"
}
```

**Phase 2: Load Only Needed Categories** (~1-2KB per category)
```bash
$ sb list navigation
$ sb list interaction
$ sb list content
```

**Output:**
```json
{
  "category": "navigation",
  "tools": [
    { "name": "navigate", "usage": "sb navigate --url <url>" },
    { "name": "go-back", "usage": "sb go-back --domain <domain>" },
    { "name": "go-forward", "usage": "sb go-forward --domain <domain>" }
  ]
}
```

**Phase 3: Execute Tools** (no additional context)
```bash
$ sb navigate --url "https://linkedin.com/jobs"
$ sb fill --domain linkedin.com --selector "#search" --value "AI Engineer"
$ sb click --domain linkedin.com --selector ".search-button"
$ sb snapshot --domain linkedin.com
```

**Total Context:**
- Summary: 0.5KB
- Categories (3): 1.5KB × 3 = 4.5KB
- Execution: 0KB (just bash commands)
- **Total: ~5KB**

**Context Savings: 93% 🎉**

---

## Workflow Comparison

### Workflow: LinkedIn Job Search Automation

#### MCP Approach

**Step 1: AI invokes MCP tools**
```
User: "Find AI Engineer jobs on LinkedIn"

Claude (with MCP):
1. [Loads all 20 tool schemas: ~50KB context]
2. [Reasons about which tools to use]
3. [Invokes browser_navigate]
4. [Invokes browser_fill]
5. [Invokes browser_click]
6. [Invokes browser_evaluate]
```

**Pros:**
- Everything in one environment (Claude Code)
- Real-time debugging with Chrome DevTools protocol
- AI can adapt to edge cases dynamically

**Cons:**
- High context cost before starting
- Only works with Claude Code
- Can't reuse for human workflows
- Harder to test in isolation

---

#### Scripts Approach

**Step 1: Progressive disclosure**
```
User: "Find AI Engineer jobs on LinkedIn"

Claude (with scripts):
1. [Loads tool summary: 0.5KB]
2. "I need navigation and interaction tools"
3. [Loads navigation category: 1.5KB]
4. [Loads interaction category: 2KB]
5. [Executes: sb navigate --url https://linkedin.com/jobs]
6. [Executes: sb fill --domain linkedin.com --selector "#search" --value "AI Engineer"]
7. [Executes: sb click --domain linkedin.com --selector ".search-button"]
8. [Executes: sb evaluate --domain linkedin.com --script "extractJobs.js"]
```

**Pros:**
- Minimal context usage (5KB vs 70KB)
- Works with any AI (Claude, Cursor, Gemini, etc.)
- Works with human developers (CLI)
- Easy to test and debug
- Can be used in CI/CD pipelines

**Cons:**
- Requires bash tool invocations (slight overhead)
- Not as "conversational" as pure MCP
- Need to manage file outputs for large data

---

## Compatibility Comparison

### MCP Approach
✅ Claude Code
✅ MCP-compatible agents
❌ Cursor
❌ Windsurf
❌ Gemini CLI
❌ GitHub Copilot
❌ Human developers (CLI)
❌ CI/CD pipelines

### Scripts Approach
✅ Claude Code (via bash)
✅ Cursor (via bash)
✅ Windsurf (via bash)
✅ Gemini CLI (via bash)
✅ GitHub Copilot (via bash)
✅ Human developers (CLI)
✅ CI/CD pipelines
✅ Can wrap in MCP later!

---

## Real-World Example

### LinkedIn Job Search with MCP

```typescript
// Claude Code with MCP
User: "Search for AI Engineer jobs in London on LinkedIn"

Claude invokes:
1. browser_navigate({ url: "https://linkedin.com/jobs", domain: "linkedin.com" })
   -> Returns: { status: 'success', data: { url: '...', title: '...' } }

2. browser_fill({ domain: "linkedin.com", selector: "#job-search-bar", value: "AI Engineer" })
   -> Returns: { status: 'success' }

3. browser_fill({ domain: "linkedin.com", selector: "#location-search", value: "London" })
   -> Returns: { status: 'success' }

4. browser_click({ domain: "linkedin.com", selector: ".search-submit" })
   -> Returns: { status: 'success' }

5. browser_evaluate({
     domain: "linkedin.com",
     script: "Array.from(document.querySelectorAll('.job-card')).map(card => ({...}))"
   })
   -> Returns: { status: 'success', data: { result: [...] } }
```

**Context Usage:**
- Initial: 50KB (all tools)
- Execution: 5KB × 5 tools = 25KB
- **Total: 75KB**

---

### LinkedIn Job Search with Scripts

```bash
# Claude Code with Scripts
User: "Search for AI Engineer jobs in London on LinkedIn"

Claude sees tool summary (0.5KB):
{
  "categories": ["navigation", "interaction", "content", ...],
  "usage": "sb list <category>"
}

Claude invokes:
$ sb list navigation
$ sb list interaction
$ sb list content

Claude then executes:
$ sb navigate --url "https://linkedin.com/jobs"
$ sb fill --domain linkedin.com --selector "#job-search-bar" --value "AI Engineer"
$ sb fill --domain linkedin.com --selector "#location-search" --value "London"
$ sb click --domain linkedin.com --selector ".search-submit"
$ sb evaluate --domain linkedin.com --script "Array.from(document.querySelectorAll('.job-card')).map(card => ({...}))"
```

**Context Usage:**
- Summary: 0.5KB
- Categories: 1.5KB × 3 = 4.5KB
- Execution: Bash commands (minimal context)
- **Total: 5KB**

**Context Savings: 93%**

---

## Performance Comparison

| Metric | MCP | Scripts | Winner |
|--------|-----|---------|--------|
| Context Usage | 70KB | 5KB | **Scripts (93% less)** |
| Execution Speed | ~Same | ~Same | Tie |
| Setup Time | None | Build scripts | MCP |
| Debuggability | Good (MCP logs) | Excellent (stdout) | **Scripts** |
| Reusability | Low (Claude only) | High (any AI/CLI) | **Scripts** |
| Testability | Medium | High (unit tests) | **Scripts** |
| Interoperability | Low | High | **Scripts** |

---

## When to Use Each

### Use MCP When:
1. You exclusively use Claude Code
2. You need real-time browser debugging
3. You want conversational interaction
4. You're building multi-agent systems

### Use Scripts When:
1. Context efficiency matters (long conversations)
2. You use multiple AI tools (Cursor, Gemini, etc.)
3. You want CLI access for developers
4. You need CI/CD integration
5. You want maximum flexibility

### Use Both When:
1. Wrap scripts in MCP for best of both worlds
2. Expose scripts as MCP tools for interoperability
3. Use scripts for 80% of tasks, MCP for advanced debugging

---

## Migration Path

### Step 1: Install and Test Scripts
```bash
npm install
npm run build
node dist/scripts/cli.js summary
```

### Step 2: Try Simple Workflow
```bash
sb navigate --url https://linkedin.com
sb snapshot --domain linkedin.com
```

### Step 3: Compare Context Usage
- Use MCP for a task: measure context
- Use scripts for same task: measure context
- Decide based on your needs

### Step 4: Hybrid Approach (Recommended)
- Use scripts for common operations
- Keep MCP for advanced debugging
- Wrap scripts in MCP if needed

---

## Conclusion

**For social-browser-mcp:**
- **80% of use cases**: Use scripts (context efficiency, flexibility)
- **10% of use cases**: Use MCP (real-time debugging)
- **10% of use cases**: Use both (wrap scripts in MCP)

**Key Takeaway:** Progressive disclosure through scripts reduces context usage by 90%+ while maintaining full functionality and enabling universal AI compatibility.
