# LinkedIn Job Search Automation Strategy
## Scoping Assessment - Past Week, UK

### Volume Analysis by Role Category

| Role Category | Jobs (Past Week) | Notes |
|---------------|------------------|-------|
| Azure Solutions Architect | 386 | Direct Azure focus |
| AI Architect | 225 | Strategic AI roles |
| AI Engineer | 1,666 | Largest volume, various levels |
| Enterprise Architect | 1,358 | Business + tech architecture |
| **TOTAL** | **~3,635** | Significant overlap likely |

### Key Findings

1. **Massive Volume**: 3,635+ jobs across your target categories in just one week
2. **Token Challenge**: At ~15K tokens per 25 detailed job descriptions, analyzing all would cost ~2.2M tokens
3. **LinkedIn Structure**:
   - Search results show ~25 jobs per page
   - Basic info visible in list view (title, company, location, salary, Easy Apply)
   - Full description loads in right panel when clicked (no page navigation needed)
   - Pagination available for browsing all results

---

## Recommended Strategy: Multi-Stage Funnel

### Stage 1: Mass Extraction (Listing Data Only)
**Goal**: Cast wide net, minimal token usage

**Process**:
- Search each role category with filters (UK, past week, remote/hybrid preferred)
- Extract **listing data only** (no full descriptions):
  - Job title
  - Company name
  - Location + work mode (Remote/Hybrid/On-site)
  - Salary range (if listed)
  - Easy Apply availability
  - Job ID/Link
  - Status (actively reviewing, applicants count)
  - Your status (viewed, saved, applied)

**Volume**: 500-1000 jobs across all categories
**Token Cost**: ~2-5K tokens per 25 jobs = **40-200K tokens total**
**Time**: 2-3 hours automated browsing

### Stage 2: Local Filtering (Zero Tokens)
**Goal**: Reduce to 150-250 jobs without using AI

**Hard Filters**:
- ❌ Exclude: Jobs you've already applied to
- ❌ Exclude: Pure "on-site" if you prefer hybrid/remote
- ❌ Exclude: Known recruiters/body shops (Tata, Cognizant, etc.) unless targeted
- ❌ Exclude: Obvious mismatches in title ("Junior", "Intern", "Trainee")
- ✅ Include: Easy Apply (faster application process)
- ✅ Include: Salary listed and meets minimum threshold
- ✅ Include: Companies you've saved or shown interest in

**Soft Filters** (scoring):
- Title contains key terms: "Lead", "Principal", "Senior", "Head of"
- Location preference match
- Company size indicators
- Promoted vs organic listings

**Result**: 150-250 jobs

### Stage 3: Deep Extraction + Analysis
**Goal**: Get full job descriptions for filtered set

**Process**:
- For each of the 150-250 filtered jobs:
  - Click into job to load full description
  - Extract:
    - Complete job description
    - Required skills & qualifications
    - Nice-to-have skills
    - Years of experience
    - Team/company culture info
    - Benefits/perks
    - Hiring manager/recruiter info (if available)

**Token Cost**: ~10-20K tokens per 25 detailed jobs = **60-200K tokens**
**Time**: 3-4 hours

### Stage 4: AI-Powered Scoring & Ranking
**Goal**: Create shortlist of top 50-100 roles

**Scoring Criteria** (weighted):
1. **Skill Match** (40%):
   - Azure/Cloud expertise alignment
   - AI/ML capability match
   - Enterprise architecture experience
   - Specific tools/platforms mentioned (Copilot, OpenAI, etc.)

2. **Seniority/Level** (20%):
   - Appropriate level (Senior/Lead/Principal/Architect)
   - Scope of influence
   - Strategic vs tactical focus

3. **Company Quality** (20%):
   - Company reputation and stage (scale-up, enterprise, etc.)
   - Tech stack modernity
   - Engineering culture indicators
   - Compensation competitiveness

4. **Role Attractiveness** (20%):
   - Growth opportunity
   - Impact potential
   - Work arrangement (remote/hybrid)
   - Team size/reporting structure

**Process**:
- Use Claude/LLM to analyze each job description against your profile
- Generate match score (0-100)
- Categorize by best-fit role type:
  - Type A: Azure Solutions Architect
  - Type B: AI Architect
  - Type C: Enterprise AI Architect
  - Type D: Hybrid roles

**Output**: Ranked list of top 50-100 jobs with scores and rationale
**Token Cost**: ~100-150K tokens for analysis
**Time**: 1-2 hours

### Stage 5: Application Preparation
**Goal**: Prepare materials for top 50 jobs

**For Each Top Job**:
1. **CV Matching**:
   - Select appropriate pre-customized CV:
     - Azure_Solutions_Architect_CV.pdf
     - AI_Architect_CV.pdf
     - Enterprise_Architect_CV.pdf
   - Minor tweaks if needed (highlight relevant projects)

2. **Cover Letter/Message**:
   - Generate tailored application message
   - Emphasize 2-3 key matching points
   - Reference specific company/role details

3. **Company Research** (using Tavily MCP):
   - Recent company news
   - Funding/growth trajectory
   - Tech stack analysis
   - LinkedIn employee connections

4. **Outreach Strategy**:
   - Find hiring manager on LinkedIn
   - Identify mutual connections
   - Craft personalized connection request
   - Prepare 2-3 conversation starters

**Token Cost**: ~50-100K tokens
**Time**: 3-4 hours

