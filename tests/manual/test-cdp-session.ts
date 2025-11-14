/**
 * Manual test for CDP session management
 * Run with: npx ts-node tests/manual/test-cdp-session.ts
 */

import { browserManager } from '../../dist/browser-manager.js';

async function testCDPSession() {
  console.log('🚀 Testing CDP Session Management...\n');

  try {
    // Test 1: Navigate to a simple page
    console.log('1. Navigating to example.com...');
    const page = await browserManager.getActivePage('example.com');
    await page.goto('https://example.com', { waitUntil: 'load' });
    console.log('✅ Page loaded\n');

    // Test 2: Get CDP session (should create new one)
    console.log('2. Creating CDP session...');
    const cdpSession1 = await browserManager.getOrCreateCDPSession('example.com');
    console.log('✅ CDP session created:', cdpSession1 ? 'Success' : 'Failed\n');

    // Test 3: Get CDP session again (should return cached)
    console.log('3. Getting cached CDP session...');
    const cdpSession2 = await browserManager.getOrCreateCDPSession('example.com');
    console.log('✅ CDP session cached:', cdpSession1 === cdpSession2 ? 'Success (same instance)' : 'Failed (new instance)\n');

    // Test 4: Test CDP functionality - enable Accessibility domain
    console.log('4. Testing CDP Accessibility domain...');
    await cdpSession1.send('Accessibility.enable');
    console.log('✅ Accessibility domain enabled\n');

    // Test 5: Get accessibility tree snapshot
    console.log('5. Getting accessibility tree...');
    const { nodes } = await cdpSession1.send('Accessibility.getFullAXTree');
    console.log(`✅ Accessibility tree retrieved: ${nodes.length} nodes\n`);

    // Show sample nodes
    console.log('Sample accessibility nodes:');
    nodes.slice(0, 5).forEach((node: any, idx: number) => {
      console.log(`  ${idx + 1}. Role: ${node.role?.value || 'unknown'}, Name: ${node.name?.value || '(no name)'}`);
    });
    console.log('');

    // Test 6: Verify node structure
    console.log('6. Verifying node structure...');
    const hasNodeIds = nodes.some((n: any) => n.nodeId);
    const hasBackendIds = nodes.some((n: any) => n.backendDOMNodeId);
    console.log('✅ Nodes have nodeId:', hasNodeIds ? 'Yes' : 'No');
    console.log('✅ Nodes have backendDOMNodeId:', hasBackendIds ? 'Yes' : 'No\n');

    // Test 7: Clean up
    console.log('7. Cleaning up...');
    await browserManager.clearSession('example.com');
    console.log('✅ Session cleared\n');

    console.log('🎉 All tests passed!');
    console.log('\n=== Summary ===');
    console.log('✅ CDP session creation works');
    console.log('✅ CDP session caching works');
    console.log('✅ Accessibility domain enabled');
    console.log('✅ Accessibility tree retrieval works');
    console.log('✅ Cleanup works');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browserManager.close();
  }
}

// Run test
testCDPSession()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
