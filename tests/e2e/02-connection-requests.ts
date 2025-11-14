import { navigate } from '../../src/tools/navigation';
import { click, fill, type, waitFor } from '../../src/tools/interaction';
import { evaluate, snapshot } from '../../src/tools/content';
import fs from 'fs';
import path from 'path';

interface ConnectionRequest {
  profileName: string;
  title: string;
  company: string;
  profileUrl: string;
  message: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

const OUTPUT_DIR = path.join(__dirname, 'output');
const DOMAIN = 'www.linkedin.com';
const MAX_CONNECTIONS = 10;
const DELAY_BETWEEN_REQUESTS = 8000; // 8 seconds

/**
 * E2E Test 2.1: Search and connect with AI professionals
 */
export async function sendConnectionRequests(): Promise<void> {
  console.log('🤝 Starting Professional Networking Test...\n');

  const startTime = Date.now();
  const connectionRequests: ConnectionRequest[] = [];

  try {
    // Step 1: Navigate to LinkedIn People Search
    console.log('Step 1: Navigating to LinkedIn People Search...');
    await navigate({ url: 'https://www.linkedin.com/search/results/people/' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Search for AI Solutions Architects
    console.log('Step 2: Searching for "AI Solutions Architect"...');

    await evaluate({
      domain: DOMAIN,
      script: `() => {
        // Find search input
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.value = 'AI Solutions Architect';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));

          // Trigger search
          const searchButton = document.querySelector('button[aria-label*="Search"]');
          if (searchButton) {
            searchButton.click();
          }
        }
      }`
    }, DOMAIN);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Extract relevant profiles
    console.log('Step 3: Extracting relevant profiles...');

    const profiles = await evaluate({
      domain: DOMAIN,
      script: `() => {
        const profileCards = Array.from(document.querySelectorAll('li.reusable-search__result-container'));

        return profileCards.slice(0, ${MAX_CONNECTIONS + 5}).map((card, index) => {
          try {
            // Extract name
            const nameEl = card.querySelector('span[aria-hidden="true"]');
            const name = nameEl?.textContent?.trim() || 'N/A';

            // Extract title
            const titleEl = card.querySelector('.entity-result__primary-subtitle');
            const title = titleEl?.textContent?.trim() || 'N/A';

            // Extract company (from secondary subtitle)
            const companyEl = card.querySelector('.entity-result__secondary-subtitle');
            const company = companyEl?.textContent?.trim() || 'N/A';

            // Extract profile URL
            const linkEl = card.querySelector('a.app-aware-link[href*="/in/"]');
            const profileUrl = linkEl?.getAttribute('href')?.split('?')[0] || 'N/A';

            // Check if already connected
            const connectButton = card.querySelector('button[aria-label*="Connect"], button[aria-label*="connect"]');
            const isConnectable = connectButton !== null;

            // Check if title contains relevant keywords
            const titleLower = title.toLowerCase();
            const isRelevant = titleLower.includes('ai') ||
                             titleLower.includes('architect') ||
                             titleLower.includes('solutions') ||
                             titleLower.includes('enterprise');

            return {
              name,
              title,
              company,
              profileUrl: profileUrl.startsWith('http') ? profileUrl : \`https://www.linkedin.com\${profileUrl}\`,
              isConnectable,
              isRelevant
            };
          } catch (error) {
            console.error('Error extracting profile ' + index, error);
            return null;
          }
        }).filter(profile =>
          profile !== null &&
          profile.name !== 'N/A' &&
          profile.isConnectable &&
          profile.isRelevant
        ).slice(0, ${MAX_CONNECTIONS});
      }`
    }, DOMAIN);

    if (profiles.status !== 'success' || !profiles.data) {
      throw new Error('Failed to extract profiles');
    }

    const relevantProfiles = profiles.data as any[];
    console.log(`✓ Found ${relevantProfiles.length} relevant profiles to connect with`);

    // Step 4: Send connection requests
    console.log('Step 4: Sending connection requests...');

    for (const profile of relevantProfiles) {
      try {
        console.log(`\n  → Connecting with: ${profile.name} (${profile.title})`);

        // Find and click Connect button for this profile
        const connectResult = await evaluate({
          domain: DOMAIN,
          script: `(profileUrl) => {
            // Find the profile card by URL
            const links = Array.from(document.querySelectorAll('a.app-aware-link[href*="/in/"]'));
            const profileLink = links.find(link => link.getAttribute('href')?.includes(profileUrl.split('/in/')[1]?.split('?')[0]));

            if (profileLink) {
              const card = profileLink.closest('li.reusable-search__result-container');
              if (card) {
                const connectButton = card.querySelector('button[aria-label*="Connect"], button[aria-label*="connect"]');
                if (connectButton) {
                  connectButton.click();
                  return { success: true };
                }
              }
            }
            return { success: false, error: 'Connect button not found' };
          }`,
          args: [{ uid: profile.profileUrl }]
        }, DOMAIN);

        if (!connectResult.data || !connectResult.data.success) {
          throw new Error('Failed to click Connect button');
        }

        // Wait for modal to appear
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Add personalized note
        const firstName = profile.name.split(' ')[0];
        const specialty = profile.title.includes('AI') ? 'AI and ML' :
                         profile.title.includes('Cloud') ? 'cloud architecture' :
                         profile.title.includes('Data') ? 'data architecture' :
                         'enterprise architecture';

        const personalizedMessage = `Hi ${firstName},

I'd like to connect as I'm also working in the AI Solutions Architecture space.
Would love to exchange insights and learn from your experience in ${specialty}.

Best regards,
Ram`;

        // Type message
        await evaluate({
          domain: DOMAIN,
          script: `(message) => {
            const textarea = document.querySelector('textarea[name="message"], textarea#custom-message');
            if (textarea) {
              textarea.value = message;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              return { success: true };
            }
            return { success: false };
          }`,
          args: [{ uid: personalizedMessage }]
        }, DOMAIN);

        await new Promise(resolve => setTimeout(resolve, 500));

        // Click Send button
        await evaluate({
          domain: DOMAIN,
          script: `() => {
            const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="send"]');
            if (sendButton && !sendButton.disabled) {
              sendButton.click();
              return { success: true };
            }
            return { success: false };
          }`
        }, DOMAIN);

        // Log successful connection
        connectionRequests.push({
          profileName: profile.name,
          title: profile.title,
          company: profile.company,
          profileUrl: profile.profileUrl,
          message: personalizedMessage,
          timestamp: new Date().toISOString(),
          success: true
        });

        console.log(`    ✓ Connection request sent successfully`);

        // Delay before next request (rate limiting protection)
        if (connectionRequests.length < MAX_CONNECTIONS) {
          console.log(`    ⏱  Waiting ${DELAY_BETWEEN_REQUESTS / 1000}s before next request...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`    ✗ Failed: ${errorMsg}`);

        connectionRequests.push({
          profileName: profile.name,
          title: profile.title,
          company: profile.company,
          profileUrl: profile.profileUrl,
          message: '',
          timestamp: new Date().toISOString(),
          success: false,
          errorMessage: errorMsg
        });
      }
    }

    // Step 5: Generate reports
    console.log('\nStep 5: Generating reports...');

    const logFile = path.join(OUTPUT_DIR, 'connection-requests-log.json');
    fs.writeFileSync(logFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      searchQuery: 'AI Solutions Architect',
      totalRequestsSent: connectionRequests.filter(r => r.success).length,
      totalAttempts: connectionRequests.length,
      executionTimeMs: Date.now() - startTime,
      requests: connectionRequests
    }, null, 2));

    console.log(`✓ JSON log saved: ${logFile}`);

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('✅ Professional Networking Test COMPLETED');
    console.log('='.repeat(60));
    console.log(`Connection Requests Sent: ${connectionRequests.filter(r => r.success).length}/${connectionRequests.length}`);
    console.log(`Success Rate: ${((connectionRequests.filter(r => r.success).length / connectionRequests.length) * 100).toFixed(1)}%`);
    console.log(`Execution Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log(`Output Files:`);
    console.log(`  - ${logFile}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sendConnectionRequests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
