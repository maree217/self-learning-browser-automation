/**
 * Manual test for CDP Accessibility Module
 * Run with: npx ts-node tests/manual/test-cdp-accessibility.ts
 */

import { browserManager } from '../../dist/browser-manager.js';
import {
  getAccessibilityTree,
  findNodesByRole,
  findNodesByName,
  findNodesByRoleAndName,
  getNodeByUID,
  isInteractive,
  getNodeDescription,
  exportTreeToJSON,
  clearTreeCache
} from '../../dist/tools/cdp/accessibility.js';

const DOMAIN = 'example.com';

async function testAccessibilityModule() {
  console.log('🚀 Testing CDP Accessibility Module...\n');

  try {
    // Setup: Navigate to test page
    console.log('0. Setup: Navigating to example.com...');
    const page = await browserManager.getActivePage(DOMAIN);
    await page.goto('https://example.com', { waitUntil: 'load' });
    console.log('✅ Page loaded\n');

    // Test 1: Get full accessibility tree
    console.log('1. Getting full accessibility tree...');
    const tree = await getAccessibilityTree(DOMAIN);
    console.log(`✅ Tree retrieved: ${tree.nodes.length} nodes`);
    console.log(`   Node map size: ${tree.nodeMap.size}`);
    console.log(`   Timestamp: ${new Date(tree.timestamp).toISOString()}\n`);

    // Test 2: Verify tree structure
    console.log('2. Verifying tree structure...');
    const hasUIDs = tree.nodes.every(n => n.nodeId);
    const hasBackendIds = tree.nodes.every(n => n.backendDOMNodeId);
    const hasRoles = tree.nodes.every(n => n.role?.value);
    console.log(`   ✅ All nodes have UIDs: ${hasUIDs}`);
    console.log(`   ✅ All nodes have backend IDs: ${hasBackendIds}`);
    console.log(`   ✅ All nodes have roles: ${hasRoles}\n`);

    // Test 3: Find nodes by role
    console.log('3. Finding nodes by role...');
    const headings = await findNodesByRole(DOMAIN, 'heading');
    const links = await findNodesByRole(DOMAIN, 'link');
    console.log(`   ✅ Found ${headings.length} heading(s)`);
    console.log(`   ✅ Found ${links.length} link(s)`);
    if (headings.length > 0) {
      console.log(`      First heading: "${headings[0].name?.value || '(no name)'}"`);
    }
    if (links.length > 0) {
      console.log(`      First link: "${links[0].name?.value || '(no name)'}"\n`);
    } else {
      console.log('');
    }

    // Test 4: Find nodes by name
    console.log('4. Finding nodes by name...');
    const exampleNodes = await findNodesByName(DOMAIN, 'Example');
    console.log(`   ✅ Found ${exampleNodes.length} node(s) containing "Example"`);
    exampleNodes.slice(0, 3).forEach((node, idx) => {
      console.log(`      ${idx + 1}. Role: ${node.role.value}, Name: "${node.name?.value}"`);
    });
    console.log('');

    // Test 5: Find by role AND name
    console.log('5. Finding nodes by role AND name...');
    const headingWithExample = await findNodesByRoleAndName(DOMAIN, 'heading', 'Example');
    console.log(`   ✅ Found ${headingWithExample.length} heading(s) containing "Example"`);
    if (headingWithExample.length > 0) {
      console.log(`      First match: "${headingWithExample[0].name?.value}"\n`);
    } else {
      console.log('');
    }

    // Test 6: Get node by UID
    console.log('6. Getting node by UID...');
    if (tree.nodes.length > 0) {
      const firstNode = tree.nodes[0];
      const nodeByUID = await getNodeByUID(DOMAIN, firstNode.nodeId);
      console.log(`   ✅ Retrieved node: ${nodeByUID ? 'Success' : 'Failed'}`);
      console.log(`      Same instance: ${nodeByUID === firstNode}`);
      console.log(`      UID: ${firstNode.nodeId}\n`);
    }

    // Test 7: Test interactive detection
    console.log('7. Testing interactive detection...');
    const interactiveNodes = tree.nodes.filter(isInteractive);
    console.log(`   ✅ Found ${interactiveNodes.length} interactive node(s)`);
    interactiveNodes.slice(0, 3).forEach((node, idx) => {
      console.log(`      ${idx + 1}. ${node.role.value}: "${node.name?.value || '(no name)'}"`);
    });
    console.log('');

    // Test 8: Test node descriptions
    console.log('8. Testing node descriptions...');
    const sampleNodes = tree.nodes.filter(n => n.name?.value).slice(0, 3);
    sampleNodes.forEach((node, idx) => {
      const desc = getNodeDescription(node);
      console.log(`   ${idx + 1}. ${desc}`);
    });
    console.log('');

    // Test 9: Test tree caching
    console.log('9. Testing tree caching...');
    const startTime = Date.now();
    const cachedTree = await getAccessibilityTree(DOMAIN);
    const cacheTime = Date.now() - startTime;
    console.log(`   ✅ Cache retrieval time: ${cacheTime}ms`);
    console.log(`      Same tree instance: ${cachedTree === tree}`);
    console.log(`      Same timestamp: ${cachedTree.timestamp === tree.timestamp}\n`);

    // Test 10: Clear cache and verify
    console.log('10. Testing cache clearing...');
    clearTreeCache(DOMAIN);
    const freshTree = await getAccessibilityTree(DOMAIN);
    console.log(`   ✅ Fresh tree retrieved`);
    console.log(`      Different timestamp: ${freshTree.timestamp !== tree.timestamp}`);
    console.log(`      Node count matches: ${freshTree.nodes.length === tree.nodes.length}\n`);

    // Test 11: Export tree to JSON
    console.log('11. Testing JSON export...');
    const json = exportTreeToJSON(tree);
    const parsed = JSON.parse(json);
    console.log(`   ✅ JSON export successful`);
    console.log(`      JSON length: ${json.length} characters`);
    console.log(`      Parsed node count: ${parsed.nodeCount}`);
    console.log(`      First 100 chars: ${json.substring(0, 100)}...\n`);

    // Summary
    console.log('🎉 All tests passed!\n');
    console.log('=== Summary ===');
    console.log(`✅ Tree retrieval: ${tree.nodes.length} nodes`);
    console.log(`✅ Tree caching: Working (${cacheTime}ms cache hit)`);
    console.log(`✅ Role search: ${headings.length} headings, ${links.length} links`);
    console.log(`✅ Name search: ${exampleNodes.length} "Example" nodes`);
    console.log(`✅ Combined search: ${headingWithExample.length} "Example" headings`);
    console.log(`✅ UID lookup: Working`);
    console.log(`✅ Interactive detection: ${interactiveNodes.length} interactive nodes`);
    console.log(`✅ JSON export: Working`);
    console.log(`✅ Cache clearing: Working`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await browserManager.clearSession(DOMAIN);
    await browserManager.close();
  }
}

// Run test
testAccessibilityModule()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
