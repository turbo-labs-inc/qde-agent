import { Node, Flow } from './pocket-flow';
import { DealState } from './types';
import { DataCollectionAgent } from '../agents/data-collection';
import { PricingAgent } from '../agents/pricing';
import { ValidationAgent } from '../agents/validation';
import { DealCreationAgent } from '../agents/deal-creation';

// Main orchestrator that parses initial requirements
class QdeOrchestratorNode extends Node<DealState> {
  async prep(shared: DealState): Promise<string> {
    console.log('🤖 QDE Agent Orchestrator Starting...');
    console.log('📝 User Requirements:', shared.userRequirements);
    return shared.userRequirements;
  }

  async exec(requirements: string): Promise<any> {
    console.log('🔍 Parsing natural language requirements...');
    
    // Parse the requirements to extract deal components
    const parsedData = this.parseRequirements(requirements);
    
    console.log('✅ Requirements parsed successfully');
    return parsedData;
  }

  async post(shared: DealState, prepRes: string, execRes: any): Promise<string> {
    // Initialize deal data with parsed requirements
    shared.dealData = execRes;
    shared.phase = 'collection';
    
    console.log('📊 Initial deal data extracted:');
    console.log(`  Counterparty: ${execRes.counterparty || 'Not specified'}`);
    console.log(`  Quantity: ${execRes.quantity || 'Not specified'}`);
    console.log(`  Origin: ${execRes.originLocation || 'Not specified'}`);
    console.log(`  Destination: ${execRes.destinationLocation || 'Not specified'}`);
    
    // Move to data collection phase
    return 'collection';
  }

  private parseRequirements(requirements: string): any {
    const dealData: any = {
      product: 'Gasoline Regular Unleaded' // Default product
    };

    // Simple pattern matching for demo
    // In production, this would use NLP/LLM
    
    // Extract counterparty
    const counterpartyMatch = requirements.match(/with\s+([^,]+?)(?:\s+for|\s+to|\s*,|$)/i);
    if (counterpartyMatch) {
      dealData.counterparty = counterpartyMatch[1].trim();
    }

    // Extract quantity
    const quantityMatch = requirements.match(/(\d+(?:,\d+)*)\s*(?:gallons?|gal)/i);
    if (quantityMatch) {
      dealData.quantity = parseInt(quantityMatch[1].replace(/,/g, ''));
    }

    // Extract origin
    const originMatch = requirements.match(/from\s+([^,]+?)(?:\s+to|\s+terminal|\s+hub|\s*,|$)/i);
    if (originMatch) {
      dealData.originLocation = originMatch[1].trim();
      // Try to match with known locations
      if (dealData.originLocation.toLowerCase().includes('houston')) {
        dealData.originLocation = 'Houston Terminal';
      } else if (dealData.originLocation.toLowerCase().includes('dallas')) {
        dealData.originLocation = 'Dallas Hub';
      }
    }

    // Extract destination  
    const destMatch = requirements.match(/to\s+([^,]+?)(?:\s+terminal|\s+hub|\s*,|\s*$)/i);
    if (destMatch) {
      dealData.destinationLocation = destMatch[1].trim();
      // Try to match with known locations
      if (dealData.destinationLocation.toLowerCase().includes('dallas')) {
        dealData.destinationLocation = 'Dallas Hub';
      } else if (dealData.destinationLocation.toLowerCase().includes('oklahoma')) {
        dealData.destinationLocation = 'Oklahoma City Terminal';
      }
    }

    // Extract frequency if mentioned
    const freqMatch = requirements.match(/(daily|weekly|monthly|quarterly|annual)/i);
    if (freqMatch) {
      dealData.frequency = freqMatch[1].charAt(0).toUpperCase() + freqMatch[1].slice(1).toLowerCase();
    } else {
      dealData.frequency = 'Monthly'; // Default
    }

    return dealData;
  }
}

// Example usage with full agent workflow
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         🚀 QDE AGENT SYSTEM - DEMO                    ');
  console.log('═══════════════════════════════════════════════════════');
  console.log();
  
  // Sample user input
  const userInput = process.argv[2] || 
    'Create a deal with ABC Trading Company for 5000 gallons from Houston Terminal to Oklahoma City Terminal, monthly frequency';
  
  const initialState: DealState = {
    userRequirements: userInput,
    phase: 'parsing'
  };

  console.log('📝 Processing request:', userInput);
  console.log('───────────────────────────────────────────────────────');
  console.log();

  // Create all agents
  const orchestrator = new QdeOrchestratorNode();
  const dataCollector = new DataCollectionAgent();
  const pricingAgent = new PricingAgent();
  const validationAgent = new ValidationAgent();
  const dealCreator = new DealCreationAgent();

  // Chain agents together using action mappings
  orchestrator.on('collection', dataCollector);
  dataCollector.on('pricing', pricingAgent);
  pricingAgent.on('validation', validationAgent);
  validationAgent.on('creation', dealCreator);
  validationAgent.on('collection', dataCollector); // Loop back for clarifications
  dealCreator.on('validation', validationAgent); // If creation fails
  dealCreator.on('complete', undefined); // End the flow on completion
  
  // Configure the flow with the orchestrator as starting point
  const flow = new Flow(orchestrator);

  try {
    // Run the complete workflow
    await flow.run(initialState);
    
    console.log();
    console.log('═══════════════════════════════════════════════════════');
    console.log('     ✅ QDE AGENT WORKFLOW COMPLETED SUCCESSFULLY      ');
    console.log('═══════════════════════════════════════════════════════');
    
    if (initialState.dealId) {
      console.log(`     Deal ID: ${initialState.dealId}`);
    }
    
  } catch (error: any) {
    console.error();
    console.error('═══════════════════════════════════════════════════════');
    console.error('     ❌ QDE AGENT WORKFLOW FAILED                      ');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error:', error.message);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { QdeOrchestratorNode };