# Browser MCP: Evaluation & Azure Deployment Plan
## Comprehensive Strategy Based on Industry Best Practices

**Document Date**: November 3, 2025
**Status**: Phase 2 Complete → Phase 3 (Deployment) Planning
**Based On**: Agent Lightning, Claude Cookbooks, Azure AI Foundry, Cloud Cost Analysis

---

## Executive Summary

We have a **production-ready Browser MCP server** (9.5/10 quality score) that needs:

1. **Evaluation refinement** using industry best practices
2. **Containerization** for portable deployment
3. **Azure deployment** with cost optimization
4. **Optional future**: Custom agent with RL training

This plan synthesizes 4 key documents to create a practical roadmap.

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Evaluation Approach Selection](#evaluation-approach-selection)
3. [Containerization Strategy](#containerization-strategy)
4. [Azure Deployment Architecture](#azure-deployment-architecture)
5. [Cost Optimization Plan](#cost-optimization-plan)
6. [Future: Custom Agent with RL Training](#future-custom-agent-with-rl-training)
7. [Implementation Timeline](#implementation-timeline)

---

## Current State Assessment

### What We Have Built

**Browser MCP Server** - 33 tools for browser automation:
- ✅ Core MCP server with 20 tools
- ✅ CDP integration with 11 tools
- ✅ Per-domain session persistence
- ✅ Comprehensive trace logging (JSON Lines)
- ✅ Unit tests (37/37 passing)
- ✅ Benchmark dataset (28 tests, 96.4% passing)
- ✅ LLM-as-a-Judge evaluation (9.5/10 overall)

**Current Deployment**: Local development only
**Current Evaluation**: Rule-based LLM-as-a-Judge (works, but can be improved)
**Current Usage**: Via Claude Code (deterministic MCP tools)

### Gap Analysis

| Area | Current State | Industry Best Practice | Gap |
|------|---------------|------------------------|-----|
| **Evaluation** | Rule-based scoring (9.8/10 correctness) | Multi-paradigm (code/model/human) | Missing human eval, no Promptfoo |
| **Deployment** | Local only | Containerized, cloud-deployed | Not containerized, not in cloud |
| **Cost Tracking** | Basic trace logging | Real-time cost tracking + budgets | No real-time tracking |
| **Observability** | JSONL logs | OpenTelemetry + dashboards | No structured observability |
| **Testing** | 28 benchmark tests | 50-100 comprehensive tests | Need more edge cases |
| **Optimization** | None | Prompt caching, batch processing | Not applicable (MCP tools are deterministic) |

---

## Evaluation Approach Selection

### From Claude Cookbooks: Three Evaluation Paradigms

Based on `CLAUDE_COOKBOOKS_VS_AZURE_AI_FOUNDRY_COMPARISON.md`, we should implement:

#### 1. Code-Based Grading (Already Implemented ✅)

**Current implementation** in `src/evaluation/judges/`:
```typescript
// Correctness Judge
if (test.status === 'failed') score -= 5;
if (test.error) score -= 3;
if (expected.status !== actual.status) score -= 4;
```

**Cost**: $0 (instant)
**Accuracy**: High for deterministic tasks
**Keep**: ✅ This works well for our use case

---

#### 2. Model-Based Grading (Enhance Current Implementation 🔄)

**Current**: Basic LLM-as-a-judge with rule-based scoring
**Industry Best Practice**: Use Claude to evaluate quality

**Enhancement Plan**:

```typescript
// src/evaluation/judges/claude-grader.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeGrader {
  private client: Anthropic;

  async gradeTestResult(
    testCase: BenchmarkTest,
    result: TestResult
  ): Promise<GradeReport> {
    const prompt = `
You are evaluating a browser automation test.

Test: ${testCase.name}
Expected: ${JSON.stringify(testCase.expected)}
Actual: ${JSON.stringify(result.actual)}

Grade on these dimensions (0-10):
1. Correctness: Did it do the right thing?
2. Efficiency: Was it optimal (tool selection, steps)?
3. Safety: Any security concerns?

Output JSON:
{
  "correctness": {"score": 0-10, "reasoning": "..."},
  "efficiency": {"score": 0-10, "reasoning": "..."},
  "safety": {"score": 0-10, "reasoning": "..."}
}
`;

    const response = await this.client.messages.create({
      model: 'claude-haiku-4',  // Fast, cheap
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    return JSON.parse(response.content[0].text);
  }
}
```

**Cost**: ~$0.30 per 1,000 evaluations (Claude Haiku)
**Benefit**: More nuanced evaluation, catches edge cases
**Action**: Implement as **optional** grader (use alongside code-based)

---

#### 3. Human Grading (Add for Edge Cases 🆕)

**Use case**: When code and model graders disagree, flag for human review

```typescript
// src/evaluation/human-review.ts
export interface HumanReviewRequest {
  testId: string;
  testName: string;
  expected: any;
  actual: any;
  codeGraderScore: number;
  modelGraderScore: number;
  flagReason: string;
}

export class HumanReviewQueue {
  private queue: HumanReviewRequest[] = [];

  async flagForReview(request: HumanReviewRequest) {
    this.queue.push(request);

    // Save to database for review UI
    await db.query(`
      INSERT INTO human_reviews (test_id, data, status)
      VALUES ($1, $2, 'pending')
    `, [request.testId, JSON.stringify(request)]);
  }

  async getNextReview(): Promise<HumanReviewRequest | null> {
    return this.queue.shift() || null;
  }
}
```

**Cost**: Manual time (only for disagreements)
**Benefit**: Catch subtle issues
**Action**: Build simple review UI

---

### Promptfoo Integration

**From Claude Cookbooks**: Use Promptfoo for orchestration

```yaml
# promptfooconfig.yaml
prompts:
  - 'Navigate to {{url}} and click {{selector}}'

providers:
  - id: 'python://browser_mcp_provider.py:BrowserMCPProvider'
    config:
      mcp_server_path: './dist/index.js'

tests:
  - vars:
      url: 'https://example.com'
      selector: 'button#submit'
    assert:
      - type: llm-rubric
        value: 'Navigation should succeed and button should be clicked'
      - type: javascript
        value: 'output.status === "success"'
```

**Benefit**:
- Visual web UI for evaluation results
- A/B testing different tool implementations
- Compare our MCP vs Chrome DevTools MCP

**Action**: Implement Promptfoo provider for Browser MCP

---

### Azure AI Foundry Integration (Optional)

**From comparison doc**: Azure has built-in evaluators

If deploying to Azure, we could use:
- **GroundednessEvaluator**: Is output grounded in reality?
- **RelevanceEvaluator**: Did it do what was asked?
- **CoherenceEvaluator**: Does the workflow make sense?

**Cost**: ~$0.005 per evaluation
**Benefit**: Fast, pre-built
**Decision**: **Skip for now** - our code-based grading works well

---

### Adversarial Testing (Red Team)

**From Azure comparison**: Red Team Agent for security testing

**Applicable to Browser MCP**:
- Test anti-bot detection bypass attempts
- Test XSS protection in `browser_evaluate`
- Test command injection in `Bash` tool
- Test path traversal in file operations

**Action**: Create adversarial test suite

```typescript
// tests/adversarial/security.test.ts
describe('Security Tests', () => {
  it('should reject XSS attempts in evaluate', async () => {
    const result = await browserMCP.browser_evaluate({
      domain: 'example.com',
      script: '<script>alert(document.cookie)</script>'
    });
    expect(result.error).toContain('Invalid JavaScript');
  });

  it('should reject path traversal in file upload', async () => {
    const result = await browserMCP.browser_upload_file({
      domain: 'example.com',
      selector: 'input[type="file"]',
      filePaths: ['../../../etc/passwd']
    });
    expect(result.error).toContain('Invalid file path');
  });
});
```

**Cost**: Free (automated)
**Action**: Add 20+ adversarial tests

---

## Evaluation Plan Summary

### Phase 3A: Enhanced Evaluation (Week 1)

| Task | Approach | Cost | Priority |
|------|----------|------|----------|
| **Implement Claude grader** | Model-based grading | $0.30/1K evals | High |
| **Add Promptfoo integration** | Orchestration framework | Free | High |
| **Build human review queue** | Manual review for edge cases | Manual time | Medium |
| **Create adversarial test suite** | Security testing | Free | High |
| **Expand benchmark to 50-100 tests** | Cover more edge cases | Free | Medium |

**Expected Outcome**: More robust evaluation, catch edge cases, security hardening

---

## Containerization Strategy

### Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Build TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build TypeScript
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy built code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create session directory
RUN mkdir -p /root/.browser-mcp/sessions

# Expose MCP server
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start MCP server
CMD ["node", "dist/index.js"]
```

**Image Size**: ~500MB (Node + Chromium)
**Build Time**: ~3 minutes
**Optimization**: Multi-stage build reduces final image size by 40%

---

### Docker Compose (Local Testing)

```yaml
# docker-compose.yml
version: '3.8'

services:
  browser-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - HEADLESS=true
      - LOG_LEVEL=info
    volumes:
      - sessions:/root/.browser-mcp/sessions
      - logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Test runner
  test-runner:
    build: .
    command: npm test
    depends_on:
      - browser-mcp

volumes:
  sessions:
  logs:
```

**Action**: Test locally before deploying to Azure

```bash
docker-compose up --build
docker-compose run test-runner
```

---

## Azure Deployment Architecture

### Option A: Cost-Optimized Azure (Recommended)

Based on `CLOUD_COST_COMPARISON_ANALYSIS.md`, avoid expensive services:

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Front Door                          │
│              (API Gateway + Load Balancer)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│           Azure Container Apps (Browser MCP)                 │
│             Cost: ~$30/month (1 vCPU, 2GB RAM)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
┌────────▼────────┐ ┌─────▼────────────────────────────────┐
│ Azure Cache for │ │ Azure Database for PostgreSQL        │
│ Redis (Basic)   │ │ (Flexible Server, Burstable B1ms)    │
│ Cost: ~$25/mo   │ │ Cost: ~$30/mo (NOT Cosmos DB)        │
└─────────────────┘ └──────────────────────────────────────┘
         │                 │
         │                 │ (pgvector extension)
         │                 │ (NOT Azure AI Search)
         │                 │
┌────────▼─────────────────▼───────────────────────────────┐
│          Azure Blob Storage (Session Backups)             │
│                Cost: ~$5/month                            │
└───────────────────────────────────────────────────────────┘

Total Cost: ~$90-100/month (vs $603 with Cosmos DB + AI Search)
```

**Key Cost Optimizations**:
1. ✅ Use **Azure Database for PostgreSQL** instead of Cosmos DB → Save $120/month
2. ✅ Use **pgvector extension** instead of Azure AI Search → Save $73/month
3. ✅ Use **Container Apps** instead of AKS → Save $70/month
4. ✅ Use **Basic tier** Redis instead of Standard → Save $35/month

**Total Savings**: $298/month (75% reduction from default Azure AI Foundry stack)

---

### Terraform Configuration (Azure Optimized)

```hcl
# infrastructure/terraform/azure/main.tf

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-rg"
  location = var.azure_region
}

# ========================================
# 1. Azure Cache for Redis (Session Memory)
# ========================================

resource "azurerm_redis_cache" "session" {
  name                = "${var.project_name}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"  # $25/month
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}

# ========================================
# 2. Azure Database for PostgreSQL (NOT Cosmos DB)
# ========================================

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${var.project_name}-postgres"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  sku_name   = "B_Standard_B1ms"  # Burstable, $30/month
  storage_mb = 32768  # 32GB
  version    = "15"

  administrator_login    = "adminuser"
  administrator_password = var.postgres_password

  backup_retention_days = 7
}

# Enable pgvector extension
resource "azurerm_postgresql_flexible_server_configuration" "pgvector" {
  name                = "azure.extensions"
  server_id           = azurerm_postgresql_flexible_server.main.id
  value               = "VECTOR"
}

# ========================================
# 3. Azure Container Apps (Browser MCP)
# ========================================

resource "azurerm_container_app_environment" "main" {
  name                = "${var.project_name}-env"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_container_app" "browser_mcp" {
  name                = "${var.project_name}-app"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name = azurerm_resource_group.main.name
  revision_mode       = "Single"

  template {
    container {
      name   = "browser-mcp"
      image  = "${var.acr_login_server}/browser-mcp:latest"
      cpu    = 1.0
      memory = "2Gi"

      env {
        name  = "REDIS_URL"
        value = "redis://${azurerm_redis_cache.session.hostname}:6380?ssl=true"
      }

      env {
        name  = "POSTGRES_URL"
        value = "postgresql://adminuser:${var.postgres_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/browser_mcp?sslmode=require"
      }

      env {
        name  = "HEADLESS"
        value = "true"
      }
    }

    min_replicas = 1
    max_replicas = 3
  }

  ingress {
    external_enabled = true
    target_port      = 3000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

# ========================================
# 4. Azure Blob Storage (Session Backups)
# ========================================

resource "azurerm_storage_account" "sessions" {
  name                     = "${var.project_name}sessions"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "backups" {
  name                  = "session-backups"
  storage_account_name  = azurerm_storage_account.sessions.name
  container_access_type = "private"
}

# ========================================
# 5. Application Insights (Observability)
# ========================================

resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  daily_data_cap_in_gb = 5  # Limit to stay in free tier
}

# ========================================
# Outputs
# ========================================

output "app_url" {
  value = "https://${azurerm_container_app.browser_mcp.ingress[0].fqdn}"
}

output "redis_hostname" {
  value = azurerm_redis_cache.session.hostname
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "instrumentation_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}
```

---

### Deployment Commands

```bash
# 1. Build and push Docker image
az acr login --name <registry-name>
docker build -t <registry>.azurecr.io/browser-mcp:latest .
docker push <registry>.azurecr.io/browser-mcp:latest

# 2. Deploy infrastructure
cd infrastructure/terraform/azure
terraform init
terraform plan -var-file="production.tfvars"
terraform apply -var-file="production.tfvars"

# 3. Verify deployment
az containerapp show \
  --name browser-mcp-app \
  --resource-group browser-mcp-rg

# 4. Check logs
az containerapp logs show \
  --name browser-mcp-app \
  --resource-group browser-mcp-rg \
  --follow
```

---

## Cost Optimization Plan

### Monthly Cost Breakdown (Optimized Azure)

| Service | Tier | Monthly Cost | Why? |
|---------|------|--------------|------|
| **Container Apps** | 1 vCPU, 2GB RAM | $30 | Serverless, auto-scale |
| **Redis Cache** | Basic C0 (250MB) | $25 | Session memory only |
| **PostgreSQL** | Flexible Server B1ms | $30 | Burstable, cost-effective |
| **Blob Storage** | LRS, <100GB | $5 | Session backups |
| **Application Insights** | 5GB daily cap | $0-15 | Free tier (5GB) |
| **Front Door** | Basic tier | $30 | API Gateway + CDN |
| **TOTAL** | | **$120-135/month** | |

**Cost per 1000 users**: $0.12-0.14/user/month
**Cost per request**: $0.001-0.002/request

**Comparison**:
- AWS equivalent: $80-100/month (20% cheaper)
- GCP equivalent: $60-80/month (40% cheaper)
- Default Azure AI Foundry: $603/month (80% more expensive)

### Why Azure Costs More (From Analysis Doc)

**3 Main Culprits**:
1. **Cosmos DB** ($150) vs PostgreSQL ($30) → We're using PostgreSQL ✅
2. **Azure AI Search** ($73) vs pgvector ($0) → We're using pgvector ✅
3. **Application Insights** ($50) vs CloudWatch ($20) → We're limiting to 5GB/day ✅

**Our Optimizations Applied**: Saved $298/month vs default Azure stack

---

### Cost Optimization Checklist

- [ ] Use PostgreSQL Flexible Server (NOT Cosmos DB)
- [ ] Enable pgvector extension (NOT Azure AI Search)
- [ ] Set Application Insights daily cap to 5GB
- [ ] Use Basic tier Redis (NOT Standard)
- [ ] Use Container Apps (NOT AKS)
- [ ] Set auto-scale min=1, max=3 (NOT always-on)
- [ ] Use managed identities (NOT Key Vault secrets, save $5/month)
- [ ] Use LRS storage (NOT GRS, save 50%)

**Expected Total Cost**: $120-135/month (vs $603 default)

---

## Future: Custom Agent with RL Training

### When to Build Custom Agent?

**Current State**: Browser MCP is deterministic tools used by Claude Code

**Future Scenario**: Build custom agent that USES the Browser MCP

```
Current:
User → Claude Code → Browser MCP Tools (deterministic)

Future:
User → Custom Agent (trainable) → Browser MCP Tools (deterministic)
```

**Only build custom agent if**:
- Need specific automation workflows (e.g., "Research 50 LinkedIn profiles every morning")
- Want to optimize agent's tool selection (RL training)
- Need custom prompt patterns not available in Claude Code

---

### Agent Lightning Integration (Optional Phase 5)

**From `AGENT_LIGHTNING_VS_PLATFORMS_COMPARISON.md`**:

**What Agent Lightning Does**:
- **APO** (Automatic Prompt Optimization): LLM critiques and improves prompts
- **RL Training**: Reinforcement learning from human feedback
- **Cost**: ~$5-10 for training with 50 tasks
- **Framework-agnostic**: Works with any agent framework

**Application to Browser MCP**:

```python
# agent/linkedin_researcher.py
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions
from agent_lightning import APO

# Define agent
class LinkedInResearcher:
    def __init__(self):
        self.system_prompt = """
You are a LinkedIn research specialist.
Use browser automation tools to research profiles.
"""

    async def research_profiles(self, query: str, count: int):
        options = ClaudeAgentOptions(
            model="claude-sonnet-4-5",
            allowed_tools=["browser_navigate", "browser_click", "browser_snapshot"],
            system_prompt=self.system_prompt
        )

        async with ClaudeSDKClient(options=options) as agent:
            result = await agent.query(
                f"Research {count} LinkedIn profiles for: {query}"
            )

        return result

# Train with Agent Lightning APO
apo = APO(
    initial_prompt=researcher.system_prompt,
    evaluation_dataset=[
        {"query": "Product Managers in Mumbai", "count": 5, "expected_profiles": 5},
        {"query": "Software Engineers in Bangalore", "count": 10, "expected_profiles": 10}
    ],
    optimization_metric="accuracy"
)

# Optimize prompt (costs ~$5-10)
optimized_prompt = apo.optimize()

# Deploy optimized agent
researcher.system_prompt = optimized_prompt
```

**When to do this**: Phase 5 (after containerization, after Azure deployment)

**Expected Improvement**: 10-20% better tool selection, faster workflows

---

## Implementation Timeline

### Phase 3A: Enhanced Evaluation (Week 1)
**Duration**: 1 week
**Cost**: $0 (all free tools)

**Tasks**:
- [ ] Day 1-2: Implement Claude model-based grader
- [ ] Day 3: Add Promptfoo integration
- [ ] Day 4: Build human review queue
- [ ] Day 5: Create adversarial test suite (20+ tests)
- [ ] Day 6-7: Expand benchmark to 50-100 tests

**Deliverable**: Enhanced evaluation framework

---

### Phase 3B: Containerization (Week 2)
**Duration**: 1 week
**Cost**: $0 (local testing)

**Tasks**:
- [ ] Day 1: Write Dockerfile (multi-stage build)
- [ ] Day 2: Write docker-compose.yml
- [ ] Day 3: Test locally (docker-compose up)
- [ ] Day 4: Optimize image size (<500MB)
- [ ] Day 5: Add health checks
- [ ] Day 6: Document deployment process
- [ ] Day 7: Push to Azure Container Registry

**Deliverable**: Production-ready Docker image

---

### Phase 3C: Azure Deployment (Week 3)
**Duration**: 1 week
**Cost**: $120-135/month

**Tasks**:
- [ ] Day 1: Write Terraform configuration
- [ ] Day 2: Set up Azure resources (Redis, PostgreSQL, Container Apps)
- [ ] Day 3: Configure networking (Front Door, private endpoints)
- [ ] Day 4: Deploy application
- [ ] Day 5: Set up Application Insights
- [ ] Day 6: Configure auto-scaling
- [ ] Day 7: Load testing and verification

**Deliverable**: Live Azure deployment

---

### Phase 3D: Production Hardening (Week 4)
**Duration**: 1 week
**Cost**: $0

**Tasks**:
- [ ] Day 1: Set up CI/CD pipeline (GitHub Actions)
- [ ] Day 2: Configure monitoring alerts
- [ ] Day 3: Implement cost tracking
- [ ] Day 4: Security audit (adversarial tests)
- [ ] Day 5: Performance optimization
- [ ] Day 6: Documentation
- [ ] Day 7: Load testing (1000 requests)

**Deliverable**: Production-ready system with monitoring

---

### Phase 4: Learning Azure Ecosystem (Ongoing)
**Duration**: Ongoing
**Cost**: $0 (learning)

**Learning Path**:
- [ ] Week 1: Azure fundamentals (Portal, Resource Groups, IAM)
- [ ] Week 2: Networking (VNet, Front Door, Private Endpoints)
- [ ] Week 3: Security (Managed Identities, Key Vault, RBAC)
- [ ] Week 4: Monitoring (Application Insights, Log Analytics, Alerts)
- [ ] Week 5: Cost Management (Cost Analysis, Budgets, Reservations)
- [ ] Week 6: DevOps (CI/CD, GitHub Actions, Azure DevOps)

**Resources**:
- Microsoft Learn: Azure Fundamentals (AZ-900)
- Microsoft Learn: Azure Administrator (AZ-104)
- Hands-on labs with deployed Browser MCP

---

### Phase 5: Custom Agent + RL Training (Optional, Future)
**Duration**: 2-3 weeks
**Cost**: $5-10 (Agent Lightning APO training)

**Only do this if**:
- Building a custom agent that uses Browser MCP
- Want to optimize agent's tool selection
- Need workflow automation (e.g., daily LinkedIn research)

**Tasks**:
- [ ] Week 1: Build custom agent with Claude SDK
- [ ] Week 2: Collect training data (50-100 examples)
- [ ] Week 3: Train with Agent Lightning APO
- [ ] Week 4: Deploy optimized agent

**Deliverable**: Optimized agent that uses Browser MCP

---

## Summary: Complete Roadmap

### Immediate Actions (Next 4 Weeks)

1. **Week 1**: Enhanced evaluation (Promptfoo, adversarial tests)
2. **Week 2**: Containerization (Docker, docker-compose)
3. **Week 3**: Azure deployment (Terraform, Container Apps)
4. **Week 4**: Production hardening (CI/CD, monitoring)

### Learning Goals (Ongoing)

- Master Azure ecosystem (Portal, Networking, Security)
- Understand cost optimization (PostgreSQL vs Cosmos DB)
- Learn monitoring (Application Insights)
- Practice DevOps (CI/CD pipelines)

### Future Enhancements (Optional)

- **Phase 5**: Custom agent with RL training (Agent Lightning)
- **Phase 6**: Multi-cloud deployment (AWS, GCP)
- **Phase 7**: Horizontal scaling (Kubernetes)

---

## Key Takeaways from 4 Documents

### 1. From Agent Lightning Comparison
✅ **Applicable**: RL training for AGENTS (not tools)
✅ **Future use**: If we build custom agent using Browser MCP
❌ **Not applicable now**: Our MCP tools are deterministic

### 2. From Claude Cookbooks vs Azure
✅ **Applicable**: Multi-paradigm evaluation (code/model/human)
✅ **Applicable**: Promptfoo orchestration
✅ **Applicable**: Adversarial testing
✅ **Applicable**: Batch processing for offline evals

### 3. From Cloud Cost Comparison
✅ **Critical**: Use PostgreSQL, NOT Cosmos DB (save $120/month)
✅ **Critical**: Use pgvector, NOT Azure AI Search (save $73/month)
✅ **Critical**: Limit Application Insights (save $35/month)
✅ **Result**: $120-135/month vs $603/month (78% savings)

### 4. From Claude SDK Implementation Guide
✅ **Future use**: Build custom agent with Claude SDK
✅ **Architecture patterns**: Multi-agent orchestration
✅ **Memory systems**: Redis + PostgreSQL + pgvector
❌ **Not applicable now**: We're building MCP server, not custom agent

---

## Next Steps

**Immediate (This Week)**:
1. Implement Claude model-based grader
2. Add Promptfoo integration
3. Create adversarial test suite

**Next Week**:
1. Write Dockerfile
2. Test locally with docker-compose
3. Push to Azure Container Registry

**Following Week**:
1. Write Terraform configuration
2. Deploy to Azure
3. Verify production deployment

**Then**:
- Learn Azure ecosystem
- Monitor costs
- Optimize based on real usage
- Consider custom agent (Phase 5) if needed

---

**Document Version**: 1.0
**Created**: November 3, 2025
**Status**: Ready for Implementation
**Estimated Timeline**: 4 weeks to production Azure deployment
**Estimated Cost**: $120-135/month (78% cheaper than default Azure AI Foundry)
