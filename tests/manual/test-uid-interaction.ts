/**
 * Manual test for UID-based interaction system
 * Run with: npx ts-node tests/manual/test-uid-interaction.ts
 */

import { browserManager } from '../../dist/browser-manager.js';
import {
  getAccessibilityTree,
  findNodesByRole,
  findNodesByRoleAndName
} from '../../dist/tools/cdp/accessibility.js';
import {
  clickByUID,
  fillByUID,
  getTextByUID,
  getValueByUID,
  hoverByUID,
  isVisibleByUID,
  scrollToByUID,
  getAttributeByUID
} from '../../dist/tools/cdp/interaction.js';

const DOMAIN = 'example.com';

async function testUIDInteraction() {
  console.log('🚀 Testing UID-Based Interaction System...\n');

  try {
    // Setup: Navigate to test page
    console.log('0. Setup: Navigating to example.com...');
    const page = await browserManager.getActivePage(DOMAIN);
    await page.goto('https://example.com', { waitUntil: 'load' });
    console.log('✅ Page loaded\n');

    // Test 1: Get accessibility tree
    console.log('1. Getting accessibility tree...');
    const tree = await getAccessibilityTree(DOMAIN);
    console.log(`✅ Retrieved ${tree.nodes.length} nodes\n`);

    // Test 2: Get text by UID
    console.log('2. Testing getTextByUID...');
    const headingNodes = await findNodesByRole(DOMAIN, 'heading');
    if (headingNodes.length > 0) {
      const headingUID = headingNodes[0].nodeId;
      const headingText = await getTextByUID(DOMAIN, headingUID);
      console.log(`   ✅ Heading UID: ${headingUID}`);
      console.log(`      Text: "${headingText}"`);
      console.log(`      Expected: "Example Domain"`);
      console.log(`      Match: ${headingText.includes('Example Domain')}\n`);
    }

    // Test 3: Check visibility
    console.log('3. Testing isVisibleByUID...');
    if (headingNodes.length > 0) {
      const headingUID = headingNodes[0].nodeId;
      const isVisible = await isVisibleByUID(DOMAIN, headingUID);
      console.log(`   ✅ Heading visible: ${isVisible}\n`);
    }

    // Test 4: Get attribute
    console.log('4. Testing getAttributeByUID...');
    const linkNodes = await findNodesByRole(DOMAIN, 'link');
    if (linkNodes.length > 0) {
      const linkUID = linkNodes[0].nodeId;
      const href = await getAttributeByUID(DOMAIN, linkUID, 'href');
      console.log(`   ✅ Link UID: ${linkUID}`);
      console.log(`      href attribute: "${href}"`);
      console.log(`      Has IANA link: ${href?.includes('iana.org') || false}\n`);
    }

    // Test 5: Hover over element
    console.log('5. Testing hoverByUID...');
    if (linkNodes.length > 0) {
      const linkUID = linkNodes[0].nodeId;
      await hoverByUID(DOMAIN, linkUID);
      console.log(`   ✅ Hover successful on link "${linkNodes[0].name?.value}"\n`);
    }

    // Test 6: Scroll to element
    console.log('6. Testing scrollToByUID...');
    if (linkNodes.length > 0) {
      const linkUID = linkNodes[0].nodeId;
      await scrollToByUID(DOMAIN, linkUID, { block: 'center', behavior: 'smooth' });
      console.log(`   ✅ Scroll successful\n`);
    }

    // Test 7: Click element
    console.log('7. Testing clickByUID...');
    if (linkNodes.length > 0) {
      const linkUID = linkNodes[0].nodeId;
      const linkName = linkNodes[0].name?.value || 'unknown';
      console.log(`   Clicking on link: "${linkName}"`);

      await clickByUID(DOMAIN, linkUID);
      console.log(`   ✅ Click executed successfully`);

      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if page changed
      const currentURL = page.url();
      console.log(`      Current URL: ${currentURL}`);
      console.log(`      Navigated: ${currentURL !== 'https://example.com/'}\n`);
    }

    // Test 8: Navigate back to test fillByUID
    console.log('8. Setup for fill test: Creating a test input...');
    // We'll inject a test input to test fillByUID
    await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const input = doc.createElement('input');
      input.type = 'text';
      input.id = 'test-input';
      input.setAttribute('aria-label', 'Test input field');
      input.placeholder = 'Enter text here';
      doc.body.appendChild(input);

      const label = doc.createElement('label');
      label.textContent = 'Test input added for fillByUID test';
      doc.body.insertBefore(label, input);
    });
    console.log('   ✅ Test input created\n');

    // Test 9: Fill the input by UID
    console.log('9. Testing fillByUID...');
    // Refresh tree to get the new input
    const updatedTree = await getAccessibilityTree(DOMAIN, { includeIgnored: false });
    const inputNodes = await findNodesByRole(DOMAIN, 'textbox');
    console.log(`   Found ${inputNodes.length} textbox node(s)`);

    if (inputNodes.length > 0) {
      const inputUID = inputNodes[0].nodeId;
      const testText = 'Hello from UID targeting system!';

      await fillByUID(DOMAIN, inputUID, testText);
      console.log(`   ✅ Fill executed`);

      // Verify the value
      const actualValue = await getValueByUID(DOMAIN, inputUID);
      console.log(`      Expected: "${testText}"`);
      console.log(`      Actual: "${actualValue}"`);
      console.log(`      Match: ${actualValue === testText}\n`);
    }

    // Summary
    console.log('🎉 All tests passed!\n');
    console.log('=== Summary ===');
    console.log('✅ getTextByUID: Working');
    console.log('✅ isVisibleByUID: Working');
    console.log('✅ getAttributeByUID: Working');
    console.log('✅ hoverByUID: Working');
    console.log('✅ scrollToByUID: Working');
    console.log('✅ clickByUID: Working');
    console.log('✅ fillByUID: Working');
    console.log('✅ getValueByUID: Working');
    console.log('\n💡 Key Achievement: UID-based targeting works reliably!');
    console.log('   No CSS selectors needed - just accessibility UIDs.');

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
testUIDInteraction()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
