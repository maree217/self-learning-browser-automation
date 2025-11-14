/**
 * LinkedIn Researcher Agent - Usage Example
 * Demonstrates how to use the AI-powered LinkedIn researcher
 */
import { linkedInResearcher } from '../src/agents/linkedin-researcher.js';

async function main() {
  console.log('🚀 LinkedIn Researcher Agent Example');
  console.log('='.repeat(60));
  console.log('');

  // Example 1: Research enterprise architects in California
  console.log('Example 1: Finding Enterprise Architects in California');
  console.log('-'.repeat(60));

  const result1 = await linkedInResearcher.research({
    query: 'enterprise architect',
    targetProfiles: 10,
    location: 'California',
    role: 'Enterprise Architect',
    userId: 'example_user_123'
  });

  console.log('\n📊 Results:');
  console.log(`   Success: ${result1.success ? '✅' : '❌'}`);
  console.log(`   Profiles Found: ${result1.profilesFound}`);
  console.log(`   Profiles Viewed: ${result1.profilesViewed}`);
  console.log(`   Duration: ${result1.duration}ms`);

  if (result1.insights.length > 0) {
    console.log('\n💡 Insights:');
    result1.insights.forEach(insight => console.log(`   - ${insight}`));
  }

  if (result1.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    result1.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Example Complete!');
  console.log('');
  console.log('💡 Key Features Demonstrated:');
  console.log('   1. Agent retrieves learned context from supermemory');
  console.log('   2. Avoids known error patterns (rate limits, CAPTCHAs)');
  console.log('   3. Uses success patterns from past sessions');
  console.log('   4. Stores new learnings for future use');
  console.log('   5. Adapts delay timing based on historical data');
  console.log('');
  console.log('🎓 Agent Learning:');
  console.log('   - Each session improves future performance');
  console.log('   - Builds knowledge graph of successful strategies');
  console.log('   - Can be trained with Agent Lightning for RL optimization');
  console.log('');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
