import { navigate } from '../../src/tools/navigation';
import { click, fill, waitFor, type } from '../../src/tools/interaction';
import { snapshot, evaluate, getContent } from '../../src/tools/content';
import fs from 'fs';
import path from 'path';

interface JobListing {
  title: string;
  company: string;
  location: string;
  postedDate: string;
  summary: string;
  url: string;
  seniorityLevel?: string;
  employmentType?: string;
}

const OUTPUT_DIR = path.join(__dirname, 'output');
const DOMAIN = 'www.linkedin.com';

/**
 * E2E Test 1.1: Search AI Solutions Architect roles and extract to markdown
 */
export async function searchAndExtractJobs(): Promise<void> {
  console.log('🔍 Starting Job Search & Extract Test...\n');

  const startTime = Date.now();
  const jobs: JobListing[] = [];

  try {
    // Step 1: Navigate to LinkedIn Jobs
    console.log('Step 1: Navigating to LinkedIn Jobs...');
    await navigate({ url: 'https://www.linkedin.com/jobs/' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Search for "AI Solutions Architect"
    console.log('Step 2: Searching for "AI Solutions Architect"...');

    // Find and click search input
    await click({
      selector: 'input[aria-label="Search job titles or companies"]',
      button: 'left',
      clickCount: 1,
      timeout: 30000
    }, DOMAIN);

    await type({
      selector: 'input[aria-label="Search job titles or companies"]',
      text: 'AI Solutions Architect',
      delay: 50
    }, DOMAIN);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Press Enter to search
    await evaluate({
      script: `() => {
        const searchButton = document.querySelector('button[aria-label*="Search"]');
        if (searchButton) {
          searchButton.click();
          return true;
        }
        // Fallback: submit form
        const input = document.querySelector('input[aria-label="Search job titles or companies"]');
        if (input && input.form) {
          input.form.submit();
          return true;
        }
        return false;
      }`
    }, DOMAIN);

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Step 3: Waiting for search results...');

    // Step 3: Extract job listings
    console.log('Step 4: Extracting job listings...');

    const extractedJobs = await evaluate({
      script: `() => {
        const jobCards = Array.from(document.querySelectorAll('div.job-card-container, li.jobs-search-results__list-item'));

        return jobCards.slice(0, 20).map((card, index) => {
          try {
            // Extract title
            const titleEl = card.querySelector('a.job-card-list__title, h3.job-card-list__title, a[data-tracking-control-name*="job-card"]');
            const title = titleEl?.textContent?.trim() || 'N/A';

            // Extract company
            const companyEl = card.querySelector('span.job-card-container__company-name, a.job-card-container__company-name, h4.job-card-container__company-name');
            const company = companyEl?.textContent?.trim() || 'N/A';

            // Extract location
            const locationEl = card.querySelector('span.job-card-container__metadata-item, li.job-card-container__metadata-item');
            const location = locationEl?.textContent?.trim() || 'N/A';

            // Extract posted date
            const dateEl = card.querySelector('time');
            const postedDate = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || 'N/A';

            // Extract job URL
            const linkEl = card.querySelector('a[href*="/jobs/view/"]');
            const jobId = linkEl?.getAttribute('href')?.match(/\/jobs\/view\/(\d+)/)?.[1];
            const url = jobId ? \`https://www.linkedin.com/jobs/view/\${jobId}\` : 'N/A';

            // Extract summary (if available)
            const summaryEl = card.querySelector('.job-card-list__description, .job-card-container__metadata');
            const summary = summaryEl?.textContent?.trim().substring(0, 200) || 'N/A';

            return {
              title,
              company,
              location,
              postedDate,
              summary,
              url,
              seniorityLevel: 'N/A',
              employmentType: 'N/A'
            };
          } catch (error) {
            console.error('Error extracting job ' + index, error);
            return null;
          }
        }).filter(job => job !== null && job.title !== 'N/A');
      }`
    }, DOMAIN);

    if (extractedJobs.status === 'success' && extractedJobs.data) {
      jobs.push(...extractedJobs.data as JobListing[]);
      console.log(`✓ Extracted ${jobs.length} jobs from search results`);
    }

    // Step 5: Generate markdown file
    console.log('Step 5: Generating markdown file...');
    const markdown = generateMarkdown(jobs);

    const outputFile = path.join(OUTPUT_DIR, 'ai-solutions-architect-jobs.md');
    fs.writeFileSync(outputFile, markdown);

    console.log(`✓ Markdown file saved: ${outputFile}`);

    // Step 6: Generate JSON log
    const logFile = path.join(OUTPUT_DIR, 'job-search-log.json');
    fs.writeFileSync(logFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      searchQuery: 'AI Solutions Architect',
      totalJobsExtracted: jobs.length,
      executionTimeMs: Date.now() - startTime,
      jobs
    }, null, 2));

    console.log(`✓ JSON log saved: ${logFile}`);

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('✅ Job Search & Extract Test COMPLETED');
    console.log('='.repeat(60));
    console.log(`Jobs Extracted: ${jobs.length}`);
    console.log(`Execution Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log(`Output Files:`);
    console.log(`  - ${outputFile}`);
    console.log(`  - ${logFile}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Generate markdown table from job listings
 */
function generateMarkdown(jobs: JobListing[]): string {
  let markdown = `# AI Solutions Architect Jobs\n\n`;
  markdown += `**Search Date**: ${new Date().toLocaleDateString()}\n`;
  markdown += `**Total Jobs Found**: ${jobs.length}\n\n`;
  markdown += `---\n\n`;

  markdown += `## Job Listings\n\n`;
  markdown += `| # | Title | Company | Location | Posted | Summary | Link |\n`;
  markdown += `|---|-------|---------|----------|--------|---------|------|\n`;

  jobs.forEach((job, index) => {
    const title = job.title.replace(/\|/g, '\\|');
    const company = job.company.replace(/\|/g, '\\|');
    const location = job.location.replace(/\|/g, '\\|');
    const summary = job.summary.substring(0, 100).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const link = job.url !== 'N/A' ? `[View Job](${job.url})` : 'N/A';

    markdown += `| ${index + 1} | ${title} | ${company} | ${location} | ${job.postedDate} | ${summary}... | ${link} |\n`;
  });

  markdown += `\n---\n\n`;
  markdown += `## Detailed Listings\n\n`;

  jobs.forEach((job, index) => {
    markdown += `### ${index + 1}. ${job.title}\n\n`;
    markdown += `**Company**: ${job.company}\n`;
    markdown += `**Location**: ${job.location}\n`;
    markdown += `**Posted**: ${job.postedDate}\n`;
    markdown += `**Link**: [${job.url}](${job.url})\n\n`;
    markdown += `**Description**:\n${job.summary}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

// Run if called directly
if (require.main === module) {
  searchAndExtractJobs().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
