#!/usr/bin/env tsx

import { DataCollectionAgent } from '../agents/data-collection';
import { Flow } from '../src/pocket-flow';
import { DealState } from '../src/types';

/**
 * Manual testing script to verify the QDE Agent system
 * Run with: npx tsx examples/manual-test.ts
 */

async function testDataCollectionAgent() {
  console.log('🧪 Testing Data Collection Agent...\n');

  const initialState: DealState = {
    userRequirements: 'Create a deal with ABC Trading Company for 1000 gallons from Houston Terminal to Dallas Hub, monthly frequency',
    phase: 'collection'
  };

  console.log('📝 Initial State:');
  console.log(`  User Requirements: ${initialState.userRequirements}`);
  console.log(`  Phase: ${initialState.phase}\n`);

  const agent = new DataCollectionAgent();
  const action = await agent.run(initialState);

  console.log('\n✅ Results:');
  console.log(`  Next Action: ${action}`);
  console.log(`  Phase: ${initialState.phase}`);
  console.log(`  Companies Found: ${initialState.companies?.length || 0}`);
  console.log(`  Origin Locations: ${initialState.originLocations?.length || 0}`);
  console.log(`  Destination Locations: ${initialState.destinationLocations?.length || 0}`);
  console.log(`  Frequencies: ${initialState.frequencies?.length || 0}`);

  if (initialState.companies && initialState.companies.length > 0) {
    console.log('\n📊 Sample Data:');
    console.log('  Companies:', initialState.companies.slice(0, 2).map(c => c.text));
    console.log('  Origin Locations:', initialState.originLocations?.slice(0, 2).map(l => l.text));
  }

  return initialState;
}

async function testBasicFlow() {
  console.log('\n🔄 Testing Basic Flow Orchestration...\n');

  const initialState: DealState = {
    userRequirements: 'Test flow orchestration with multiple steps',
    phase: 'parsing'
  };

  // Create a simple test node
  class TestNode extends DataCollectionAgent {
    async post(shared: DealState, prepRes: any, execRes: any): Promise<string> {
      await super.post(shared, prepRes, execRes);
      shared.phase = 'complete';
      console.log('🎯 Flow completed successfully');
      return 'complete';
    }
  }

  const testNode = new TestNode();
  const flow = new Flow(testNode);

  await flow.run(initialState);

  console.log('✅ Flow Results:');
  console.log(`  Final Phase: ${initialState.phase}`);
  console.log(`  Data Collected: ${!!initialState.companies}`);

  return initialState;
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...\n');

  class ErrorTestAgent extends DataCollectionAgent {
    async exec(prepRes: any): Promise<any> {
      console.log('💥 Simulating error in exec()...');
      throw new Error('Simulated network error');
    }

    async execFallback(prepRes: any, error: Error): Promise<any> {
      console.log('🛡️  Fallback activated:', error.message);
      return {
        error: true,
        message: 'Gracefully handled error',
        fallbackData: {
          companies: [{ value: 'fallback', text: 'Fallback Company' }]
        }
      };
    }

    async post(shared: DealState, prepRes: any, execRes: any): Promise<string> {
      if (execRes.error) {
        console.log('🔧 Using fallback data...');
        shared.companies = execRes.fallbackData.companies;
        shared.phase = 'complete';
        return 'complete';
      }
      return await super.post(shared, prepRes, execRes);
    }
  }

  const initialState: DealState = {
    userRequirements: 'Test error handling',
    phase: 'collection'
  };

  const errorAgent = new ErrorTestAgent();
  const action = await errorAgent.run(initialState);

  console.log('✅ Error Handling Results:');
  console.log(`  Action: ${action}`);
  console.log(`  Phase: ${initialState.phase}`);
  console.log(`  Fallback Data: ${initialState.companies?.[0]?.text}`);

  return initialState;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 QDE Agent Manual Testing Suite');
  console.log('=====================================\n');

  try {
    await testDataCollectionAgent();
    await testBasicFlow();
    await testErrorHandling();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Data Collection Agent');
    console.log('  ✅ Flow Orchestration');
    console.log('  ✅ Error Handling');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testDataCollectionAgent, testBasicFlow, testErrorHandling };