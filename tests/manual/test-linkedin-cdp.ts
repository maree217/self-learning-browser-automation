/**
 * Manual test: LinkedIn Profile Viewing with CDP
 * Test our CDP system on real LinkedIn pages
 *
 * Run with: npx ts-node tests/manual/test-linkedin-cdp.ts
 */

import { browserManager } from '../../dist/browser-manager.js';
import {
  getAccessibilityTree,
  findNodesByRole,
  findNodesByRoleAndName,
  clearTreeCache
} from '../../dist/tools/cdp/accessibility.js';
import {
  clickByUID,
  fillByUID,
  scrollToByUID,
  getAttributeByUID
} from '../../dist/tools/cdp/interaction.js';

const DOMAIN = 'www.linkedin.com';  // Use www.linkedin.com for consistent session
const SEARCH_QUERY = 'Product Manager in Mumbai';
const PROFILES_TO_OPEN = 5;

async function testLinkedInCDP() {
  console.log('🚀 Testing CDP on LinkedIn: Product Managers in Mumbai\n');
  console.log(`Search: "${SEARCH_QUERY}"`);
  console.log(`Profiles to open: ${PROFILES_TO_OPEN}\n`);

  const profileURLs: string[] = [];

  try {
    // Step 1: Navigate to LinkedIn
    console.log('1. Navigating to LinkedIn...');
    const page = await browserManager.getActivePage(DOMAIN);
    await page.goto('https://www.linkedin.com', { waitUntil: 'load' });
    console.log('✅ LinkedIn loaded\n');

    // Wait a bit for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Check if logged in
    console.log('2. Checking login status...');
    const currentURL = page.url();
    if (currentURL.includes('/login') || currentURL.includes('/uas/login')) {
      console.log('❌ Not logged in to LinkedIn');
      console.log('   Please log in manually first, then run this test again.\n');
      return;
    }
    console.log('✅ Logged in\n');

    // Step 3: Navigate to People Search
    console.log('3. Navigating to People Search...');
    await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(SEARCH_QUERY)}`, {
      waitUntil: 'load'
    });
    console.log('✅ Search page loaded\n');

    // Wait for search results to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Get accessibility tree
    console.log('4. Getting accessibility tree from search results...');
    clearTreeCache(DOMAIN); // Force fresh tree
    const tree = await getAccessibilityTree(DOMAIN);
    console.log(`✅ Retrieved ${tree.nodes.length} accessibility nodes\n`);

    // Step 5: Find profile links using CDP accessibility tree
    console.log('5. Finding profile links using CDP...');

    // Look for list items (profile cards)
    const listItems = tree.nodes.filter(node =>
      node.role.value === 'listitem' || node.role.value === 'article'
    );
    console.log(`   Found ${listItems.length} list items/articles`);

    // Look for links that contain "/in/" (LinkedIn profile URLs)
    const profileLinks = tree.nodes.filter(node => {
      if (node.role.value !== 'link') return false;

      // Check if it has a name (profile name)
      if (!node.name?.value) return false;

      // We'll need to check the actual href attribute
      return true;
    });

    console.log(`   Found ${profileLinks.length} potential profile links`);

    // Step 6: Extract profile URLs using JavaScript (more reliable for LinkedIn)
    console.log('6. Extracting profile URLs using JavaScript...');

    const urls = await page.evaluate(() => {
      const profileUrls: string[] = [];
      const links = Array.from((globalThis as any).document.querySelectorAll('a[href*="/in/"]'));

      for (const link of links) {
        const href = (link as any).href;
        if (href && href.includes('linkedin.com/in/') && !href.includes('?')) {
          const cleanURL = href.split('?')[0].replace(/\/$/, '');
          if (!profileUrls.includes(cleanURL) && !cleanURL.includes('/search/')) {
            profileUrls.push(cleanURL);
          }
        }
      }

      return profileUrls;
    });

    // Take first 5
    profileURLs.push(...urls.slice(0, PROFILES_TO_OPEN));

    profileURLs.forEach((url, idx) => {
      console.log(`   ${idx + 1}. ${url}`);
    });

    console.log(`\n✅ Collected ${profileURLs.length} profile URLs\n`);

    if (profileURLs.length === 0) {
      console.log('❌ No profile URLs found. Search results might be empty or page structure changed.\n');
      console.log('Accessibility tree structure:');
      console.log(`   Total nodes: ${tree.nodes.length}`);
      console.log(`   Links: ${tree.nodes.filter(n => n.role.value === 'link').length}`);
      console.log(`   List items: ${listItems.length}`);
      return;
    }

    // Step 7: Open profiles in parallel (5 at a time)
    console.log('7. Opening profiles in parallel tabs...\n');

    const pagesToOpen = Math.min(profileURLs.length, PROFILES_TO_OPEN);
    const openPages: any[] = [];

    // Open 5 tabs
    for (let i = 0; i < pagesToOpen; i++) {
      console.log(`   Opening tab ${i + 1}/${pagesToOpen}: ${profileURLs[i]}`);
      const newPage = await browserManager.createPage(DOMAIN);
      await newPage.goto(profileURLs[i], { waitUntil: 'load' });
      openPages.push(newPage);
    }

    console.log(`\n✅ Opened ${openPages.length} tabs\n`);

    // Step 8: Scroll each profile to trigger view
    console.log('8. Scrolling each profile (triggers profile view)...\n');
    for (let i = 0; i < openPages.length; i++) {
      console.log(`   Tab ${i + 1}: Scrolling...`);
      try {
        await openPages[i].evaluate(() => {
          (globalThis as any).window.scrollBy(0, 800);
        });
        console.log(`   ✅ Scrolled profile ${i + 1}`);
      } catch (error) {
        console.log(`   ⚠️  Could not scroll profile ${i + 1}`);
      }
    }

    console.log('');

    // Step 9: Close tabs
    console.log('9. Closing tabs...');
    for (const openPage of openPages) {
      await browserManager.closePage(DOMAIN, openPage);
    }
    console.log('✅ All tabs closed\n');

    // Summary
    console.log('🎉 Test Complete!\n');
    console.log('=== Summary ===');
    console.log(`✅ CDP accessibility tree: ${tree.nodes.length} nodes`);
    console.log(`✅ Profile URLs collected: ${profileURLs.length}`);
    console.log(`✅ Profiles viewed: ${openPages.length}`);
    console.log(`✅ Profile view notifications sent: ${openPages.length}`);
    console.log('\n💡 These people will now see you viewed their profile!');
    console.log('   Many will view you back - increasing your visibility.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // DON'T close browser - keep session persistent
    console.log('\n💾 Session preserved for future use');
    console.log('   Location: ~/.browser-mcp/sessions/www.linkedin.com/');
  }
}

// Run test
testLinkedInCDP()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
