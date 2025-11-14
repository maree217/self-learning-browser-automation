# LinkedIn Profile Search & Analysis

You are a LinkedIn profile analysis expert. Your task is to systematically search and analyze 50 LinkedIn profiles based on the user's search criteria, then generate a comprehensive analysis report.

## Input Parameter

The user will provide a search query. Examples:
- "Data Scientists in San Francisco"
- "Product Managers at FAANG companies"
- "DevOps Engineers with Kubernetes experience"
- "AI Solutions Architect" (default example)

## Task Overview

1. **Search LinkedIn** for profiles matching the search criteria
2. **Collect data** from 50 profiles across multiple pages
3. **Deep dive** into 3-5 representative profiles for detailed analysis
4. **Analyze patterns** across all profiles
5. **Generate comprehensive report** with insights and recommendations

## Execution Steps

### Step 1: Initialize Todo List

Create a todo list to track progress:
```
- Navigate to LinkedIn people search with specified criteria
- Collect profile URLs and basic data from pages 1-5 (50 profiles total)
- Visit all 50 individual profiles to trigger profile view notifications (5 parallel tabs at a time)
- Analyze patterns and insights across all profiles
- Generate comprehensive analysis report
```

### Step 2: Navigate to LinkedIn Search

Use Chrome DevTools MCP or Browser MCP to:
1. Navigate to `https://www.linkedin.com/search/results/people/?keywords=[USER_SEARCH_QUERY]`
2. Verify successful login/authentication
3. Take snapshot to confirm page loaded

### Step 3: Collect Profile Links (Pages 1-5)

