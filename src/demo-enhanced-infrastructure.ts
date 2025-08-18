#!/usr/bin/env tsx

/**
 * Demo script for QDE Enhanced Infrastructure
 * 
 * Run with: npx tsx src/demo-enhanced-infrastructure.ts
 */

import { runInfrastructureDemo } from './setup-enhanced-infrastructure';

async function main() {
  try {
    await runInfrastructureDemo();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down infrastructure demo...');
  process.exit(0);
});

// Run the demo
main().catch(console.error);