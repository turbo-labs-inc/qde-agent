#!/usr/bin/env tsx

/**
 * Interactive QDE Testing
 * 
 * Enter your own deal requests and see them processed in real-time
 * Run with: npx tsx interactive-test.ts
 */

import * as readline from 'readline';
import { 
  setupEnhancedInfrastructure, 
  executeStandardDealCreation,
  executeExpressDealCreation 
} from './src/setup-enhanced-infrastructure';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,           // Enable terminal features
  historySize: 100,         // Keep command history
  removeHistoryDuplicates: true,
  completer: undefined      // Disable autocomplete to reduce lag
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

let isProcessing = false;
let fastMode = true; // Default to fast mode for better UX

async function processUserRequest(request: string) {
  if (!request.trim()) {
    console.log('⚠️  Empty request, please try again.\n');
    return;
  }
  
  if (isProcessing) {
    console.log('⚠️  Already processing a request. Please wait...\n');
    return;
  }
  
  isProcessing = true;
  console.log(`\n🔄 Processing: "${request}"`);
  console.log('⏱️  Please wait...\n');
  
  try {
    const startTime = Date.now();
    
    // Use express mode in fast mode for better responsiveness
    const result = fastMode 
      ? await executeExpressDealCreation(request)
      : await executeStandardDealCreation(request);
    
    const duration = Date.now() - startTime;
    
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 RESULT SUMMARY');
    console.log(`${'='.repeat(50)}`);
    
    if (result.dealId) {
      console.log(`✅ Status: SUCCESS`);
      console.log(`📋 Deal ID: ${result.dealId}`);
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`💰 Total Value: $${result.dealData?.pricing?.totalPrice?.toFixed(2) || 'Unknown'}`);
      console.log(`📦 Product: ${result.dealData?.product || 'Unknown'}`);
      console.log(`📏 Quantity: ${result.dealData?.quantity || 'Unknown'} gallons`);
      console.log(`🏢 Counterparty: ${result.dealData?.counterparty || 'Unknown'}`);
      console.log(`📍 Route: ${result.dealData?.originLocation || 'Unknown'} → ${result.dealData?.destinationLocation || 'Unknown'}`);
      console.log(`⏰ Frequency: ${result.dealData?.frequency || 'Unknown'}`);
      console.log(`💵 Price/Gallon: $${result.dealData?.pricing?.pricePerGallon?.toFixed(3) || 'Unknown'}`);
    } else {
      console.log(`⚠️  Status: INCOMPLETE`);
      console.log(`⏱️  Duration: ${duration}ms`);
      if (result.missingFields?.length) {
        console.log(`🔍 Missing Fields: ${result.missingFields.join(', ')}`);
      }
      if (result.validationErrors?.length) {
        console.log(`❌ Validation Errors: ${result.validationErrors.join(', ')}`);
      }
    }
    
    console.log(`${'='.repeat(50)}\n`);
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error}\n`);
  } finally {
    isProcessing = false;
  }
}

async function showExamples() {
  console.log('\n💡 Example requests you can try:');
  console.log('   • "Create a deal with ABC Trading for 5000 gallons of propane from Houston to Dallas"');
  console.log('   • "Weekly deal with XYZ Logistics for 10000 gallons gasoline from Austin to Oklahoma City"');
  console.log('   • "1000 gallons diesel from San Antonio to Kansas City, monthly"');
  console.log('   • "Create a daily deal for 2000 gallons propane"');
  console.log('   • "15000 gallons gasoline with Energy Solutions from Fort Worth to Tulsa"\n');
}

let infrastructureReady = false;

async function ensureInfrastructure() {
  if (!infrastructureReady) {
    console.log('🚀 Setting up infrastructure...');
    await setupEnhancedInfrastructure();
    infrastructureReady = true;
    console.log('✅ Infrastructure ready!\n');
  }
}

async function main() {
  console.log('🎯 QDE Agent System - Interactive Testing');
  console.log('==========================================\n');
  
  await ensureInfrastructure();
  
  console.log('🎬 Welcome to the Interactive QDE Testing Tool!');
  console.log('   ⚡ Fast mode enabled by default for better responsiveness');
  console.log('   Type your deal requests in natural language.');
  console.log('   Type "examples" to see sample requests.');
  console.log('   Type "slow" to switch to standard mode (more retries).');
  console.log('   Type "quit" or "exit" to stop.\n');
  
  while (true) {
    try {
      const input = await askQuestion('🎯 Enter deal request: ');
      
      if (input.toLowerCase().trim() === 'quit' || input.toLowerCase().trim() === 'exit') {
        console.log('\n👋 Goodbye! Thanks for testing the QDE Agent System.');
        break;
      }
      
      if (input.toLowerCase().trim() === 'examples') {
        await showExamples();
        continue;
      }
      
      if (input.toLowerCase().trim() === 'slow' || input.toLowerCase().trim() === 'fast') {
        fastMode = !fastMode;
        console.log(`${fastMode ? '⚡' : '🐢'} Switched to ${fastMode ? 'FAST' : 'STANDARD'} mode - Using ${fastMode ? '60s' : '120s'} timeouts\n`);
        continue;
      }
      
      await processUserRequest(input);
      
    } catch (error) {
      console.log(`\n❌ Error: ${error}\n`);
    }
  }
  
  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down interactive testing...');
  rl.close();
  process.exit(0);
});

// Run the interactive test
main().catch((error) => {
  console.error('❌ Interactive test failed:', error);
  rl.close();
  process.exit(1);
});