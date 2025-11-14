# Claude Skills for Social Browser MCP

This directory contains Claude skills (custom commands) for LinkedIn automation and analysis.

## Available Skills

### linkedin-profile-search

**Purpose:** Systematically search and analyze 50 LinkedIn profiles based on any search criteria.

**Usage:**
```
linkedin-profile-search [search criteria]
```

**Examples:**
```
linkedin-profile-search Data Scientists in San Francisco
linkedin-profile-search Product Managers at FAANG companies
linkedin-profile-search DevOps Engineers with Kubernetes experience
linkedin-profile-search Chief Technology Officers in London
linkedin-profile-search Full Stack Developers with React experience
linkedin-profile-search AI Solutions Architect
```

**What It Does:**
1. Navigates to LinkedIn People Search with your criteria
2. Collects data from 50 profiles across 5 pages
3. Deep dives into 3-5 representative profiles
4. Analyzes patterns in:
   - Headlines and personal branding
   - Skills and technology stacks
   - Career progression paths
   - Companies and industries
   - Geographic distribution
   - Network patterns
5. Generates comprehensive 12,000-20,000 word analysis report

**Output:**
- Main report: `/tests/e2e/output/[search-slug]-profile-analysis.md`
- Includes:
  - Executive summary
  - Demographic analysis
  - Company & industry breakdown
  - Headline pattern analysis (5-7 patterns)
  - Detailed profile deep dives
  - Skills & technology trends
  - Career progression patterns
  - Profile optimization recommendations
  - Industry trends & future outlook
  - Actionable checklists

**Report Sections (15 major sections):**
1. Executive Summary
2. Demographic & Geographic Analysis
3. Company & Industry Analysis
4. Profile Headline Analysis
5. Detailed Profile Deep Dives (3-5 profiles)
6. Skills & Technology Stack Analysis
7. Career Progression Patterns
8. Industry-Specific Insights
9. Headline Optimization Recommendations
10. Networking & Personal Branding Insights
11. Certifications & Continuous Learning
12. Profile Optimization Recommendations
13. Common Profile Mistakes to Avoid
14. Industry Trends & Future Outlook
15. Action Items & Conclusion

**Requirements:**
- Must be logged in to LinkedIn
- Browser MCP or Chrome DevTools MCP available
- Sufficient context window (will use ~90K tokens)

**Rate Limiting:**
- 3-second delays between pages
- Respects LinkedIn's terms of service
- Analysis only (no connection requests or messages)

**Typical Execution Time:**
- 10-15 minutes for full analysis
- Depends on page load times and profile complexity

## How to Use Skills

### Method 1: Direct Invocation (Recommended)
In your Claude Code conversation:
```
linkedin-profile-search Product Managers in New York
```

### Method 2: Via Skill Tool
If direct invocation doesn't work:
```
Use the Skill tool with command: "linkedin-profile-search"
Then provide: "Product Managers in New York"
```

## Customizing Skills

Skills are markdown files in `.claude/skills/`. To create a new skill:

1. Create a new `.md` file in this directory
2. Write detailed instructions for Claude to follow
3. Use the format:
   ```markdown
   # Skill Name

   [Clear description of what the skill does]

   ## Input Parameter
   [What the user will provide]

   ## Task Overview
   [High-level steps]

   ## Execution Steps
   [Detailed step-by-step instructions]

   ## Output
   [What will be created]
   ```

## Example Workflow

**Scenario:** You want to understand the competitive landscape for "Growth Marketing Managers in Austin, Texas"

**Step 1:** Invoke the skill
```
linkedin-profile-search Growth Marketing Managers in Austin Texas
```

**Step 2:** Claude will:
- Navigate to LinkedIn
- Search for profiles
- Collect data from 50 profiles
- Deep dive into 3-5 profiles
- Analyze patterns
- Generate comprehensive report

**Step 3:** Review the report
```
Open /tests/e2e/output/growth-marketing-managers-austin-texas-profile-analysis.md
```

**Step 4:** Use insights for:
- Optimizing your own LinkedIn profile
- Understanding competitive landscape
- Identifying hiring trends
- Benchmarking skills and experience
- Crafting better job descriptions
- Targeting networking efforts

## Tips for Best Results

