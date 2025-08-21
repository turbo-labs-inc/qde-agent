#!/usr/bin/env tsx

/**
 * QDE Deal Testing Script
 * 
 * Test the QDE Agent System with different deal scenarios
 * Run with: npx tsx test-deals.ts
 */

import { setupEnhancedInfrastructure, executeStandardDealCreation } from './src/setup-enhanced-infrastructure';

// Test scenarios
const testDeals = [
  {
    name: "Standard Propane Deal",
    request: "Create a deal with ABC Trading for 5000 gallons of propane from Houston to Dallas"
  },
  {
    name: "Gasoline Deal with Frequency", 
    request: "Create a weekly deal with XYZ Logistics for 10000 gallons of gasoline from Austin to Oklahoma City"
  },
  {
    name: "Diesel Deal Large Volume",
    request: "Create a deal with Energy Solutions for 25000 gallons of diesel from San Antonio to Kansas City, monthly delivery"
  },
  {
    name: "Simple Deal (Minimal Info)",
    request: "Create a deal with ABC Trading for 1000 gallons propane from Houston to Dallas"
  },
  {
    name: "Deal with Unknown Company",
    request: "Create a deal with Mystery Corp for 3000 gallons diesel from Dallas to Tulsa"
  }
];

async function runTestSuite() {
  console.log('🧪 QDE Agent System - Deal Testing Suite\n');
  
  // Setup infrastructure
  console.log('🚀 Setting up infrastructure...');
  await setupEnhancedInfrastructure();
  console.log('✅ Infrastructure ready!\n');
  
  // Run each test
  for (let i = 0; i < testDeals.length; i++) {
    const test = testDeals[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 TEST ${i + 1}/${testDeals.length}: ${test.name}`);
    console.log(`📝 Request: "${test.request}"`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const startTime = Date.now();
      
      // Add timeout protection to prevent infinite loops
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timed out after 30 seconds')), 30000)
      );
      
      const result = await Promise.race([
        executeStandardDealCreation(test.request),
        timeoutPromise
      ]) as any;
      
      const duration = Date.now() - startTime;
      
      if (result.dealId) {
        console.log(`\n✅ SUCCESS: Deal ${result.dealId} created in ${duration}ms`);
        console.log(`   💰 Total Value: $${result.dealData?.pricing?.totalPrice || 'Unknown'}`);
        console.log(`   📦 Product: ${result.dealData?.product || 'Unknown'}`);
        console.log(`   📍 Route: ${result.dealData?.originLocation} → ${result.dealData?.destinationLocation}`);
      } else {
        console.log(`\n⚠️  INCOMPLETE: Deal not fully created`);
        console.log(`   🔍 Missing: ${result.missingFields?.join(', ') || 'Unknown'}`);
        console.log(`   ❌ Errors: ${result.validationErrors?.join(', ') || 'None'}`);
      }
      
    } catch (error) {
      console.log(`\n❌ FAILED: ${error}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n\n🎉 Test suite completed! Tested ${testDeals.length} scenarios.`);
}

async function main() {
  try {
    await runTestSuite();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test suite...');
  process.exit(0);
});

// Run the tests
main().catch(console.error);