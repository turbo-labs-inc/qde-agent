/**
 * QDE Enhanced Infrastructure Setup
 * 
 * This file demonstrates how to set up and use the enhanced multi-agent infrastructure
 */

import { Node } from './pocket-flow';
import { DealState } from './types';
import {
  globalAgentRegistry,
  globalFlowConfigManager,
  globalWorkflowOrchestrator,
  FlowConfig,
  createObservableFlow
} from './infrastructure';

// Import all agents
import { DataCollectionAgent } from '../agents/data-collection';
import { PricingAgent } from '../agents/pricing';
import { ValidationAgent } from '../agents/validation';
import { DealCreationAgent } from '../agents/deal-creation';

/**
 * Setup the enhanced QDE infrastructure
 */
export async function setupEnhancedInfrastructure() {
  console.log('🚀 Setting up QDE Enhanced Infrastructure...');
  
  // 1. Register existing agents
  await registerAgents();
  
  // 2. Register workflow configurations
  await registerWorkflowConfigs();
  
  // 3. Validate setup
  await validateSetup();
  
  console.log('✅ QDE Enhanced Infrastructure ready!');
}

/**
 * Register all available agents with metadata
 */
async function registerAgents() {
  console.log('📋 Registering agents...');
  
  // Register Data Collection Agent
  globalAgentRegistry.register('data-collection', new DataCollectionAgent(), {
    description: 'Collects reference data (companies, locations, frequencies)',
    version: '1.0.0',
    dependencies: [],
    capabilities: ['reference-data', 'mcp-integration', 'data-validation'],
    maxRetries: 3,
    timeout: 30000
  });

  // Register Pricing Agent (Real Implementation)
  globalAgentRegistry.register('pricing', new PricingAgent(), {
    description: 'Calculates market pricing with OPIS data and differentials',
    version: '1.0.0',
    dependencies: ['data-collection'],
    capabilities: ['market-pricing', 'opis-data', 'price-calculations', 'mcp-integration'],
    maxRetries: 3,
    timeout: 45000
  });

  // Register Validation Agent (Real Implementation)
  globalAgentRegistry.register('validation', new ValidationAgent(), {
    description: 'Validates deal completeness and business rules with reference data',
    version: '1.0.0',
    dependencies: ['data-collection', 'pricing'],
    capabilities: ['deal-validation', 'business-rules', 'reference-validation', 'capacity-checks'],
    maxRetries: 2,
    timeout: 30000
  });

  // Register Deal Creation Agent (Real Implementation)
  globalAgentRegistry.register('deal-creation', new DealCreationAgent(), {
    description: 'Creates final deals in Alliance Energy system via MCP',
    version: '1.0.0',
    dependencies: ['validation'],
    capabilities: ['deal-creation', 'alliance-api', 'mcp-integration', 'confirmation'],
    maxRetries: 5,
    timeout: 60000
  });

  console.log(`✅ Registered ${globalAgentRegistry.listAgents().length} agents`);
}

/**
 * Register workflow configurations
 */
async function registerWorkflowConfigs() {
  console.log('📋 Registering workflow configurations...');

  // Standard Deal Creation Flow
  const dealCreationConfig: FlowConfig = {
    name: 'standard-deal-creation',
    description: 'Standard QDE deal creation workflow',
    version: '1.0.0',
    startNode: 'data-collection',
    nodes: {
      'data-collection': {
        agent: 'data-collection',
        transitions: [
          { action: 'pricing', target: 'pricing' },
          { action: 'collection', target: 'data-collection' },
          { action: 'error', target: 'error-handler' }
        ]
      },
      'pricing': {
        agent: 'pricing',
        transitions: [
          { action: 'validation', target: 'validation' },
          { action: 'pricing-error', target: 'error-handler' },
          { action: 'collection', target: 'data-collection' }
        ]
      },
      'validation': {
        agent: 'validation',
        transitions: [
          { action: 'creation', target: 'deal-creation' },
          { action: 'collection', target: 'data-collection' },
          { action: 'validation-error', target: 'error-handler' }
        ]
      },
      'deal-creation': {
        agent: 'deal-creation',
        transitions: [
          { action: 'complete', target: 'complete' },
          { action: 'creation-error', target: 'error-handler' }
        ]
      },
      'complete': {
        agent: 'deal-creation',
        transitions: []
      },
      'error-handler': {
        agent: 'validation',
        transitions: []
      }
    }
  };

  globalFlowConfigManager.registerConfig(dealCreationConfig);

  // Express Deal Creation (skip some validations)
  const expressConfig: FlowConfig = {
    name: 'express-deal-creation',
    description: 'Express deal creation with minimal validation',
    version: '1.0.0',
    startNode: 'data-collection',
    nodes: {
      'data-collection': {
        agent: 'data-collection',
        transitions: [
          { action: 'pricing', target: 'pricing' }
        ]
      },
      'pricing': {
        agent: 'pricing',
        transitions: [
          { action: 'validation', target: 'validation' }
        ]
      },
      'validation': {
        agent: 'validation',
        transitions: [
          { action: 'creation', target: 'deal-creation' }
        ]
      },
      'deal-creation': {
        agent: 'deal-creation',
        transitions: [
          { action: 'complete', target: 'complete' }
        ]
      },
      'complete': {
        agent: 'deal-creation',
        transitions: []
      }
    }
  };

  globalFlowConfigManager.registerConfig(expressConfig);

  console.log(`✅ Registered ${globalFlowConfigManager.listConfigs().length} workflow configurations`);
}

