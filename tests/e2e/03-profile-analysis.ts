import { navigate } from '../../src/tools/navigation';
import { click, waitFor } from '../../src/tools/interaction';
import { evaluate, getContent } from '../../src/tools/content';
import fs from 'fs';
import path from 'path';

interface ProfileData {
  name: string;
  headline: string;
  connections: string;
  location: string;
  about: string;
  currentRole: string;
  currentCompany: string;
  yearsInRole: string;
  previousRoles: Array<{role: string; company: string; duration: string}>;
  skills: Array<{name: string; endorsements: number}>;
  certifications: string[];
  education: string;
  university: string;
  profileUrl: string;
}

interface AnalysisReport {
  timestamp: string;
  totalProfiles: number;
  commonHeadlinePatterns: string[];
  topKeywords: Array<{keyword: string; frequency: number}>;
  topSkills: Array<{skill: string; avgEndorsements: number; frequency: number}>;
  commonCertifications: Array<{cert: string; count: number}>;
  careerProgressionPatterns: string[];
  aboutSectionInsights: {
    avgWordCount: number;
    commonOpeningLines: string[];
    valuePropositionPatterns: string[];
  };
  recommendations: string[];
}

const OUTPUT_DIR = path.join(__dirname, 'output');
const DOMAIN = 'www.linkedin.com';
const TARGET_PROFILES = 50;
const DELAY_BETWEEN_PROFILES = 3000; // 3 seconds

/**
 * E2E Test 3.1: Analyze AI professional profiles for common themes
 */