For each of 5 pages:
1. Take snapshot of current page
2. Extract profile data from accessibility tree:
   - Name
   - Headline
   - **Profile URL** (most important - we'll visit these!)
   - Location
   - Current company/role
   - Connection level
3. Store profile URLs in a list
4. Click "Next" or "Page N" to navigate to next page
5. Wait for page load
6. Update todo list progress

**Result:** List of 50 profile URLs to visit

### Step 3.5: Visit Individual Profiles (Parallel Execution)

**CRITICAL:** This step triggers "profile view" notifications, increasing your visibility!

**Parallel Execution Strategy (5 tabs at once):**

For each batch of 5 profiles:
1. **Open 5 tabs in parallel:**
   - Use `mcp__chrome-devtools__new_page` to create 5 new tabs
   - Navigate each to a different profile URL
   - All 5 load simultaneously

2. **For each of the 5 tabs:**
   - Switch to tab using `select_page` (e.g., pageIdx 1, 2, 3, 4, 5)
   - Execute scroll script using `evaluate_script`:
     ```javascript
     () => { window.scrollBy(0, 800); return true; }
     ```
   - This triggers LinkedIn's profile view notification
   - **No need to extract data** - just open and scroll!

3. **Close all 5 tabs** using `close_page` and repeat with next batch

**Total batches:** 10 batches (50 profiles ÷ 5 per batch)
**Total time:** ~3-5 minutes for all 50 profiles

**Profile View Benefits:**
- ✅ Each person gets notification: "[Your Name] viewed your profile"
- ✅ Many will view you back (reciprocity principle)
- ✅ Your profile visibility increases in LinkedIn algorithm
- ✅ Potential connection requests from interested people

**Implementation Note:** The primary goal is profile visibility, not data extraction. Just opening and scrolling each profile is sufficient to trigger notifications. All analytical data should be collected from the search results pages (Step 3) and optional deep dives (Steps 4-5).

### Step 4: Select Representative Profiles for Deep Dive

From the 50 profiles collected, select 3-5 profiles that represent:
- Different seniority levels (IC, Senior, Director)
- Different company types (Big Tech, Startup, Enterprise)
- Different specializations within the search domain
- High engagement profiles (1K+ followers)

### Step 5: Deep Dive Analysis

For each selected profile:
1. Click on profile name to open full profile
2. Wait for profile page to load
3. Take detailed snapshot
4. Extract comprehensive data:
   - **About section:** Full description
   - **Experience:** All current and past roles with:
     - Company name
     - Role title
     - Duration
     - Key responsibilities/achievements
     - Skills used
   - **Education:** Degrees, institutions, years
   - **Skills:** Top skills listed
   - **Certifications:** All certifications with dates
   - **Recommendations:** Count and sample quotes
   - **Activity:** Recent posts (if visible)
   - **Languages:** Languages spoken
5. Navigate back to search results
6. Update todo list

### Step 6: Pattern Analysis

Analyze patterns across all 50 profiles:

**Demographic Patterns:**
- Geographic distribution (cities, countries)
- Connection network analysis (1st/2nd/3rd degree)
- Mutual connection patterns

**Company & Industry Patterns:**
- Top employers
- Industry sectors
- Company types (Big Tech, Startup, Enterprise, etc.)

**Headline Patterns:**
- Common headline formulas (identify 5-7 patterns)
- Most frequent keywords
- Effective vs ineffective headlines
- Emerging terminology trends

**Skills & Technology:**
- Most mentioned skills
- Emerging technologies
- Required certifications
- Tech stack patterns

**Career Progression:**
- Common career paths to this role
- Average years of experience
- Seniority distribution
- Education backgrounds

**Engagement & Branding:**
- Follower distribution
- Content creation patterns
- Thought leadership indicators
- Personal branding strategies

### Step 7: Generate Comprehensive Report

Create a markdown report at `/tests/e2e/output/[search-slug]-profile-analysis.md` with the following structure:

## Report Structure

```markdown
# [Search Query] Profile Analysis Report
## Comprehensive LinkedIn Profile Analysis

**Test Execution Date:** [Current Date]
**Search Query:** "[User's Search Query]"
**Profiles Analyzed:** 50 profiles (47 from search + 3-5 deep dives)
**Geographic Focus:** [Detected from data]
**Data Collection Method:** LinkedIn People Search + Individual Profile Reviews

---

## Executive Summary

[3-5 paragraphs summarizing key findings]

**Key Findings:**
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]
- [Bullet point 4]
- [Bullet point 5]

---

## 1. Demographic & Geographic Analysis

### 1.1 Location Distribution
[Table showing location breakdown]

### 1.2 Connection Network Analysis
[Analysis of connection degrees and network patterns]

---

## 2. Company & Industry Analysis

### 2.1 Top Employers
[Table of top companies]

### 2.2 Industry Sectors
[Breakdown by industry]

---

## 3. Profile Headline Analysis

### 3.1 Headline Patterns & Formulas
[Identify 5-7 dominant patterns with examples]

### 3.2 Most Common Keywords
[Table of keywords and frequency]

### 3.3 Emerging Terminology Trends
[Analysis of new/trending terms]

---

## 4. Detailed Profile Deep Dives

### 4.1 Profile 1: [Name]
[Comprehensive analysis including background, skills, experience, etc.]

### 4.2 Profile 2: [Name]
[Comprehensive analysis]

### 4.3 Profile 3: [Name]
[Comprehensive analysis]

[Continue for all selected profiles]

---

## 5. Skills & Technology Stack Analysis

### 5.1 Most Frequently Mentioned Skills
[Table of skills with frequency]

### 5.2 Emerging Skill Requirements
[New skills trending in 2025]

---

## 6. Career Progression Patterns

### 6.1 Common Career Paths
[Identify 3-5 typical career paths with timelines]

### 6.2 Seniority Distribution
[Table showing IC vs Senior vs Director breakdown]

---

## 7. Industry-Specific Insights

[Breakdown by major industries represented]

---

## 8. Headline Optimization Recommendations

### 8.1 Effective Headline Formulas
[Provide templates for different scenarios]

### 8.2 Keywords to Include
[SEO optimization tips]

### 8.3 Headlines to Avoid
[Anti-patterns]

---

## 9. Networking & Personal Branding Insights

### 9.1 Follower Analysis
[Distribution and patterns]

### 9.2 Mutual Connection Patterns
[Network analysis]

### 9.3 Content Creation Themes
[What top performers post about]

---

## 10. Certifications & Continuous Learning

### 10.1 Most Valuable Certifications
[List by category]

### 10.2 Learning Platforms
[Common platforms used]

---

## 11. Profile Optimization Recommendations

### 11.1 For Current Professionals
[Tips for those already in the role]

### 11.2 For Aspiring Professionals
[Career development roadmap]

---

## 12. Common Profile Mistakes to Avoid

[Headline, About, Experience, Skills mistakes with examples]

---

## 13. Industry Trends & Future Outlook

### 13.1 Emerging Trends
[Technology and business trends]

### 13.2 Skills That Will Increase in Demand
[Forward-looking analysis]

---

## 14. Action Items: Profile Optimization Checklist

### 14.1 Quick Wins (1 Hour)
[Checklist of immediate actions]

### 14.2 Medium-Term Goals (1 Week)
[Checklist of weekly goals]

### 14.3 Long-Term Strategy (Ongoing)
[Ongoing improvement strategies]

---

## 15. Conclusion & Key Takeaways

### 15.1 Summary of Findings
[Recap major insights]

### 15.2 Final Recommendations
[Actionable advice]

### 15.3 Looking Ahead
[Future predictions]

---

## Appendix: Profile Data Summary

### A.1 Complete Profile List (50 Profiles)
[Numbered list of all profiles with key details]

### A.2 Data Collection Methodology
[How data was collected and limitations]

---

## Test Execution Summary

**Status:** ✅ COMPLETED
**Profiles Analyzed:** 50
**Pages Reviewed:** 5
**Deep Dives:** [3-5]
**Report Length:** [X] words
**Output File:** `[filename].md`
```

## Output Files to Create

1. **Main Report:** `/tests/e2e/output/[search-slug]-profile-analysis.md`
   - Comprehensive 15,000+ word analysis report
   - All sections as outlined above

2. **Raw Data (Optional):** `/tests/e2e/output/[search-slug]-profiles-data.json`
   - Structured JSON with all 50 profiles
   - Useful for further analysis or processing

## Quality Standards

- **Minimum profile count:** 50 profiles from search results
- **Deep dive profiles:** 3-5 detailed analyses
- **Report length:** 12,000-20,000 words
- **Data accuracy:** Extract all available public information
- **Pattern identification:** Identify at least 5 distinct patterns
- **Actionable insights:** Provide specific, actionable recommendations

## Error Handling

If errors occur:
1. **Login required:** Inform user they need to log in to LinkedIn first
2. **Rate limiting:** Add delays between page loads (3-5 seconds)
3. **Profile not loading:** Skip and move to next profile, note in report
4. **Search returns < 50 results:** Analyze all available profiles, note limitation
5. **Browser context closed:** Re-establish connection, resume from last checkpoint

## Rate Limiting & LinkedIn Compliance

- Add 3-second delays between page navigations
- Do not click "Connect" buttons (analysis only, no actions)
- Respect LinkedIn's terms of service
- Only extract publicly visible information
- Do not store private/sensitive data

## Example Usage

**User Input:**
```
search criteria: "Machine Learning Engineers in Seattle"
```

**Expected Behavior:**
1. Navigate to LinkedIn search for "Machine Learning Engineers in Seattle"
2. Collect data from 50 profiles across 5 pages
3. Deep dive into 3-5 representative profiles
4. Analyze patterns in headlines, skills, companies, career paths
5. Generate comprehensive report at `/tests/e2e/output/machine-learning-engineers-seattle-profile-analysis.md`
6. Report includes actionable recommendations for profile optimization

## Success Criteria

✅ 50 profiles successfully analyzed
✅ 3-5 detailed profile deep dives completed
✅ Comprehensive report generated (12K+ words)
✅ All major sections included with insights
✅ Actionable recommendations provided
✅ Data patterns clearly identified
✅ Report saved to output directory

## Notes

- Use Chrome DevTools MCP (`mcp__chrome-devtools__*`) or Browser MCP (`mcp__browser-mcp__*`) tools
- Prefer Chrome DevTools for better accessibility tree parsing
- Take snapshots at each page for data extraction
- Parse accessibility tree to extract structured profile data
- Update todo list regularly to show progress
- Handle pagination carefully (Page 1, 2, 3, 4, 5 buttons)
- Save final report with descriptive filename based on search query

---

**Remember:** This is a research and analysis task. Do not send connection requests, do not message people, only extract and analyze publicly available profile information for the purpose of generating insights and recommendations.