/**
 * Validate the setup
 */
async function validateSetup() {
  console.log('🔍 Validating setup...');
  
  // Check agent dependencies
  const depValidation = globalAgentRegistry.validateDependencies();
  if (!depValidation.valid) {
    console.warn('⚠️  Dependency validation warnings:', depValidation.errors);
  }

  // Run health checks
  const healthResults = await globalAgentRegistry.healthCheckAll();
  const unhealthy = Array.from(healthResults.entries())
    .filter(([_, healthy]) => !healthy)
    .map(([name, _]) => name);
  
  if (unhealthy.length > 0) {
    console.warn('⚠️  Unhealthy agents:', unhealthy);
  }

  // Validate workflow configurations
  for (const configName of globalFlowConfigManager.listConfigs()) {
    const config = globalFlowConfigManager.getConfig(configName)!;
    const validation = globalFlowConfigManager['validateConfig'](config);
    
    if (!validation.isValid) {
      console.warn(`⚠️  Config validation errors for '${configName}':`, validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`⚠️  Config validation warnings for '${configName}':`, validation.warnings);
    }
  }

  // Print setup summary
  const stats = globalAgentRegistry.getStats();
  console.log('📊 Setup Summary:', {
    totalAgents: stats.totalAgents,
    healthyAgents: stats.healthyAgents,
    workflows: globalFlowConfigManager.listConfigs().length,
    queueStatus: globalWorkflowOrchestrator.getQueueStatus()
  });
}

/**
 * Example function to execute a workflow
 */
export async function executeStandardDealCreation(
  userRequirements: string
): Promise<DealState> {
  const initialState: DealState = {
    userRequirements,
    phase: 'parsing'
  };

  console.log('🚀 Executing standard deal creation workflow...');
  
  try {
    const result = await globalWorkflowOrchestrator.executeWorkflow(
      'standard-deal-creation',
      initialState,
      {
        timeout: 120000, // 2 minutes
        continueOnError: false,
        priority: 1,
        tags: ['deal-creation', 'standard']
      }
    );

    if (result.success) {
      console.log('✅ Deal creation completed:', {
        dealId: result.finalState.dealId,
        duration: result.duration,
        agentsExecuted: result.agentsExecuted
      });
    } else {
      console.error('❌ Deal creation failed:', result.errors);
    }

    return result.finalState;
    
  } catch (error) {
    console.error('💥 Workflow execution error:', error);
    throw error;
  }
}

/**
 * Example function to execute express deal creation
 */
export async function executeExpressDealCreation(
  userRequirements: string
): Promise<DealState> {
  const initialState: DealState = {
    userRequirements,
    phase: 'parsing'
  };

  console.log('⚡ Executing express deal creation workflow...');
  
  const result = await globalWorkflowOrchestrator.executeWorkflow(
    'express-deal-creation',
    initialState,
    {
      timeout: 60000, // 1 minute
      priority: 2, // Higher priority
      tags: ['deal-creation', 'express']
    }
  );

  return result.finalState;
}

// All agents are now real implementations - no more placeholders needed!

/**
 * Get infrastructure status
 */
export function getInfrastructureStatus() {
  return {
    agents: globalAgentRegistry.getStats(),
    workflows: globalFlowConfigManager.listConfigs(),
    executionQueue: globalWorkflowOrchestrator.getQueueStatus(),
    executionSummary: globalWorkflowOrchestrator.getExecutionSummary()
  };
}

/**
 * Demo function to show infrastructure capabilities
 */
export async function runInfrastructureDemo() {
  console.log('🎬 Running QDE Infrastructure Demo...\n');
  
  // Setup infrastructure
  await setupEnhancedInfrastructure();
  
  console.log('\n🎯 Testing workflow execution...');
  
  // Execute a standard workflow
  const result1 = await executeStandardDealCreation(
    'Create a deal with ABC Trading for 5000 gallons of propane from Houston to Dallas'
  );
  
  console.log('\n⚡ Testing express workflow...');
  
  // Execute an express workflow  
  const result2 = await executeExpressDealCreation(
    'Quick deal: 1000 gallons diesel from Corpus Christi to San Antonio'
  );
  
  console.log('\n📊 Final Infrastructure Status:');
  console.log(getInfrastructureStatus());
  
  console.log('\n✅ Demo completed successfully!');
}

// Export main setup function
export { setupEnhancedInfrastructure as default };