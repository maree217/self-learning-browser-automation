/**
 * Diagnostic test for LinkedIn page structure
 * Run with: npx ts-node tests/manual/test-linkedin-diagnostic.ts
 */

import { browserManager } from '../../dist/browser-manager.js';
import { getAccessibilityTree } from '../../dist/tools/cdp/accessibility.js';

const DOMAIN = 'linkedin.com';

async function diagnosticTest() {
  console.log('🔍 LinkedIn Diagnostic Test\n');

  try {
    const page = await browserManager.getActivePage(DOMAIN);

    // Navigate to LinkedIn search
    console.log('Navigating to LinkedIn search for Product Managers in Mumbai...');
    await page.goto('https://www.linkedin.com/search/results/people/?keywords=Product%20Manager%20in%20Mumbai', {
      waitUntil: 'networkidle'
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`Current URL: ${page.url()}\n`);

    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: '/Users/rammaree/projects/social-browser-mcp/tests/manual/linkedin-page.png', fullPage: true });
    console.log('✅ Screenshot saved to tests/manual/linkedin-page.png\n');

    // Get accessibility tree
    console.log('Getting accessibility tree...');
    const tree = await getAccessibilityTree(DOMAIN);
    console.log(`✅ ${tree.nodes.length} nodes\n`);

    // Show first 20 nodes
    console.log('First 20 accessibility nodes:');
    tree.nodes.slice(0, 20).forEach((node, idx) => {
      console.log(`${idx + 1}. Role: ${node.role.value.padEnd(20)} | Name: ${node.name?.value?.substring(0, 60) || '(no name)'}`);
    });
    console.log('');

    // Check for profile links using multiple methods
    console.log('Method 1: JavaScript querySelector for a[href*="/in/"]...');
    const jsLinks = await page.evaluate(() => {
      const links = (globalThis as any).document.querySelectorAll('a[href*="/in/"]');
      return Array.from(links).slice(0, 10).map((link: any) => ({
        href: link.href,
        text: link.textContent?.trim().substring(0, 50)
      }));
    });
    console.log(`Found ${jsLinks.length} links:`);
    jsLinks.forEach((link, idx) => {
      console.log(`  ${idx + 1}. ${link.href} (${link.text})`);
    });
    console.log('');

    // Check page content
    console.log('Method 2: Checking page text content...');
    const pageText = await page.evaluate(() => {
      return (globalThis as any).document.body.textContent?.substring(0, 500);
    });
    console.log('First 500 characters of page:');
    console.log(pageText);
    console.log('');

    // Check if we need to log in
    console.log('Checking for login indicators...');
    const hasLoginForm = await page.evaluate(() => {
      const text = (globalThis as any).document.body.textContent || '';
      return text.includes('Sign in') || text.includes('Join now') || text.includes('Log in');
    });
    console.log(`Login form detected: ${hasLoginForm}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browserManager.close();
  }
}

diagnosticTest();
