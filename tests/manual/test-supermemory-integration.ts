/**
 * Test Supermemory Integration
 * Validates that the Supermemory API key works and integration is functioning
 */
import * as dotenv from 'dotenv';

// Load .env file FIRST before importing modules
dotenv.config();

// Now import modules (they will see the env vars)
import { traceLogger } from '../../dist/src/trace-logger.js';
import { agentContext } from '../../dist/src/agent-context.js';

async function main() {
  console.log('\n🧪 Testing Supermemory Integration');
  console.log('='.repeat(60));
  console.log('');

  // Check API key is loaded
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    console.error('❌ SUPERMEMORY_API_KEY not found in environment');
    console.log('   Make sure .env file exists with the API key');
    process.exit(1);
  }

  console.log('✅ API key loaded from environment');
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log('');

  // Check if Supermemory is enabled
  if (!agentContext.isEnabled()) {
    console.error('❌ Supermemory is not enabled');
    console.log('   TraceLogger was not initialized with enableSupermemory=true');
    console.log('   This is expected - Supermemory is optional by default');
    console.log('');
    console.log('💡 To enable Supermemory:');
    console.log('   1. Modify src/index.ts to pass enableSupermemory=true');
    console.log('   2. Or use the agent context directly with API key');
    console.log('');
  } else {
    console.log('✅ Supermemory is enabled in AgentContext');
    console.log('');
  }

  // Test 1: Store a test insight
  console.log('📝 Test 1: Storing a test insight...');
  try {
    await agentContext.storeInsight(
      'test.domain.com',
      'This is a test insight to validate Supermemory integration is working correctly. ' +
      'If you can retrieve this message, the integration is successful! ' +
      'Test performed at ' + new Date().toISOString(),
      'successful_strategy',
      {
        test_timestamp: new Date().toISOString(),
        test_type: 'integration_test',
        status: 'success'
      }
    );
    console.log('✅ Insight stored successfully');
  } catch (error) {
    console.error('❌ Failed to store insight:', error);
    console.log('   This might indicate an API key issue or network problem');
  }
  console.log('');

  // Wait a moment for Supermemory to index
  console.log('⏳ Waiting 5 seconds for indexing...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');

  // Test 2: Query the insight back
  console.log('🔍 Test 2: Querying stored insights...');
  try {
    const results = await agentContext.query(
      'test insight integration validation',
      ['test.domain.com']
    );

    if (results.length > 0) {
      console.log(`✅ Retrieved ${results.length} result(s):`);
      results.slice(0, 3).forEach((result, i) => {
        console.log(`   ${i + 1}. ${result.substring(0, 80)}...`);
      });
    } else {
      console.log('⚠️  No results found (might need more time to index)');
    }
  } catch (error) {
    console.error('❌ Failed to query insights:', error);
  }
  console.log('');

  // Test 3: Test LinkedIn context retrieval
  console.log('🔍 Test 3: Testing LinkedIn context retrieval...');
  try {
    const linkedinContext = await agentContext.getLinkedInContext('test_user');
    if (linkedinContext.length > 0) {
      console.log(`✅ Retrieved ${linkedinContext.length} LinkedIn insights`);
      linkedinContext.slice(0, 3).forEach((insight, i) => {
        console.log(`   ${i + 1}. ${insight.substring(0, 80)}...`);
      });
    } else {
      console.log('ℹ️  No LinkedIn insights found yet (expected on first run)');
    }
  } catch (error) {
    console.error('❌ Failed to retrieve LinkedIn context:', error);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('✅ Supermemory Integration Test Complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - API key: ✅ Loaded from .env');
  console.log('   - Store: Test completed (check output above)');
  console.log('   - Query: Test completed (check output above)');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Run the LinkedIn Researcher Agent:');
  console.log('      npx ts-node examples/linkedin-research-example.ts');
  console.log('');
  console.log('   2. Check trace logs are being stored:');
  console.log('      tail -f logs/traces.jsonl');
  console.log('');
  console.log('   3. Query your stored insights:');
  console.log('      (Use agent context in your code)');
  console.log('');
}

// Run test
main().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
