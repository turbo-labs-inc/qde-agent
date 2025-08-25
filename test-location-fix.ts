import { ConversationOrchestrator } from './src/conversation-orchestrator';

async function testLocationCapture() {
  console.log('🧪 Testing Location Capture Fix');
  console.log('================================\n');

  const orchestrator = new ConversationOrchestrator();
  
  // Start with some fields already captured for simplicity
  let state = await orchestrator.startConversation();
  state.dealInfo = {
    customer: { name: 'Test Company', confidence: 1 },
    product: { name: 'Propane', confidence: 1 },
    quantity: { amount: 5000, unit: 'gallons' }
  };
  state.missingFields = ['origin_location', 'destination_location', 'frequency'];
  
  console.log('Initial state:');
  console.log(`  Missing: ${state.missingFields.join(', ')}`);
  console.log(`  Locations: ${JSON.stringify(state.dealInfo.locations)}`);
  
  console.log('\nProcessing: "from Houston to Dallas"');
  
  // Test the extraction directly first
  console.log('Testing location extraction pattern:');
  const testInput = "from Houston to Dallas";
  const fromToPattern = /from\s+(\w+(?:\s+\w+)*?)\s+to\s+(\w+(?:\s+\w+)*)/i;
  const match = fromToPattern.exec(testInput);
  if (match) {
    console.log(`  Regex match - Origin: "${match[1]}", Destination: "${match[2]}"`);
  } else {
    console.log('  Regex failed to match');
  }
  
  state = await orchestrator.processTurn(state, 'from Houston to Dallas');
  
  console.log('\nAfter processing:');
  console.log(`  Missing: ${state.missingFields.join(', ')}`);
  console.log(`  Locations object: ${JSON.stringify(state.dealInfo?.locations)}`);
  console.log(`  Origin: ${state.dealInfo?.locations?.origin?.name || 'None'}`);
  console.log(`  Destination: ${state.dealInfo?.locations?.destination?.name || 'None'}`);
  
  if (state.dealInfo?.locations) {
    console.log('\nDetailed location info:');
    console.log('  Origin:', state.dealInfo.locations.origin);
    console.log('  Destination:', state.dealInfo.locations.destination);
  }
}

testLocationCapture().catch(console.error);