/**
 * Manual test to verify if cookies actually persist
 * Tests with real session directory
 */
import { browserManager } from '../../src/browser-manager';

async function main() {
  console.log('\n=== Checking LinkedIn Session Persistence ===\n');

  // Check what sessions exist
  const sessions = browserManager.listSessions();
  console.log(`Found ${sessions.length} saved sessions:`);
  sessions.forEach(s => console.log(`  - ${s}`));

  if (!sessions.includes('linkedin.com') && !sessions.includes('www.linkedin.com')) {
    console.log('\n❌ No LinkedIn session found. Please login to LinkedIn first.');
    process.exit(1);
  }

  const domain = sessions.includes('www.linkedin.com') ? 'www.linkedin.com' : 'linkedin.com';
  console.log(`\n📋 Loading session for: ${domain}`);

  // Load LinkedIn session
  const session = await browserManager.getSession(domain);
  const cookies = await session.context.cookies();

  console.log(`\n🍪 Cookies loaded: ${cookies.length}`);

  if (cookies.length === 0) {
    console.log('\n❌ ERROR: No cookies found! Session persistence is NOT working.');
    console.log('This means you would need to login every time.');
  } else {
    console.log('\n✅ SUCCESS: Cookies persisted correctly!');
    console.log('\nCookie details:');
    cookies.forEach((cookie, i) => {
      console.log(`  ${i + 1}. ${cookie.name} = ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain})`);
    });

    // Check for LinkedIn-specific authentication cookies
    const authCookies = cookies.filter(c =>
      c.name === 'li_at' ||  // LinkedIn auth token
      c.name === 'JSESSIONID' ||  // Session ID
      c.name === 'liap'  // LinkedIn API token
    );

    console.log(`\n🔐 Authentication cookies found: ${authCookies.length}`);
    if (authCookies.length > 0) {
      console.log('✅ LinkedIn session should be authenticated!');
      authCookies.forEach(c => {
        console.log(`  - ${c.name}`);
      });
    } else {
      console.log('⚠️  No LinkedIn auth cookies found - may need to login');
    }
  }

  await browserManager.close();
  console.log('\n=== Test Complete ===\n');
}

main().catch(console.error);