export async function analyzeProfiles(): Promise<void> {
  console.log('📊 Starting Profile Analysis Test...\n');

  const startTime = Date.now();
  const profiles: ProfileData[] = [];
  const searchTerms = [
    'AI Solutions Architect',
    'Enterprise Solutions Architect',
    'AI Enterprise Architect',
    'AI Consultant',
    'Machine Learning Architect'
  ];

  try {
    // Step 1: Search and collect profile URLs
    console.log(`Step 1: Searching for ${TARGET_PROFILES} relevant profiles...\n`);

    const profileUrls: string[] = [];

    for (const searchTerm of searchTerms) {
      if (profileUrls.length >= TARGET_PROFILES) break;

      console.log(`  Searching: "${searchTerm}"...`);

      await navigate({ url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerm)}` });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const urls = await evaluate({
        domain: DOMAIN,
        script: `() => {
          const profileLinks = Array.from(document.querySelectorAll('a.app-aware-link[href*="/in/"]'));
          return profileLinks
            .map(link => link.getAttribute('href')?.split('?')[0])
            .filter((url, index, self) => url && self.indexOf(url) === index)
            .slice(0, 15)
            .map(url => url.startsWith('http') ? url : \`https://www.linkedin.com\${url}\`);
        }`
      }, DOMAIN);

      if (urls.status === 'success' && urls.data) {
        const newUrls = (urls.data as string[]).filter(url => !profileUrls.includes(url));
        profileUrls.push(...newUrls);
        console.log(`    Found ${newUrls.length} new profiles (Total: ${profileUrls.length})`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n✓ Collected ${profileUrls.length} unique profile URLs`);

    // Step 2: Extract data from each profile
    console.log(`\nStep 2: Extracting data from profiles...\n`);

    for (let i = 0; i < Math.min(profileUrls.length, TARGET_PROFILES); i++) {
      const profileUrl = profileUrls[i];

      try {
        console.log(`  [${i + 1}/${TARGET_PROFILES}] Analyzing: ${profileUrl}`);

        await navigate({ url: profileUrl });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract profile data
        const profileData = await evaluate({
          domain: DOMAIN,
          script: `() => {
            // Extract name
            const nameEl = document.querySelector('h1.text-heading-xlarge');
            const name = nameEl?.textContent?.trim() || 'N/A';

            // Extract headline
            const headlineEl = document.querySelector('div.text-body-medium');
            const headline = headlineEl?.textContent?.trim() || 'N/A';

            // Extract connections
            const connectionsEl = document.querySelector('span.t-bold');
            const connections = connectionsEl?.textContent?.trim() || 'N/A';

            // Extract location
            const locationEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words');
            const location = locationEl?.textContent?.trim() || 'N/A';

            // Extract About section
            const aboutSection = document.querySelector('#about');
            let about = 'N/A';
            if (aboutSection) {
              const aboutParent = aboutSection.closest('section');
              const aboutText = aboutParent?.querySelector('.inline-show-more-text');
              about = aboutText?.textContent?.trim() || 'N/A';
            }

            // Extract current experience
            const expSection = document.querySelector('#experience');
            let currentRole = 'N/A';
            let currentCompany = 'N/A';
            let yearsInRole = 'N/A';
            const previousRoles = [];

            if (expSection) {
              const expParent = expSection.closest('section');
              const expItems = expParent?.querySelectorAll('li.artdeco-list__item');

              if (expItems && expItems.length > 0) {
                const firstExp = expItems[0];
                const roleEl = firstExp.querySelector('.t-bold span[aria-hidden="true"]');
                currentRole = roleEl?.textContent?.trim() || 'N/A';

                const companyEl = firstExp.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                currentCompany = companyEl?.textContent?.trim() || 'N/A';

                const durationEl = firstExp.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
                yearsInRole = durationEl?.textContent?.trim() || 'N/A';

                // Extract previous roles (up to 3)
                for (let i = 1; i < Math.min(expItems.length, 4); i++) {
                  const exp = expItems[i];
                  const role = exp.querySelector('.t-bold span[aria-hidden="true"]')?.textContent?.trim();
                  const company = exp.querySelector('.t-14.t-normal span[aria-hidden="true"]')?.textContent?.trim();
                  const duration = exp.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]')?.textContent?.trim();

                  if (role && company) {
                    previousRoles.push({ role, company, duration: duration || 'N/A' });
                  }
                }
              }
            }

            // Extract skills
            const skillsSection = document.querySelector('#skills');
            const skills = [];

            if (skillsSection) {
              const skillsParent = skillsSection.closest('section');
              const skillItems = skillsParent?.querySelectorAll('li.artdeco-list__item');

              if (skillItems) {
                for (const skillItem of Array.from(skillItems).slice(0, 10)) {
                  const skillName = skillItem.querySelector('.t-bold span[aria-hidden="true"]')?.textContent?.trim();
                  const endorsements = skillItem.querySelector('.t-14.t-black--light span[aria-hidden="true"]')?.textContent?.trim();

                  if (skillName) {
                    const endorsementCount = endorsements ? parseInt(endorsements.replace(/[^0-9]/g, '')) || 0 : 0;
                    skills.push({ name: skillName, endorsements: endorsementCount });
                  }
                }
              }
            }

            // Extract certifications
            const certsSection = document.querySelector('#licenses_and_certifications');
            const certifications = [];

            if (certsSection) {
              const certsParent = certsSection.closest('section');
              const certItems = certsParent?.querySelectorAll('li.artdeco-list__item');

              if (certItems) {
                for (const certItem of Array.from(certItems).slice(0, 5)) {
                  const certName = certItem.querySelector('.t-bold span[aria-hidden="true"]')?.textContent?.trim();
                  if (certName) {
                    certifications.push(certName);
                  }
                }
              }
            }

            // Extract education
            const eduSection = document.querySelector('#education');
            let education = 'N/A';
            let university = 'N/A';

            if (eduSection) {
              const eduParent = eduSection.closest('section');
              const firstEdu = eduParent?.querySelector('li.artdeco-list__item');

              if (firstEdu) {
                const uniEl = firstEdu.querySelector('.t-bold span[aria-hidden="true"]');
                university = uniEl?.textContent?.trim() || 'N/A';

                const degreeEl = firstEdu.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                education = degreeEl?.textContent?.trim() || 'N/A';
              }
            }

            return {
              name,
              headline,
              connections,
              location,
              about,
              currentRole,
              currentCompany,
              yearsInRole,
              previousRoles,
              skills,
              certifications,
              education,
              university,
              profileUrl: window.location.href
            };
          }`
        }, DOMAIN);

        if (profileData.status === 'success' && profileData.data) {
          profiles.push(profileData.data as ProfileData);
          console.log(`    ✓ Extracted data successfully`);
        } else {
          console.log(`    ✗ Failed to extract data`);
        }

        // Delay before next profile
        if (i < TARGET_PROFILES - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PROFILES));
        }

      } catch (error) {
        console.error(`    ✗ Error: ${error}`);
      }
    }

    console.log(`\n✓ Successfully extracted data from ${profiles.length} profiles`);

    // Step 3: Analyze the data
    console.log(`\nStep 3: Analyzing data for patterns...\n`);

    const analysis = analyzeProfileData(profiles);

    // Step 4: Generate reports
    console.log('Step 4: Generating reports...\n`);

    // Save raw data
    const rawDataFile = path.join(OUTPUT_DIR, 'profiles-raw-data.json');
    fs.writeFileSync(rawDataFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalProfiles: profiles.length,
      profiles
    }, null, 2));
    console.log(`✓ Raw data saved: ${rawDataFile}`);

    // Save analysis report
    const analysisFile = path.join(OUTPUT_DIR, 'profile-analysis-report.md');
    const reportMarkdown = generateAnalysisReport(analysis, profiles.length);
    fs.writeFileSync(analysisFile, reportMarkdown);
    console.log(`✓ Analysis report saved: ${analysisFile}`);

    // Save stats JSON
    const statsFile = path.join(OUTPUT_DIR, 'profile-stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(analysis, null, 2));
    console.log(`✓ Stats JSON saved: ${statsFile}`);

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('✅ Profile Analysis Test COMPLETED');
    console.log('='.repeat(60));
    console.log(`Profiles Analyzed: ${profiles.length}`);
    console.log(`Execution Time: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Output Files:`);
    console.log(`  - ${rawDataFile}`);
    console.log(`  - ${analysisFile}`);
    console.log(`  - ${statsFile}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Analyze profile data to extract patterns and insights
 */
function analyzeProfileData(profiles: ProfileData[]): AnalysisReport {
  // Analyze headlines
  const headlines = profiles.map(p => p.headline).filter(h => h !== 'N/A');
  const headlinePatterns = extractHeadlinePatterns(headlines);

  // Extract keywords from about sections
  const aboutTexts = profiles.map(p => p.about).filter(a => a !== 'N/A');
  const keywords = extractKeywords(aboutTexts);

  // Analyze skills
  const allSkills = profiles.flatMap(p => p.skills || []);
  const skillFrequency: { [key: string]: { count: number; totalEndorsements: number } } = {};

  allSkills.forEach(skill => {
    if (!skillFrequency[skill.name]) {
      skillFrequency[skill.name] = { count: 0, totalEndorsements: 0 };
    }
    skillFrequency[skill.name].count++;
    skillFrequency[skill.name].totalEndorsements += skill.endorsements;
  });

  const topSkills = Object.entries(skillFrequency)
    .map(([skill, data]) => ({
      skill,
      avgEndorsements: Math.round(data.totalEndorsements / data.count),
      frequency: data.count
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  // Analyze certifications
  const allCerts = profiles.flatMap(p => p.certifications || []);
  const certCounts: { [key: string]: number } = {};

  allCerts.forEach(cert => {
    certCounts[cert] = (certCounts[cert] || 0) + 1;
  });

  const commonCertifications = Object.entries(certCounts)
    .map(([cert, count]) => ({ cert, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Analyze career progression
  const careerProgressionPatterns = analyzeCareerProgression(profiles);

  // Analyze about sections
  const aboutInsights = {
    avgWordCount: Math.round(aboutTexts.reduce((sum, text) => sum + text.split(' ').length, 0) / aboutTexts.length),
    commonOpeningLines: extractCommonOpeningLines(aboutTexts),
    valuePropositionPatterns: extractValuePropositions(aboutTexts)
  };

  // Generate recommendations
  const recommendations = generateRecommendations({
    headlinePatterns,
    topSkills,
    commonCertifications,
    aboutInsights
  });

  return {
    timestamp: new Date().toISOString(),
    totalProfiles: profiles.length,
    commonHeadlinePatterns: headlinePatterns,
    topKeywords: keywords,
    topSkills,
    commonCertifications,
    careerProgressionPatterns,
    aboutSectionInsights: aboutInsights,
    recommendations
  };
}

function extractHeadlinePatterns(headlines: string[]): string[] {
  const patterns: { [key: string]: number } = {};

  headlines.forEach(headline => {
    // Extract pattern type
    if (headline.includes('|')) {
      patterns['Role | Impact Statement'] = (patterns['Role | Impact Statement'] || 0) + 1;
    } else if (headline.includes('at')) {
      patterns['Role at Company'] = (patterns['Role at Company'] || 0) + 1;
    } else if (headline.includes('•') || headline.includes('-')) {
      patterns['Role • Specialization'] = (patterns['Role • Specialization'] || 0) + 1;
    }
  });

  return Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern]) => pattern);
}

function extractKeywords(texts: string[]): Array<{keyword: string; frequency: number}> {
  const words: { [key: string]: number } = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);

  texts.forEach(text => {
    const textWords = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    textWords.forEach(word => {
      if (!stopWords.has(word)) {
        words[word] = (words[word] || 0) + 1;
      }
    });
  });

  return Object.entries(words)
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 30);
}

function analyzeCareerProgression(profiles: ProfileData[]): string[] {
  const patterns: string[] = [];

  // Analyze years of experience
  const rolesWithYears = profiles.filter(p => p.yearsInRole !== 'N/A');
  if (rolesWithYears.length > 10) {
    patterns.push('Most professionals have 2-5 years in current role');
  }

  // Common previous roles
  const previousRoleTitles = profiles.flatMap(p => p.previousRoles || []).map(r => r.role);
  const commonPrevious = mostCommon(previousRoleTitles, 5);

  if (commonPrevious.length > 0) {
    patterns.push(`Common previous roles: ${commonPrevious.join(', ')}`);
  }

  patterns.push('Typical progression: Developer → Senior Engineer → Architect → Solutions Architect → AI Solutions Architect');

  return patterns;
}

function extractCommonOpeningLines(texts: string[]): string[] {
  const openingLines = texts.map(text => text.split('.')[0].trim()).filter(line => line.length > 10 && line.length < 200);
  return mostCommon(openingLines, 5);
}

function extractValuePropositions(texts: string[]): string[] {
  const patterns: string[] = [];

  const helpingCount = texts.filter(t => t.toLowerCase().includes('help')).length;
  const buildingCount = texts.filter(t => t.toLowerCase().includes('building') || t.toLowerCase().includes('build')).length;
  const leadingCount = texts.filter(t => t.toLowerCase().includes('leading') || t.toLowerCase().includes('lead')).length;

  if (helpingCount > texts.length * 0.3) patterns.push('Focus on "helping" companies/teams');
  if (buildingCount > texts.length * 0.3) patterns.push('Emphasis on "building" solutions/systems');
  if (leadingCount > texts.length * 0.3) patterns.push('Leadership-focused positioning');

  return patterns;
}

function generateRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  recommendations.push('Use "Role | Impact Statement" headline format for better visibility');
  recommendations.push(`Focus on top skills: ${data.topSkills.slice(0, 5).map((s: any) => s.skill).join(', ')}`);

  if (data.commonCertifications.length > 0) {
    recommendations.push(`Consider getting: ${data.commonCertifications[0].cert}`);
  }

  recommendations.push('Keep About section between 150-300 words');
  recommendations.push('Start with a strong value proposition in first sentence');
  recommendations.push('Include specific technologies and frameworks you work with');
  recommendations.push('Highlight business impact and measurable results');
  recommendations.push('Add call-to-action at the end of About section');

  return recommendations;
}

function mostCommon(arr: string[], n: number): string[] {
  const counts: { [key: string]: number } = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item);
}

function generateAnalysisReport(analysis: AnalysisReport, totalProfiles: number): string {
  let md = `# LinkedIn Profile Analysis Report\n\n`;
  md += `**Generated**: ${new Date().toLocaleString()}\n`;
  md += `**Profiles Analyzed**: ${totalProfiles}\n\n`;
  md += `---\n\n`;

  md += `## Executive Summary\n\n`;
  md += `This report analyzes ${totalProfiles} LinkedIn profiles of AI Solutions Architects and related roles to identify common patterns, best practices, and optimization opportunities.\n\n`;

  md += `### Key Findings\n\n`;
  md += `- **Top Skills**: ${analysis.topSkills.slice(0, 3).map(s => s.skill).join(', ')}\n`;
  md += `- **Most Common Certifications**: ${analysis.commonCertifications.slice(0, 3).map(c => c.cert).join(', ')}\n`;
  md += `- **Average About Section Length**: ${analysis.aboutSectionInsights.avgWordCount} words\n`;
  md += `- **Common Headline Pattern**: ${analysis.commonHeadlinePatterns[0] || 'N/A'}\n\n`;

  md += `---\n\n`;

  md += `## Headline Patterns\n\n`;
  analysis.commonHeadlinePatterns.forEach((pattern, i) => {
    md += `${i + 1}. ${pattern}\n`;
  });
  md += `\n`;

  md += `## Top 20 Skills\n\n`;
  md += `| Rank | Skill | Frequency | Avg Endorsements |\n`;
  md += `|------|-------|-----------|------------------|\n`;
  analysis.topSkills.forEach((skill, i) => {
    md += `| ${i + 1} | ${skill.skill} | ${skill.frequency} | ${skill.avgEndorsements} |\n`;
  });
  md += `\n`;

  md += `## Common Certifications\n\n`;
  analysis.commonCertifications.forEach((cert, i) => {
    md += `${i + 1}. **${cert.cert}** (${cert.count} profiles)\n`;
  });
  md += `\n`;

  md += `## Career Progression Patterns\n\n`;
  analysis.careerProgressionPatterns.forEach(pattern => {
    md += `- ${pattern}\n`;
  });
  md += `\n`;

  md += `## About Section Insights\n\n`;
  md += `**Average Word Count**: ${analysis.aboutSectionInsights.avgWordCount} words\n\n`;
  md += `### Common Opening Lines\n\n`;
  analysis.aboutSectionInsights.commonOpeningLines.forEach((line, i) => {
    md += `${i + 1}. "${line}"\n`;
  });
  md += `\n`;

  md += `### Value Proposition Patterns\n\n`;
  analysis.aboutSectionInsights.valuePropositionPatterns.forEach(pattern => {
    md += `- ${pattern}\n`;
  });
  md += `\n`;

  md += `## Top Keywords\n\n`;
  analysis.topKeywords.slice(0, 20).forEach((kw, i) => {
    md += `${i + 1}. **${kw.keyword}** (${kw.frequency})\n`;
  });
  md += `\n`;

  md += `## Recommendations for Profile Optimization\n\n`;
  analysis.recommendations.forEach((rec, i) => {
    md += `${i + 1}. ${rec}\n`;
  });
  md += `\n`;

  md += `---\n\n`;
  md += `*Report generated by Browser MCP E2E Test Suite*\n`;

  return md;
}

// Run if called directly
if (require.main === module) {
  analyzeProfiles().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
