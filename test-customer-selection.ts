import { ConversationOrchestrator } from './src/conversation-orchestrator';

async function testCustomerSelection() {
  console.log('🧪 Testing Customer Selection Issue');
  console.log('==================================\n');

  const orchestrator = new ConversationOrchestrator();
  
  // Start conversation
  let state = await orchestrator.startConversation();
  
  // Step 1: User says "Houston Energy Trading" directly
  console.log('Step 1: User says "Houston Energy Trading"');
  state = await orchestrator.processTurn(state, 'Houston Energy Trading');
  console.log(`Missing fields: ${state.missingFields.join(', ')}`);
  console.log(`Customer: ${state.dealInfo?.customer?.name || 'None'}`);
  console.log(`Has clarifications: ${state.clarificationRequests?.length || 0}`);
  console.log(`Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
  
  // Step 2: User responds to clarification
  console.log('\nStep 2: User says "great. lets pick Houston Energy Trading"');
  state = await orchestrator.processTurn(state, 'great. lets pick Houston Energy Trading');
  console.log(`Missing fields: ${state.missingFields.join(', ')}`);
  console.log(`Customer: ${state.dealInfo?.customer?.name || 'None'}`);
  console.log(`Has clarifications: ${state.clarificationRequests?.length || 0}`);
  console.log(`Response: ${state.lastAgentResponse?.substring(0, 100)}...`);
  
  if (state.missingFields.includes('customer')) {
    console.log('\n❌ Customer selection failed - field still missing');
  } else {
    console.log('\n✅ Customer selection successful!');
  }
}

testCustomerSelection().catch(console.error);