---

## Implementation Options

### Option A: Full Automation (Recommended)
**What**: Automated pipeline using this social-browser MCP + scripting

**Workflow**:
```bash
# Day 1: Mass extraction
node extract_linkedin_jobs.js --categories "Azure Solutions Architect,AI Architect,AI Engineer,Enterprise Architect" --output jobs_raw.json

# Day 2: Filter and deep-dive
node filter_jobs.js --input jobs_raw.json --output jobs_filtered.json
node extract_details.js --input jobs_filtered.json --output jobs_detailed.json

# Day 3: AI scoring
node score_jobs.js --input jobs_detailed.json --profile my_profile.json --output jobs_scored.json

# Day 4: Prepare applications
node prepare_applications.js --input jobs_scored.json --top 50 --output applications/
```

**Pros**:
- Handles Easy Apply automation
- Maintains LinkedIn session
- Can run in batches
- Complete control

**Cons**:
- Requires scripting setup
- Takes 8-12 hours total runtime

### Option B: Semi-Manual Campaign
**What**: Use this tool interactively, guided by the strategy

**Workflow**:
- **Day 1-2**: You run the searches, I extract listing data
- **Day 3**: You review filtered list, I extract details for approved subset
- **Day 4**: I run AI scoring, you review rankings
- **Day 5-7**: I help prepare applications, you submit manually

**Pros**:
- Human oversight at each stage
- Learn what works
- Flexible pacing

**Cons**:
- More manual effort
- Slower overall

### Option C: Multi-Day Batch Processing
**What**: Process one category per day, complete end-to-end

**Workflow**:
- **Monday**: Azure Solutions Architect (386 jobs → ~20 applications)
- **Tuesday**: AI Architect (225 jobs → ~15 applications)
- **Wednesday**: AI Engineer (1,666 jobs → ~30 applications)
- **Thursday**: Enterprise Architect (1,358 jobs → ~25 applications)
- **Friday**: Review all, submit top 50 overall

**Pros**:
- Focused approach
- Manageable daily token usage
- Can refine process each day

**Cons**:
- Takes full week
- May miss time-sensitive postings

---

## Token Budget Estimate

| Stage | Token Usage | Cumulative |
|-------|-------------|------------|
| Stage 1: Mass Extraction | 100K | 100K |
| Stage 2: Filtering | 0 | 100K |
| Stage 3: Deep Extraction | 150K | 250K |
| Stage 4: AI Scoring | 150K | 400K |
| Stage 5: Application Prep | 100K | 500K |
| **TOTAL** | | **~500K tokens** |

**Cost**: ~$1.50-$3.00 (at Claude API rates) for entire campaign

---

## Key Optimizations

### 1. Deduplication
- Many jobs appear in multiple searches (e.g., "AI Architect" also appears in "Enterprise Architect")
- Use job ID to deduplicate early (save ~30% of processing)

### 2. Incremental Processing
- Save progress after each stage
- Can restart if interrupted
- JSON files enable manual review/editing

### 3. Smart Pagination
- LinkedIn shows most relevant jobs first
- After first 3-5 pages (~75-125 jobs), relevance drops
- Focus on high-quality matches rather than exhaustive coverage

### 4. Parallel Research
- While extracting LinkedIn data, use Tavily MCP for company research in parallel
- Build company intelligence database

### 5. Feedback Loop
- Track which applications get responses
- Refine scoring algorithm based on success patterns
- Update filters for next batch

---

## Success Metrics

**Funnel Targets**:
- Start: 3,635 jobs available
- After Stage 1: 800 extracted
- After Stage 2: 200 filtered
- After Stage 3: 200 analyzed
- After Stage 4: 50 shortlisted
- After Stage 5: 50 applied

**Expected Outcomes**:
- Applications: 50 in first week
- Interview requests: 5-10 (10-20% response rate)
- Phone screens: 3-7
- Final interviews: 2-4
- Offers: 1-2

---

## Next Steps

1. **Decide on implementation option** (A, B, or C)
2. **Set up data storage structure** (JSON files or SQLite)
3. **Prepare CV variants** (if not already done)
4. **Define hard filters** (locations to exclude, companies to avoid, etc.)
5. **Run pilot extraction** (one category, ~100 jobs) to validate approach
6. **Review pilot results** and refine
7. **Execute full campaign**

---

## Recommended: Start with Pilot

**Pilot Scope**: AI Architect (225 jobs, manageable size)

**Pilot Goals**:
1. Validate extraction scripts work
2. Test filtering criteria effectiveness
3. Calibrate AI scoring accuracy
4. Refine application templates
5. Measure time/token costs

**Pilot Timeline**: 2 days
**Pilot Output**: 10-15 high-quality applications

If pilot successful → scale to all categories
If issues → refine approach before scaling

---

## Questions to Consider

1. **Geography**: UK-only, or include Europe/US remote roles?
2. **Contract vs Permanent**: Any preference? Contract roles often less competitive
3. **Company Stage**: Startup vs scale-up vs enterprise?
4. **Salary Floor**: Minimum acceptable to filter early?
5. **Remote Flexibility**: Remote-only, or hybrid within certain distance?
6. **Start Date**: Immediate vs 1-3 months notice period?
7. **Visa Sponsorship**: Needed or you have right to work?

---

**Strategy Document Version**: 1.0
**Date**: 2025-11-09
**Status**: Ready for execution
