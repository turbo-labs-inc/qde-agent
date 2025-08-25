import { ConversationOrchestrator } from './src/conversation-orchestrator';

async function testLoopFix() {
  console.log('🧪 Testing Loop Fix');
  console.log('=================\n');

  const orchestrator = new ConversationOrchestrator();
  let state = await orchestrator.startConversation();
  
  console.log('Test: Direct company name "Houston Energy Trading"');
  state = await orchestrator.processTurn(state, 'Houston Energy Trading');
  
  console.log(`Customer: ${state.dealInfo?.customer?.name || 'None'}`);
  console.log(`Missing customer: ${state.missingFields.includes('customer')}`);
  console.log(`Clarifications: ${state.clarificationRequests?.length || 0}`);
  
  if (!state.missingFields.includes('customer')) {
    console.log('✅ SUCCESS: Customer field completed!');
  } else if (state.clarificationRequests?.length === 1) {
    console.log('✅ SUCCESS: Single clarification request (no loop)');
  } else {
    console.log('❌ FAILED: Still in loop or unexpected state');
  }
}

testLoopFix().catch(console.error);