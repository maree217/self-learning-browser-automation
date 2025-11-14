# Social Browser Scripts

Standalone CLI scripts for browser automation with **progressive disclosure** to minimize context usage.

## Why Scripts?

- **93% Less Context:** ~5KB vs ~70KB for MCP approach
- **Universal Compatibility:** Works with any AI (Claude, Cursor, Gemini, etc.) or humans
- **Easy Testing:** Unit test each script independently
- **CI/CD Ready:** Use in automated pipelines
- **No Lock-in:** Not tied to any specific AI tool

## Quick Start

### Install and Build
```bash
npm install
npm run build
```

### Run Scripts
```bash
# Using the CLI wrapper
node dist/scripts/cli.js summary

# Or with npm link (creates `sb` command)
npm link
sb summary
```

## Progressive Disclosure

Scripts use a 3-phase progressive disclosure pattern to minimize context:

### Phase 1: Summary (500 bytes)
```bash
$ sb summary
```
```json
{
  "name": "social-browser-scripts",
  "categories": ["navigation", "interaction", "content", "tabs", "sessions", "advanced"],
  "total_tools": 22,
  "usage": "Run \"sb list <category>\" to see available tools"
}
```

### Phase 2: Category Listing (1-2KB per category)
```bash
$ sb list navigation
```
```json
{
  "category": "navigation",
  "tools": [
    { "name": "navigate", "usage": "sb navigate --url <url>" },
    { "name": "go-back", "usage": "sb go-back --domain <domain>" }
  ]
}
```

### Phase 3: Tool Execution (minimal context)
```bash
$ sb navigate --url https://linkedin.com/jobs
$ sb snapshot --domain linkedin.com
```

## Available Tools

### Navigation (3 tools)
- `navigate` - Navigate to a URL with session persistence
- `go-back` - Navigate back in browser history
- `go-forward` - Navigate forward in browser history

### Interaction (7 tools)
- `click` - Click an element on the page
- `type` - Type text into an element
- `fill` - Fill a form field (faster than typing)
- `select` - Select option from dropdown
- `press` - Press keyboard key(s)
- `hover` - Hover over an element
- `wait-for` - Wait for an element or condition

### Content (4 tools)
- `snapshot` - Get accessibility tree snapshot (LLM-friendly)
- `screenshot` - Take screenshot of page or element
- `evaluate` - Execute JavaScript code on the page
- `get-content` - Get page content as text or HTML

### Tabs (1 tool)
- `manage-tabs` - Manage tabs (list/create/close/switch)

### Sessions (5 tools)
- `save-session` - Manually save session (auto-saves on navigation)
- `list-sessions` - List all saved domain sessions
- `clear-session` - Clear session for a domain (logout)
- `enable-shared-context` - Enable shared context for OAuth flows
- `disable-shared-context` - Disable shared context

### Advanced (2 tools)
- `upload-file` - Upload file(s) to file input
- `handle-dialog` - Handle browser dialog (alert/confirm/prompt)

## Usage Examples

### Example 1: Navigate and Capture

```bash
# Navigate to LinkedIn
sb navigate --url "https://linkedin.com/jobs"

# Take a snapshot
sb snapshot --domain linkedin.com > linkedin-snapshot.json

# Take a screenshot
sb screenshot --domain linkedin.com --output linkedin.png
```

### Example 2: Search and Extract

```bash
# Navigate to LinkedIn jobs
sb navigate --url "https://linkedin.com/jobs"

# Fill search field
sb fill --domain linkedin.com \
  --selector "#job-search-bar" \
  --value "AI Engineer"

# Click search button
sb click --domain linkedin.com \
  --selector ".search-submit"

# Wait for results
sb wait-for --domain linkedin.com \
  --selector ".job-card"

# Extract job data
sb evaluate --domain linkedin.com \
  --script "Array.from(document.querySelectorAll('.job-card')).map(card => ({ title: card.querySelector('.job-title').textContent, company: card.querySelector('.company-name').textContent }))"
```

### Example 3: Session Management

```bash
# List all saved sessions
sb list-sessions

# Clear LinkedIn session (logout)
sb clear-session --domain linkedin.com
```

## CLI Commands

### Information Commands
```bash
sb summary              # Show minimal summary (500 bytes)
sb list                 # List all categories
sb list <category>      # List tools in a category
sb help <tool>          # Get detailed help for a tool
sb search <keyword>     # Search tools by keyword
```

### Execution Commands
```bash
sb <tool> [options]           # Execute a tool directly
sb exec <tool> [options]      # Execute a tool (explicit)
```

## Output Format

All scripts output structured JSON:

```typescript
interface ScriptOutput {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  duration_ms?: number;
  next_steps?: string[];  // Suggested follow-up actions
}
```

### Success Example
```json
{
  "status": "success",
  "data": {
    "url": "https://linkedin.com/jobs",
    "domain": "linkedin.com",
    "title": "LinkedIn Jobs"
  },
  "duration_ms": 2341,
  "next_steps": [
    "Use 'sb snapshot --domain linkedin.com' to capture page structure",
    "Use 'sb screenshot --domain linkedin.com' to take a screenshot"
  ]
}
```

### Error Example
```json
{
  "status": "error",
  "error": "Element not found: .missing-selector",
  "error_type": "ClickError",
  "duration_ms": 1523
}
```

## Architecture

```
scripts/
├── cli.ts                    # Main CLI entry point
├── tools.json                # Progressive disclosure registry
├── core/                     # Shared infrastructure
│   ├── browser-session.ts    # Session management
│   ├── progressive-loader.ts # Tool registry loader
│   ├── output-formatter.ts   # JSON output formatting
│   └── types.ts              # Shared types
├── navigation/               # Navigation scripts
│   ├── navigate.ts
│   ├── go-back.ts
│   └── go-forward.ts
├── interaction/              # Interaction scripts
│   ├── click.ts
│   ├── type.ts
│   ├── fill.ts
│   └── ...
├── content/                  # Content extraction
│   ├── snapshot.ts
│   ├── screenshot.ts
│   └── ...
├── tabs/                     # Tab management
├── sessions/                 # Session management
└── advanced/                 # Advanced features
```

## Session Persistence

All scripts use the same session directory as the MCP server (`./sessions/`), ensuring compatibility:

```
sessions/
├── linkedin.com/
│   └── state.json
├── facebook.com/
│   └── state.json
└── shared/
    └── state.json  # For OAuth flows
```

## Using with AI Assistants

### Claude Code
```python
# AI loads tool summary first
tools_summary = execute("sb summary")

# AI loads only needed categories
navigation_tools = execute("sb list navigation")

# AI executes specific tools
result = execute("sb navigate --url https://linkedin.com")
```

### Cursor / Windsurf
Same approach - scripts work with any AI that can invoke bash commands.

### Gemini CLI
```bash
gemini "Search LinkedIn for AI Engineer jobs" --tools sb
```

## Testing

### Manual Testing
```bash
# Test navigation
sb navigate --url "https://example.com" --verbose

# Test snapshot
sb snapshot --domain example.com --verbose
```

### Integration Testing
```bash
npm run test:scripts  # (if you add test suite)
```

## Context Comparison

| Approach | Initial Context | Per Tool | Total (5 tools) |
|----------|----------------|----------|-----------------|
| MCP Server | 50-80KB | 5KB | ~75KB |
| Scripts | 0.5KB | 0KB | ~5KB |
| **Savings** | **98%** | **100%** | **93%** |

## Troubleshooting

### Issue: "Module not found"
**Solution:** Make sure you've run `npm run build` first.

### Issue: "No such file or directory"
**Solution:** Copy `scripts/tools.json` to `dist/scripts/tools.json` after build.

### Issue: Session not persisting
**Solution:** Check that `./sessions/` directory exists and is writable.

### Issue: Browser not opening
**Solution:** Make sure Playwright is installed: `npx playwright install chromium`

## Advanced Usage

### Chaining Scripts
```bash
# Chain multiple operations
sb navigate --url "https://linkedin.com" | \
  jq -r '.data.url' | \
  xargs -I {} sb snapshot --domain {}
```

### Custom Scripts
Create your own scripts following the template in `scripts/navigation/navigate.ts`:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { sessionManager } from '../core/browser-session';
import { success, error, writeOutputAndExit } from '../core/output-formatter';

// Your custom script logic...
```

### Wrapping in MCP
Want MCP interoperability? Create an MCP wrapper:

```typescript
// scripts-mcp-wrapper.ts
import { spawn } from 'child_process';

export function wrapScriptAsMCPTool(scriptName: string) {
  return async (params: any) => {
    const result = await executeScript(scriptName, params);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  };
}
```

## Contributing

To add a new script:

1. Create `scripts/<category>/<tool-name>.ts`
2. Follow the template structure
3. Add tool to `scripts/tools.json`
4. Rebuild: `npm run build`
5. Test: `sb <tool-name> --help`

## License

MIT

## See Also

- [Complete Comparison: MCP vs Scripts](../examples/scripts-comparison/COMPARISON.md)
- [Product Requirements Document](../docs/SCRIPTS-AS-TOOLS-PRD.md)
- [MCP Server README](../README-MCP.md)
