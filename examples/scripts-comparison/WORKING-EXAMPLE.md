# Working Example: LinkedIn Job Search

This is a complete working example demonstrating the scripts approach for LinkedIn job search automation.

## Prerequisites

```bash
# Build the project
cd /Users/rammaree/projects/social-browser-mcp
npm install
npm run build

# Verify scripts are working
npm run scripts:summary
```

## Example 1: Simple Navigation

### Step 1: Check Available Tools (500 bytes)

```bash
$ npm run scripts:summary
```

**Output:**
```json
{
  "name": "social-browser-scripts",
  "version": "1.0.0",
  "description": "Progressive disclosure tool registry for social-browser scripts",
  "categories": [
    "navigation",
    "interaction",
    "content",
    "tabs",
    "sessions",
    "advanced"
  ],
  "total_tools": 22,
  "usage": "Run \"sb list <category>\" to see available tools"
}
```

**Context Used: 0.5KB** ✅

---

### Step 2: List Navigation Tools (1.5KB)

```bash
$ node dist/scripts/cli.js list navigation
```

**Output:**
```json
{
  "category": "navigation",
  "description": "Browser navigation tools",
  "tools": [
    {
      "name": "navigate",
      "description": "Navigate to a URL with session persistence",
      "usage": "sb navigate --url <url> [--domain <domain>]",
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

**Context Used: +1.5KB = 2KB total** ✅

---

### Step 3: Navigate to LinkedIn

```bash
$ node dist/scripts/navigation/navigate.js \
  --url "https://linkedin.com/jobs" \
  --verbose
```

**Output:**
```json
{
  "status": "success",
  "data": {
    "url": "https://www.linkedin.com/jobs/",
    "domain": "linkedin.com",
    "title": "LinkedIn Jobs"
  },
  "duration_ms": 2341,
  "next_steps": [
    "Use \"sb snapshot --domain linkedin.com\" to capture page structure",
    "Use \"sb screenshot --domain linkedin.com\" to take a screenshot"
  ]
}
```

**Context Used: 0KB (just bash command) = 2KB total** ✅

---

### Step 4: Take a Snapshot

```bash
$ node dist/scripts/content/snapshot.js \
  --domain linkedin.com \
  > linkedin-snapshot.json
```

**Output:** (written to file)
```json
{
  "status": "success",
  "data": {
    "domain": "linkedin.com",
    "url": "https://www.linkedin.com/jobs/",
    "snapshot": "{...accessibility tree...}",
    "format": "json"
  },
  "duration_ms": 523
}
```

**Total Context Used: 2KB** ✅

---

## Example 2: Complete Job Search Workflow

### AI Conversation Flow

**User:** "Search for AI Engineer jobs in London on LinkedIn"

**AI loads minimal context:**

```bash
# Step 1: Get tool summary
$ node dist/scripts/cli.js summary
# Returns: 500 bytes

# Step 2: Load needed categories
$ node dist/scripts/cli.js list navigation
# Returns: 1.5KB
$ node dist/scripts/cli.js list interaction
# Returns: 2KB
$ node dist/scripts/cli.js list content
# Returns: 1.5KB

# Total context so far: 5.5KB
```

**AI executes workflow:**

```bash
# Navigate to LinkedIn jobs
$ node dist/scripts/navigation/navigate.js \
  --url "https://linkedin.com/jobs"

# Fill search query
$ node dist/scripts/interaction/fill.js \
  --domain linkedin.com \
  --selector "#job-search-bar" \
  --value "AI Engineer"

# Fill location
$ node dist/scripts/interaction/fill.js \
  --domain linkedin.com \
  --selector "#job-location-search" \
  --value "London"

# Click search
$ node dist/scripts/interaction/click.js \
  --domain linkedin.com \
  --selector ".search-submit-button"

# Wait for results
$ node dist/scripts/interaction/wait-for.js \
  --domain linkedin.com \
  --selector ".jobs-search-results__list"

# Extract job data
$ node dist/scripts/content/evaluate.js \
  --domain linkedin.com \
  --script "Array.from(document.querySelectorAll('.job-card-container')).map(card => ({
    title: card.querySelector('.job-card-list__title')?.textContent?.trim(),
    company: card.querySelector('.job-card-container__company-name')?.textContent?.trim(),
    location: card.querySelector('.job-card-container__metadata-item')?.textContent?.trim(),
    link: card.querySelector('.job-card-list__title')?.href
  }))" \
  > jobs-data.json
```

**Total Context Used: 5.5KB** ✅

---

## Example 3: Session Management

### List All Sessions

```bash
$ node dist/scripts/sessions/list-sessions.js
```

**Output:**
```json
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "domain": "linkedin.com",
        "sessionPath": "./sessions/linkedin.com",
        "isActive": false,
        "lastActivity": "2025-11-10T12:00:00.000Z"
      }
    ]
  },
  "duration_ms": 45,
  "next_steps": [
    "Use \"sb clear-session --domain <domain>\" to remove a session"
  ]
}
```

### Clear Session (Logout)

```bash
$ node dist/scripts/sessions/clear-session.js \
  --domain linkedin.com
