/**
 * Test session persistence across "restarts"
 * Simulates closing and reopening the application
 */
import { BrowserManager } from '../../src/browser-manager';

async function testRestart() {
  console.log('\n=== Testing Session Persistence Across Restart ===\n');

  // STEP 1: Load LinkedIn session (simulating first startup)
  console.log('STEP 1: First startup - Loading LinkedIn session...');
  const manager1 = new BrowserManager();
  const session1 = await manager1.getSession('www.linkedin.com');
  const cookies1 = await session1.context.cookies();

  console.log(`✅ Loaded ${cookies1.length} cookies in first session`);

  const authCookies1 = cookies1.filter(c => c.name === 'li_at' || c.name === 'JSESSIONID');
  console.log(`🔐 Auth cookies: ${authCookies1.length}`);

  // Close manager (simulate app shutdown)
  await manager1.close();
  console.log('📴 Manager closed (simulating app shutdown)\n');

  // STEP 2: Restart and load session again
  console.log('STEP 2: Restart - Creating new BrowserManager instance...');
  const manager2 = new BrowserManager();

  console.log('Loading LinkedIn session again...');
  const session2 = await manager2.getSession('www.linkedin.com');
  const cookies2 = await session2.context.cookies();

  console.log(`✅ Loaded ${cookies2.length} cookies in second session`);

  const authCookies2 = cookies2.filter(c => c.name === 'li_at' || c.name === 'JSESSIONID');
  console.log(`🔐 Auth cookies: ${authCookies2.length}\n`);

  // VERIFY: Cookies should be the same
  if (cookies1.length === cookies2.length && authCookies2.length > 0) {
    console.log('✅ SUCCESS: Cookies persisted across restart!');
    console.log('✅ Session fix is working correctly!');
    console.log('\nThe user should NOT need to login again.\n');
  } else {
    console.log('❌ FAILURE: Cookies did not persist correctly');
    console.log(`  First: ${cookies1.length} cookies`);
    console.log(`  Second: ${cookies2.length} cookies`);
  }

  await manager2.close();
  console.log('=== Test Complete ===\n');
}

testRestart().catch(console.error);
