import { ConversationOrchestrator } from './src/conversation-orchestrator';

async function testSimplifiedFlow() {
  console.log('🧪 Testing Simplified Conversation Flow');
  console.log('======================================\n');

  const orchestrator = new ConversationOrchestrator();
  
  try {
    // Test 1: Start conversation
    console.log('Test 1: Starting conversation...');
    let state = await orchestrator.startConversation();
    console.log(`✅ Initial state: ${state.missingFields.length} missing fields`);

    // Test 2: Company search ("Something with Energy")
    console.log('\nTest 2: Testing company search...');
    state = await orchestrator.processTurn(state, 'Something with Energy in the name');
    console.log(`📊 Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
    console.log(`🔍 Missing fields: ${state.missingFields.join(', ')}`);

    // Test 3: Select a company
    console.log('\nTest 3: Selecting Houston Energy Trading...');
    state = await orchestrator.processTurn(state, 'Houston Energy Trading');
    console.log(`📊 Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
    console.log(`🔍 Missing fields: ${state.missingFields.join(', ')}`);
    console.log(`🏢 Customer: ${state.dealInfo?.customer?.name || 'None'}`);

    // Test 4: Add product
    console.log('\nTest 4: Adding product...');
    state = await orchestrator.processTurn(state, 'propane');
    console.log(`📊 Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
    console.log(`🔍 Missing fields: ${state.missingFields.join(', ')}`);
    console.log(`⛽ Product: ${state.dealInfo?.product?.name || 'None'}`);

    // Test 5: Add quantity
    console.log('\nTest 5: Adding quantity...');
    state = await orchestrator.processTurn(state, '5000 gallons');
    console.log(`📊 Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
    console.log(`🔍 Missing fields: ${state.missingFields.join(', ')}`);
    console.log(`📊 Quantity: ${state.dealInfo?.quantity?.amount || 0} ${state.dealInfo?.quantity?.unit || ''}`);

    // Test 6: Add locations
    console.log('\nTest 6: Adding locations...');
    state = await orchestrator.processTurn(state, 'from Houston to Dallas');
    console.log(`📊 Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
    console.log(`🔍 Missing fields: ${state.missingFields.join(', ')}`);
    console.log(`📍 Origin: ${state.dealInfo?.locations?.origin?.name || 'None'}`);
    console.log(`📍 Destination: ${state.dealInfo?.locations?.destination?.name || 'None'}`);
    console.log(`📍 Route: ${state.dealInfo?.locations?.route || 'None'}`);

    // Test 7: Add frequency
    console.log('\nTest 7: Adding frequency...');
    state = await orchestrator.processTurn(state, 'monthly');
    console.log(`📊 Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
    console.log(`🔍 Missing fields: ${state.missingFields.join(', ')}`);
    console.log(`📅 Frequency: ${state.dealInfo?.frequency?.type || 'None'}`);

    console.log('\n🎯 Final Status:');
    console.log(`✅ Complete: ${state.missingFields.length === 0}`);
    console.log(`🏁 Ready for creation: ${state.readyForCreation}`);
    console.log(`🔄 Phase: ${state.phase}`);
    
    if (state.missingFields.length === 0) {
      console.log('\n🎉 SUCCESS: All fields captured successfully!');
      console.log('📋 Deal Summary:');
      console.log(`   Customer: ${state.dealInfo?.customer?.name}`);
      console.log(`   Product: ${state.dealInfo?.product?.name}`);
      console.log(`   Quantity: ${state.dealInfo?.quantity?.amount} ${state.dealInfo?.quantity?.unit}`);
      console.log(`   Route: ${state.dealInfo?.locations?.route}`);
      console.log(`   Frequency: ${state.dealInfo?.frequency?.type}`);
    } else {
      console.log(`\n⚠️  Still missing: ${state.missingFields.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimplifiedFlow().catch(console.error);