```

---

## Context Usage Breakdown

### Scripts Approach
```
Initial Summary:     0.5KB
Navigation Tools:    1.5KB
Interaction Tools:   2.0KB
Content Tools:       1.5KB
---------------------------
Total:               5.5KB
```

### MCP Approach (for comparison)
```
All 22 Tools:       50-80KB
---------------------------
Total:              50-80KB
```

**Context Savings: 90-93%** 🎉

---

## Testing Scripts Locally

### Test Navigate
```bash
$ node dist/scripts/navigation/navigate.js \
  --url "https://example.com" \
  --verbose

# Expected: Browser opens to example.com
# Output: JSON with url, domain, title
```

### Test Click
```bash
# First navigate
$ node dist/scripts/navigation/navigate.js \
  --url "https://example.com"

# Then test click
$ node dist/scripts/interaction/click.js \
  --domain example.com \
  --selector "a" \
  --verbose

# Expected: Clicks first link on page
```

### Test Snapshot
```bash
$ node dist/scripts/content/snapshot.js \
  --domain example.com \
  | jq '.data.snapshot' \
  | head -20

# Expected: Accessibility tree JSON
```

---

## Error Handling

### Script Failures

If a script fails, it returns structured error JSON:

```bash
$ node dist/scripts/interaction/click.js \
  --domain example.com \
  --selector ".nonexistent"
```

**Output:**
```json
{
  "status": "error",
  "error": "Timeout 30000ms exceeded waiting for selector \".nonexistent\"",
  "error_type": "ClickError",
  "duration_ms": 30123
}
```

### Debugging

Use `--verbose` flag for detailed logging:

```bash
$ node dist/scripts/navigation/navigate.js \
  --url "https://example.com" \
  --verbose

# Stderr output:
# Navigating to https://example.com (domain: example.com)
# Navigation complete: Example Domain
```

---

## Next Steps

1. **Try it yourself:**
   ```bash
   npm run build
   npm run scripts:summary
   node dist/scripts/cli.js list navigation
   ```

2. **Use with AI:**
   - Copy tool summary to AI context
   - Let AI decide which categories to load
   - AI executes scripts via bash

3. **Compare with MCP:**
   - Run same workflow with MCP tools
   - Measure context usage
   - Decide which approach fits your needs

4. **Extend:**
   - Add custom scripts (follow template)
   - Update tools.json registry
   - Rebuild and test

---

## Complete Workflow Script

Save this as `examples/linkedin-search.sh`:

```bash
#!/bin/bash
# Complete LinkedIn job search automation

QUERY="AI Engineer"
LOCATION="London"
DOMAIN="linkedin.com"

echo "Starting LinkedIn job search..."

# Navigate
echo "1. Navigating to LinkedIn Jobs..."
node dist/scripts/navigation/navigate.js \
  --url "https://linkedin.com/jobs" \
  | jq '.data.url'

# Fill search query
echo "2. Filling search query: $QUERY"
node dist/scripts/interaction/fill.js \
  --domain "$DOMAIN" \
  --selector "#job-search-bar" \
  --value "$QUERY"

# Fill location
echo "3. Filling location: $LOCATION"
node dist/scripts/interaction/fill.js \
  --domain "$DOMAIN" \
  --selector "#job-location-search" \
  --value "$LOCATION"

# Click search
echo "4. Clicking search button..."
node dist/scripts/interaction/click.js \
  --domain "$DOMAIN" \
  --selector ".search-submit-button"

# Wait for results
echo "5. Waiting for results..."
node dist/scripts/interaction/wait-for.js \
  --domain "$DOMAIN" \
  --selector ".jobs-search-results__list"

# Extract jobs
echo "6. Extracting job data..."
node dist/scripts/content/evaluate.js \
  --domain "$DOMAIN" \
  --script "Array.from(document.querySelectorAll('.job-card-container')).slice(0, 10).map(card => ({
    title: card.querySelector('.job-card-list__title')?.textContent?.trim(),
    company: card.querySelector('.job-card-container__company-name')?.textContent?.trim()
  }))" \
  > jobs.json

echo "Done! Results saved to jobs.json"
cat jobs.json | jq '.'
```

Run it:
```bash
chmod +x examples/linkedin-search.sh
./examples/linkedin-search.sh
```

---

## Summary

**Scripts Approach Benefits:**
- ✅ 93% less context than MCP
- ✅ Works with any AI tool
- ✅ Works with human developers (CLI)
- ✅ Easy to test and debug
- ✅ CI/CD ready
- ✅ Progressive disclosure pattern

**Try it now:**
```bash
npm run build
npm run scripts:summary
```

For more details, see:
- [Complete Comparison](./COMPARISON.md)
- [Scripts README](../../scripts/README.md)
- [PRD](../../docs/SCRIPTS-AS-TOOLS-PRD.md)