### Search Query Best Practices

**Good queries:**
✅ "Data Engineers with Snowflake experience in Denver"
✅ "VP of Engineering at Series B startups"
✅ "Technical Recruiters specializing in AI roles"
✅ "Blockchain Developers in Singapore"

**Poor queries:**
❌ "Jobs" (too generic)
❌ "People" (no specificity)
❌ "abc123" (nonsense query)

### Maximizing Insight Quality

1. **Be specific:** Include role, skills, or location
2. **Use LinkedIn terminology:** Match how people describe themselves
3. **Target 50+ results:** Skill works best with robust dataset
4. **Review representative profiles:** Check that search returns expected profiles

### Common Use Cases

1. **Job Search Preparation**
   - Search: "Data Scientists at Google"
   - Use: Understand what skills/experience Google looks for

2. **Career Transition Research**
   - Search: "Software Engineers who became Product Managers"
   - Use: Identify common transition paths and skills

3. **Competitive Analysis**
   - Search: "AI Solutions Architects in your city"
   - Use: Benchmark your profile against competitors

4. **Hiring & Recruiting**
   - Search: "Senior Backend Engineers with Go experience"
   - Use: Understand market, craft job descriptions, set salary

5. **Market Research**
   - Search: "Sustainability Officers at Fortune 500 companies"
   - Use: Understand emerging roles and requirements

6. **Networking Strategy**
   - Search: "Venture Capitalists in San Francisco"
   - Use: Identify common backgrounds, shared connections, interests

## Technical Details

**Browser Tools Used:**
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__take_snapshot`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__wait_for`

**Data Extraction:**
- Parses LinkedIn accessibility tree
- Extracts structured data from search results
- Deep dives into individual profile pages
- Handles pagination automatically

**Error Handling:**
- Gracefully handles missing profiles
- Adds delays to avoid rate limiting
- Skips profiles that fail to load
- Reports limitations in final output

## Troubleshooting

### "Please log in to LinkedIn"
**Solution:** Open LinkedIn in your browser, log in, then retry the skill.

### "Search returned < 50 profiles"
**Solution:** The skill will analyze all available profiles and note the limitation in the report.

### "Browser context closed"
**Solution:** The skill will attempt to reconnect. If it fails, retry from the beginning.

### "Rate limiting detected"
**Solution:** The skill includes automatic 3-second delays. If you still hit limits, wait 15 minutes before retrying.

## Advanced Usage

### Combine Multiple Searches

To analyze multiple related searches:
```
linkedin-profile-search Data Scientists in San Francisco
linkedin-profile-search Data Scientists in New York
linkedin-profile-search Data Scientists in Seattle
```

Then compare the three reports to identify geographic differences in skills, companies, compensation, etc.

### Track Changes Over Time

Run the same search monthly to track:
- Emerging skills
- Company hiring trends
- Headline evolution
- Market saturation

### Segment Analysis

Break down a broad search into segments:
```
linkedin-profile-search Junior Data Scientists
linkedin-profile-search Senior Data Scientists
linkedin-profile-search Principal Data Scientists
```

Compare career progression at different levels.

## Privacy & Ethics

**This skill:**
✅ Only extracts publicly visible information
✅ Does not send connection requests
✅ Does not message people
✅ Respects LinkedIn's terms of service
✅ Adds delays to avoid rate limiting
✅ Is for research and analysis purposes only

**Do not use this skill to:**
❌ Spam people with messages
❌ Scrape private information
❌ Violate LinkedIn's terms of service
❌ Harass or stalk individuals
❌ Collect data for sale or commercial scraping

**Best practices:**
- Use for legitimate research and career development
- Respect people's privacy
- Don't share sensitive information from profiles
- Follow LinkedIn's terms of service
- Be a good digital citizen

## Feedback & Improvements

Found a bug or have a suggestion?

1. Check the skill file at `.claude/skills/linkedin-profile-search.md`
2. Modify the instructions to improve accuracy
3. Test your changes
4. Document what worked/didn't work

## Version History

**v1.0** (November 3, 2025)
- Initial release
- 50 profile analysis
- 3-5 deep dives
- 15 major report sections
- Comprehensive pattern analysis
- Optimization recommendations
