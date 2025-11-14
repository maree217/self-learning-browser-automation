# Phase 1.5: CDP Accessibility Integration

> **Critical Fix:** Add Chrome DevTools Protocol (CDP) accessibility tree support to enable reliable LinkedIn automation

## Executive Summary

**Problem:** Playwright's accessibility API provides insufficient DOM structure for LLM-driven automation of complex web apps like LinkedIn.

**Solution:** Integrate CDP's `Accessibility.getFullAXTree()` to provide rich, UID-based accessibility trees that LLMs can effectively navigate.

**Impact:** Enables all planned LinkedIn automation use cases (job search, connection requests, profile analysis).

**Timeline:** 2-4 weeks (40-60 hours)

---

## Status: Phase 1.5 In Progress

**Current State:**
- ✅ Core MCP server with 20 tools (Playwright-based)
- ✅ Unit tests (42 passing)
- ✅ Integration tests (10 passing)
- ✅ E2E test plans created (3 LinkedIn workflows)
- ❌ LinkedIn automation failing (accessibility tree insufficient)
- ✅ Fallback to Chrome DevTools MCP confirmed working

**Target State:**
- ✅ CDP accessibility tree integration
- ✅ UID-based element targeting system
- ✅ LinkedIn E2E tests passing
- ✅ Maintains all existing trace logging
- ✅ Backward compatible with existing tools

---

## Why CDP Matters: Technical Deep Dive

### The Accessibility Tree Problem

**LinkedIn's Complex DOM:**
- 15+ nested div layers
- Dynamic class names (e.g., `entity-result__item--2Ig5C`)
- Shadow DOM components
- Lazy-loaded content
- Frequent DOM restructuring

**Playwright's Limited Output:**
```json
{
  "role": "listitem",
  "name": "",
  "children": [
    { "role": "link", "name": "John Doe" },
    { "role": "link", "name": "John Doe" }
  ]
}
```

**Problems:**
- No unique identifiers (UID)
- Duplicate elements indistinguishable
- Missing semantic context
- Simplified structure loses information

**CDP's Rich Output:**
```json
{
  "nodeId": "AX_123",
  "backendDOMNodeId": 4567,
  "role": { "type": "role", "value": "listitem" },
  "name": {
    "type": "computedString",
    "value": "John Doe, AI Solutions Architect at Google, San Francisco Bay Area",
    "sources": [
      { "type": "contents", "value": { "type": "computedString", "value": "John Doe" } },
      { "type": "contents", "value": { "type": "computedString", "value": "AI Solutions Architect at Google" } }
    ]
  },
  "properties": [
    { "name": "level", "value": { "type": "integer", "value": 1 } },
    { "name": "posinset", "value": { "type": "integer", "value": 3 } },
    { "name": "setsize", "value": { "type": "integer", "value": 50 } }
  ],
  "childIds": ["AX_124", "AX_125"],
  "description": { "type": "computedString", "value": "Profile link" }
}
```

**Advantages:**
- ✅ Unique nodeId for reliable targeting
- ✅ Computed semantic labels (concatenates visible text)
- ✅ Properties expose hierarchy (level, position, size)
- ✅ backendDOMNodeId for direct DOM manipulation
- ✅ Sources show where name/description came from

**Impact on LLM Performance:**
- **Parsing:** 10x easier for LLMs to understand page structure
- **Targeting:** UIDs enable precise element selection
- **Reasoning:** Semantic labels provide context for decision-making
- **Reliability:** Works even when CSS classes change

---

## Implementation Plan

### Week 1: CDP Foundation (16-20 hours)

#### Task 1.1: Add CDP Session Management
**File:** `src/browser-manager.ts`

```typescript
import { CDPSession } from 'playwright';

interface SessionData {
  context: BrowserContext;
  pages: Map<string, Page>;
  cdpSession?: CDPSession;  // NEW
}

async getOrCreateCDPSession(domain: string): Promise<CDPSession> {
  const session = await this.getSession(domain);
  if (!session.cdpSession) {
    const page = await this.getActivePage(domain);
    session.cdpSession = await page.context().newCDPSession(page);
  }
  return session.cdpSession;
}
```

**Test:** Verify CDP session creation and persistence
**Completion Criteria:** CDP session available for all domains

---

#### Task 1.2: Create CDP Accessibility Module
**File:** `src/tools/cdp-accessibility.ts` (NEW)

