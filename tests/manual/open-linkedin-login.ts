/**
 * Open LinkedIn in VISIBLE browser for manual login
 * Run with: npx ts-node tests/manual/open-linkedin-login.ts
 */

import { BrowserManager } from '../../dist/browser-manager.js';

const DOMAIN = 'www.linkedin.com';

async function openLinkedInForLogin() {
  console.log('🌐 Opening LinkedIn in VISIBLE browser for login...\n');

  // Create browser manager with headless=false (visible browser)
  const browserManager = new BrowserManager(undefined, false);

  try {
    console.log('1. Opening LinkedIn...');
    const page = await browserManager.getActivePage(DOMAIN);
    await page.goto('https://www.linkedin.com', { waitUntil: 'load' });
    console.log('✅ LinkedIn opened\n');

    console.log('📋 Instructions:');
    console.log('   1. Log in to LinkedIn in the browser window');
    console.log('   2. Complete any verification steps');
    console.log('   3. Wait until you see your LinkedIn feed');
    console.log('   4. Press Enter in this terminal when ready\n');

    // Wait for user to press Enter
    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

    console.log('\n✅ Login complete! Session saved.');
    console.log('   Session stored in: ~/.browser-mcp/sessions/www.linkedin.com/');
    console.log('\n🎉 You can now run LinkedIn tests without logging in again!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\nClosing browser...');
    await browserManager.close();
    process.exit(0);
  }
}

// Run
openLinkedInForLogin();