```typescript
import { CDPSession } from 'playwright';
import { browserManager } from '../browser-manager.js';

interface AccessibilityNode {
  nodeId: string;
  backendDOMNodeId: number;
  role: { value: string };
  name: { value: string };
  description?: { value: string };
  value?: { value: string | number };
  properties?: Array<{ name: string; value: any }>;
  childIds?: string[];
  ignored?: boolean;
  ignoredReasons?: Array<{ name: string; value: any }>;
}

interface AccessibilityTree {
  nodes: AccessibilityNode[];
  nodeMap: Map<string, AccessibilityNode>;
}

/**
 * Get full accessibility tree using CDP
 */
export async function getAccessibilityTree(
  domain: string,
  options?: { fetchRelatives?: boolean }
): Promise<AccessibilityTree> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);

  // Enable accessibility domain
  await cdpSession.send('Accessibility.enable');

  // Get full accessibility tree
  const { nodes } = await cdpSession.send('Accessibility.getFullAXTree');

  // Build node map for fast lookups
  const nodeMap = new Map<string, AccessibilityNode>();
  nodes.forEach(node => {
    nodeMap.set(node.nodeId, node);
  });

  return { nodes, nodeMap };
}

/**
 * Query accessibility tree by role/name
 */
export async function queryAccessibilityTree(
  domain: string,
  role?: string,
  name?: string
): Promise<AccessibilityNode[]> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);

  const { nodes } = await cdpSession.send('Accessibility.queryAXTree', {
    role,
    name,
    accessibleName: name
  });

  return nodes;
}

/**
 * Get accessibility node by backend DOM node ID
 */
export async function getNodeByDOMNodeId(
  backendDOMNodeId: number,
  cdpSession: CDPSession
): Promise<any> {
  const { object } = await cdpSession.send('DOM.resolveNode', {
    backendNodeId: backendDOMNodeId
  });
  return object;
}
```

**Test:** Unit tests for tree retrieval and parsing
**Completion Criteria:** Can fetch and parse accessibility tree from any page

---

#### Task 1.3: Create UID Targeting System
**File:** `src/tools/cdp-interaction.ts` (NEW)

```typescript
import { browserManager } from '../browser-manager.js';
import { getAccessibilityTree, getNodeByDOMNodeId } from './cdp-accessibility.js';

/**
 * Click element by accessibility UID
 */
export async function clickByUID(
  uid: string,
  domain: string,
  options?: { button?: 'left' | 'right' | 'middle'; clickCount?: number }
): Promise<void> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const tree = await getAccessibilityTree(domain);

  const node = tree.nodeMap.get(uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  if (node.ignored) {
    throw new Error(`Node is ignored by accessibility tree: ${uid}`);
  }

  // Get DOM element from backend node ID
  const domObject = await getNodeByDOMNodeId(node.backendDOMNodeId, cdpSession);

  // Click using CDP Runtime.callFunctionOn
  await cdpSession.send('Runtime.callFunctionOn', {
    objectId: domObject.objectId,
    functionDeclaration: `function() {
      this.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.click();
    }`,
    arguments: []
  });
}

/**
 * Fill input by accessibility UID
 */
export async function fillByUID(
  uid: string,
  value: string,
  domain: string
): Promise<void> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const tree = await getAccessibilityTree(domain);

  const node = tree.nodeMap.get(uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const domObject = await getNodeByDOMNodeId(node.backendDOMNodeId, cdpSession);

  // Focus and type
  await cdpSession.send('Runtime.callFunctionOn', {
    objectId: domObject.objectId,
    functionDeclaration: `function(value) {
      this.focus();
      this.value = value;
      this.dispatchEvent(new Event('input', { bubbles: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }`,
    arguments: [{ value }]
  });
}

/**
 * Get text content by accessibility UID
 */
export async function getTextByUID(
  uid: string,
  domain: string
): Promise<string> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const tree = await getAccessibilityTree(domain);

  const node = tree.nodeMap.get(uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const domObject = await getNodeByDOMNodeId(node.backendDOMNodeId, cdpSession);

  const result = await cdpSession.send('Runtime.callFunctionOn', {
    objectId: domObject.objectId,
    functionDeclaration: 'function() { return this.textContent; }',
    returnByValue: true
  });

  return result.result.value;
}
```

**Test:** Unit tests for UID-based interactions
**Completion Criteria:** Can click/fill/read any element by UID

---

### Week 2: Tool Integration (16-20 hours)

#### Task 2.1: Update browser_snapshot Tool
**File:** `src/tools/content.ts`

```typescript
import { getAccessibilityTree, queryAccessibilityTree } from './cdp-accessibility.js';

export async function snapshot(
  domain: string,
  options?: {
    mode?: 'playwright' | 'cdp' | 'both';  // NEW
    role?: string;
    name?: string;
    includeIgnored?: boolean;
  }
): Promise<ToolResult> {
  const mode = options?.mode || 'cdp';  // Default to CDP

  try {
    let result: any = {};

    // Playwright mode (legacy)
    if (mode === 'playwright' || mode === 'both') {
      const page = await browserManager.getActivePage(domain);
      const playwrightSnapshot = await page.accessibility.snapshot();
      result.playwright = playwrightSnapshot;
    }

    // CDP mode (new default)
    if (mode === 'cdp' || mode === 'both') {
      if (options?.role || options?.name) {
        const nodes = await queryAccessibilityTree(domain, options.role, options.name);
        result.cdp = { nodes };
      } else {
        const tree = await getAccessibilityTree(domain);
        result.cdp = {
          nodes: options?.includeIgnored
            ? tree.nodes
            : tree.nodes.filter(n => !n.ignored),
          totalNodes: tree.nodes.length
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    // Error handling...
  }
}
```

**Test:** Compare Playwright vs CDP snapshots on LinkedIn
**Completion Criteria:** CDP snapshot provides richer data with UIDs

---

#### Task 2.2: Add New Tools for UID Targeting
**File:** `src/tools/cdp-interaction.ts`

Register new tools in `src/index.ts`:
```typescript
{
  name: 'browser_click_uid',
  description: 'Click element by accessibility UID (more reliable than CSS selectors)',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string' },
      uid: { type: 'string', description: 'Accessibility node UID from snapshot' },
      button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
      clickCount: { type: 'number', default: 1 }
    },
    required: ['domain', 'uid']
  }
},
{
  name: 'browser_fill_uid',
  description: 'Fill input by accessibility UID',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string' },
      uid: { type: 'string', description: 'Accessibility node UID from snapshot' },
      value: { type: 'string', description: 'Text to fill' }
    },
    required: ['domain', 'uid', 'value']
  }
},
{
  name: 'browser_query_elements',
  description: 'Query elements by accessibility role/name',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string' },
      role: { type: 'string', description: 'ARIA role (e.g., button, link, textbox)' },
      name: { type: 'string', description: 'Accessible name (partial match)' }
    },
    required: ['domain']
  }
}
```

**Test:** Integration tests for UID-based tools
**Completion Criteria:** New tools work on real LinkedIn pages

---

#### Task 2.3: Update Existing Tools with UID Support
**File:** `src/tools/interaction.ts`

```typescript
// Extend existing tools to accept either selector OR uid
export async function click(args: {
  domain: string;
  selector?: string;  // Optional now
  uid?: string;       // NEW
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  timeout?: number;
}): Promise<ToolResult> {
  // If UID provided, use CDP targeting
  if (args.uid) {
    await clickByUID(args.uid, args.domain, {
      button: args.button,
      clickCount: args.clickCount
    });
    return { /* success */ };
  }

  // Otherwise, use existing Playwright selector logic
  const page = await browserManager.getActivePage(args.domain);
  await page.click(args.selector!, {
    button: args.button,
    clickCount: args.clickCount,
    timeout: args.timeout
  });
  return { /* success */ };
}
```

**Test:** Verify backward compatibility (selectors still work)
**Completion Criteria:** All existing tests pass + new UID tests pass

---

### Week 3: LinkedIn E2E Testing (12-16 hours)

#### Task 3.1: Update E2E Test 1 - Job Search
**File:** `tests/e2e/01-job-search-extract.ts`

```typescript
// Before: CSS selector-based (fragile)
await click({
  selector: 'input[aria-label="Search job titles or companies"]',
}, DOMAIN);

// After: CDP UID-based (reliable)
const snapshot = await cdpSnapshot(DOMAIN);
const searchInput = snapshot.nodes.find(n =>
  n.role.value === 'textbox' &&
  n.name.value.includes('Search job titles')
);
await clickByUID({ uid: searchInput.nodeId }, DOMAIN);
```

**Test:** Run full E2E test on LinkedIn
**Completion Criteria:** All 20 jobs extracted successfully

---

#### Task 3.2: Update E2E Test 2 - Connection Requests
**File:** `tests/e2e/02-connection-requests.ts`

```typescript
// Use CDP to find connect buttons reliably
const snapshot = await cdpSnapshot(DOMAIN);
const connectButtons = snapshot.nodes.filter(n =>
  n.role.value === 'button' &&
  n.name.value.includes('Connect with')
);

for (const btn of connectButtons.slice(0, 10)) {
  await clickByUID({ uid: btn.nodeId }, DOMAIN);
  await waitFor(2000); // Rate limiting
}
```

**Test:** Run full E2E test (send 10 connection requests)
**Completion Criteria:** All 10 requests sent successfully

---

#### Task 3.3: Update E2E Test 3 - Profile Analysis
**File:** `tests/e2e/03-profile-analysis.ts`

```typescript
// Extract profile data using CDP accessibility tree
const snapshot = await cdpSnapshot(DOMAIN, { verbose: true });

const profileData = {
  name: findNode(snapshot, 'heading', 'level', 1)?.name.value,
  headline: findNode(snapshot, 'text', 'headline')?.name.value,
  about: findNode(snapshot, 'text', 'About')?.description?.value,
  experience: findNodes(snapshot, 'listitem', 'Experience section')
    .map(node => extractExperience(node)),
  skills: findNodes(snapshot, 'listitem', 'Skills')
    .map(node => node.name.value)
};
```

**Test:** Analyze 50 profiles and generate report
**Completion Criteria:** All data extracted, 12K+ word report generated

---

### Week 4: Polish & Documentation (8-12 hours)

#### Task 4.1: Performance Optimization

**Caching:**
```typescript
// Cache accessibility tree for 5 seconds to reduce CDP calls
const treeCache = new Map<string, { tree: AccessibilityTree; timestamp: number }>();

export async function getAccessibilityTree(domain: string): Promise<AccessibilityTree> {
  const cached = treeCache.get(domain);
  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached.tree;
  }

  const tree = await fetchAccessibilityTree(domain);
  treeCache.set(domain, { tree, timestamp: Date.now() });
  return tree;
}
```

**Batch Operations:**
```typescript
// Click multiple UIDs in one CDP session
export async function clickMultiple(uids: string[], domain: string): Promise<void> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const tree = await getAccessibilityTree(domain);

  for (const uid of uids) {
    const node = tree.nodeMap.get(uid);
    if (node) {
      await clickNode(node, cdpSession);
    }
  }
}
```

**Test:** Benchmark vs Chrome DevTools MCP
**Completion Criteria:** < 10% performance overhead vs Chrome DevTools MCP

---

#### Task 4.2: Error Handling & Validation

```typescript
export class AccessibilityError extends Error {
  constructor(
    message: string,
    public readonly nodeId?: string,
    public readonly domain?: string
  ) {
    super(message);
    this.name = 'AccessibilityError';
  }
}

// Validate UID format
function validateUID(uid: string): void {
  if (!uid.match(/^AX_\d+$/)) {
    throw new AccessibilityError(`Invalid UID format: ${uid}`);
  }
}

// Retry logic for flaky operations
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Should not reach here');
}
```

**Test:** Adversarial testing with invalid UIDs, disconnected sessions
**Completion Criteria:** Graceful error messages, no crashes

---

#### Task 4.3: Documentation

**Update README-MCP.md:**
```markdown
## New in Phase 1.5: CDP Accessibility Support

### Enhanced browser_snapshot Tool

Now returns rich accessibility tree with UIDs:

```typescript
const snapshot = await browser_snapshot({
  domain: 'linkedin.com',
  mode: 'cdp'  // Use CDP instead of Playwright
});

// Returns nodes with UIDs
{
  nodes: [
    {
      nodeId: 'AX_123',
      role: { value: 'button' },
      name: { value: 'Connect with John Doe' }
    }
  ]
}
```

### New Tools

**browser_click_uid** - Click by accessibility UID (more reliable)
**browser_fill_uid** - Fill input by UID
**browser_query_elements** - Find elements by role/name
```

**Create CDP-GUIDE.md:**
- How to use CDP accessibility tree
- UID targeting best practices
- Troubleshooting common issues
- Migration guide from selectors to UIDs

**Test:** Documentation review
**Completion Criteria:** Clear migration path for existing users

---

## Testing Strategy

### Unit Tests (New)

**File:** `tests/unit/cdp-accessibility.test.ts`
```typescript
describe('CDP Accessibility', () => {
  test('should fetch accessibility tree', async () => {
    const tree = await getAccessibilityTree('example.com');
    expect(tree.nodes.length).toBeGreaterThan(0);
    expect(tree.nodeMap.size).toBe(tree.nodes.length);
  });

  test('should query by role', async () => {
    const buttons = await queryAccessibilityTree('example.com', 'button');
    expect(buttons.every(n => n.role.value === 'button')).toBe(true);
  });

  test('should click by UID', async () => {
    const tree = await getAccessibilityTree('example.com');
    const button = tree.nodes.find(n => n.role.value === 'button');
    await expect(clickByUID(button.nodeId, 'example.com')).resolves.not.toThrow();
  });
});
```

**Target:** 20+ unit tests, 100% coverage of CDP module

---

### Integration Tests (Updated)

**File:** `tests/integration/linkedin-navigation.test.ts`
```typescript
describe('LinkedIn Navigation with CDP', () => {
  test('should search for jobs using UID targeting', async () => {
    await navigate('https://linkedin.com/jobs', 'linkedin.com');

    const snapshot = await cdpSnapshot('linkedin.com');
    const searchBox = snapshot.nodes.find(n =>
      n.role.value === 'textbox' &&
      n.name.value.includes('Search jobs')
    );

    await fillByUID(searchBox.nodeId, 'AI Solutions Architect', 'linkedin.com');
    await pressKey('Enter', 'linkedin.com');

    // Verify results loaded
    const results = await cdpSnapshot('linkedin.com');
    const jobCards = results.nodes.filter(n =>
      n.role.value === 'listitem' &&
      n.name.value.includes('job')
    );

    expect(jobCards.length).toBeGreaterThan(0);
  });
});
```

**Target:** 15+ integration tests covering LinkedIn workflows

---

### E2E Tests (Updated)

Run existing 3 E2E tests with CDP implementation:
1. Job Search & Extract - **Target:** 20 jobs extracted
2. Connection Requests - **Target:** 10 requests sent
3. Profile Analysis - **Target:** 50 profiles analyzed, report generated

**Success Criteria:** All E2E tests pass with CDP implementation

---

## Success Criteria

### Phase 1.5 Complete When:

✅ **CDP Integration:**
- [ ] CDP session management implemented
- [ ] Accessibility tree fetching works on all sites
- [ ] UID-based targeting system operational
- [ ] Performance within 10% of Chrome DevTools MCP

✅ **Tool Updates:**
- [ ] `browser_snapshot` returns CDP tree by default
- [ ] 3 new UID-based tools added
- [ ] Existing tools support both selectors AND UIDs
- [ ] Backward compatibility maintained (all existing tests pass)

✅ **LinkedIn E2E Tests:**
- [ ] Test 1 (Job Search) - Passes with CDP
- [ ] Test 2 (Connection Requests) - Passes with CDP
- [ ] Test 3 (Profile Analysis) - Passes with CDP
- [ ] All tests faster and more reliable than before

✅ **Documentation:**
- [ ] README-MCP.md updated
- [ ] CDP-GUIDE.md created
- [ ] Migration guide for selector → UID conversion
- [ ] Inline code documentation complete

✅ **Quality:**
- [ ] 20+ unit tests for CDP module
- [ ] 15+ integration tests for LinkedIn
- [ ] 3 E2E tests passing
- [ ] No regressions in existing functionality

---

## Timeline & Effort Estimate

| Week | Tasks | Hours | Deliverables |
|------|-------|-------|--------------|
| **Week 1** | CDP Foundation | 16-20h | CDP session mgmt, accessibility tree, UID targeting |
| **Week 2** | Tool Integration | 16-20h | Updated tools, new UID tools, backward compat |
| **Week 3** | LinkedIn E2E | 12-16h | All 3 E2E tests passing with CDP |
| **Week 4** | Polish & Docs | 8-12h | Performance, error handling, documentation |
| **Total** | | **52-68h** | **Production-ready CDP integration** |

**Calendar Time:** 3-4 weeks (assuming 15-20 hours/week)

---

## Risk Mitigation

### Risk 1: CDP API Changes
**Probability:** Low
**Impact:** High
**Mitigation:**
- Use stable CDP Accessibility domain (v1.3+)
- Abstract CDP calls behind internal API
- Add version detection and fallback

### Risk 2: Performance Overhead
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Implement tree caching (5-second TTL)
- Batch CDP operations where possible
- Profile and optimize hot paths

### Risk 3: LinkedIn A/B Tests
**Probability:** High
**Impact:** Medium
**Mitigation:**
- Use semantic queries (role + name) not UIDs directly
- Implement retry logic with exponential backoff
- Add comprehensive error messages for debugging

### Risk 4: Breaking Existing Users
**Probability:** Low
**Impact:** High
**Mitigation:**
- Maintain backward compatibility (selectors still work)
- Default to CDP mode but allow Playwright mode
- Version bump to 2.0.0 to signal major change

---

## After Phase 1.5: Return to Original Roadmap

Once CDP integration is complete, resume original plan:

### Phase 2: Testing (Original Plan)
- ✅ Unit tests (already done + CDP tests added)
- ✅ Integration tests (already done + CDP tests added)
- 🔄 Benchmark dataset (50-100 test cases)
- 🔄 LLM-as-a-Judge evaluation
- **Estimated:** 2-3 weeks

### Phase 3: Optimization (Original Plan)
- Agent Lightning RL training
- DSPy prompt optimization
- Performance tuning
- **Estimated:** 4-6 weeks

### Phase 4: Production (Original Plan + Your Additions)
- Docker containerization
- Remote deployment (HTTP + SSE transport)
- Monitoring & observability (Prometheus, Grafana)
- API management & authentication
- CI/CD pipelines
- **Estimated:** 4-8 weeks

---

## Next Steps (This Week)

### Immediate Actions

**1. Create CDP Module Structure (4 hours)**
```bash
mkdir -p src/tools/cdp
touch src/tools/cdp/accessibility.ts
touch src/tools/cdp/interaction.ts
touch src/tools/cdp/types.ts
```

**2. Implement Basic CDP Session (4 hours)**
- Add `getOrCreateCDPSession()` to browser-manager
- Test on simple page (httpbin.org)
- Verify session persistence

**3. Implement Accessibility Tree Fetching (4 hours)**
- Create `getAccessibilityTree()` function
- Parse nodes into UID-indexed map
- Test on LinkedIn search results page

**4. Build Simple UID Click (4 hours)**
- Implement `clickByUID()` function
- Test on LinkedIn "Connect" button
- Verify it works where CSS selector fails

**Goal for Week 1:**
✅ Can fetch CDP accessibility tree from LinkedIn
✅ Can click elements by UID
✅ Demonstrates superiority over CSS selectors

---

## Open Questions

1. **Caching Strategy:** How long should we cache accessibility trees?
   - **Proposal:** 5 seconds (balances freshness vs performance)

2. **UID Format:** Should we use CDP's native nodeId or create our own?
   - **Proposal:** Use native nodeId, prefix with `AX_` for clarity

3. **Backward Compatibility:** Should `browser_snapshot` default to CDP or Playwright?
   - **Proposal:** CDP (new default), but allow `mode: 'playwright'` for legacy

4. **Tool Naming:** Should new tools be `browser_click_uid` or `browser_click_by_uid`?
   - **Proposal:** `browser_click_uid` (shorter, consistent with existing naming)

5. **Error Handling:** Should we retry CDP operations automatically?
   - **Proposal:** Yes, 3 retries with exponential backoff (1s, 2s, 4s)

---

## Conclusion

**Phase 1.5 is a critical fix** that unblocks all LinkedIn automation use cases. Once complete, your custom MCP will be:

✅ **More Powerful** - CDP accessibility tree > Playwright API
✅ **More Reliable** - UID targeting > CSS selectors
✅ **Production Ready** - Tested on real LinkedIn workflows
✅ **Future Proof** - Foundation for Agent Lightning RL training

**Timeline:** 3-4 weeks (52-68 hours)
**Risk:** Low (well-understood technology, clear implementation path)
**ROI:** High (unblocks all planned features + trace logging for ML)

Let's build this! 🚀

---

**Document Version:** 1.0
**Created:** November 3, 2025
**Status:** Phase 1.5 In Progress
**Next Review:** After Week 1 completion
