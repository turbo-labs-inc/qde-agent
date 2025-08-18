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

// Import existing agents
import { DataCollectionAgent } from '../agents/data-collection';

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

  // Create placeholder agents for missing implementations
  globalAgentRegistry.register('pricing', new PricingAgentPlaceholder(), {
    description: 'Calculates market pricing and differentials',
    version: '0.1.0',
    dependencies: ['data-collection'],
    capabilities: ['market-pricing', 'opis-data', 'price-calculations'],
    maxRetries: 3
  });

  globalAgentRegistry.register('validation', new ValidationAgentPlaceholder(), {
    description: 'Validates deal completeness and business rules',
    version: '0.1.0',
    dependencies: ['data-collection', 'pricing'],
    capabilities: ['deal-validation', 'business-rules', 'error-handling'],
    maxRetries: 2
  });

  globalAgentRegistry.register('deal-creation', new DealCreationAgentPlaceholder(), {
    description: 'Creates final deals in Alliance Energy system',
    version: '0.1.0',
    dependencies: ['validation'],
    capabilities: ['deal-creation', 'alliance-api', 'confirmation'],
    maxRetries: 5
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
          { action: 'success', target: 'pricing' },
          { action: 'error', target: 'error-handler' }
        ]
      },
      'pricing': {
        agent: 'pricing',
        transitions: [
          { action: 'success', target: 'validation' },
          { action: 'missing-data', target: 'data-collection' },
          { action: 'error', target: 'error-handler' }
        ]
      },
      'validation': {
        agent: 'validation',
        transitions: [
          { action: 'valid', target: 'deal-creation' },
          { action: 'invalid', target: 'pricing' },
          { action: 'missing-fields', target: 'data-collection' }
        ]
      },
      'deal-creation': {
        agent: 'deal-creation',
        transitions: [
          { action: 'created', target: 'complete' },
          { action: 'error', target: 'error-handler' }
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
          { action: 'success', target: 'deal-creation' }
        ]
      },
      'deal-creation': {
        agent: 'deal-creation',
        transitions: [
          { action: 'created', target: 'complete' }
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

// Placeholder agents (to be replaced with actual implementations)
class PricingAgentPlaceholder extends Node<DealState> {
  async prep(shared: DealState) {
    console.log('💰 Pricing Agent: Starting price calculations...');
    return { phase: shared.phase };
  }

  async exec() {
    console.log('💰 Pricing Agent: [PLACEHOLDER] Calculating market pricing...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    return { pricing: { basePrice: 2.85, locationDifferential: 0, totalPrice: 2.85 } };
  }

  async post(shared: DealState, prepRes: any, execRes: any) {
    shared.phase = 'validation';
    if (shared.dealData) {
      shared.dealData.pricing = execRes.pricing;
    }
    console.log('💰 Pricing Agent: Pricing calculations complete');
    return 'success';
  }
}

class ValidationAgentPlaceholder extends Node<DealState> {
  async prep(shared: DealState) {
    console.log('✅ Validation Agent: Starting validation...');
    return { phase: shared.phase };
  }

  async exec() {
    console.log('✅ Validation Agent: [PLACEHOLDER] Validating deal data...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
    return { isValid: true, errors: [] };
  }

  async post(shared: DealState, prepRes: any, execRes: any) {
    shared.phase = 'creation';
    shared.validationErrors = execRes.errors;
    console.log('✅ Validation Agent: Validation complete');
    return execRes.isValid ? 'valid' : 'invalid';
  }
}

class DealCreationAgentPlaceholder extends Node<DealState> {
  async prep(shared: DealState) {
    console.log('📝 Deal Creation Agent: Starting deal creation...');
    return { phase: shared.phase };
  }

  async exec() {
    console.log('📝 Deal Creation Agent: [PLACEHOLDER] Creating deal in Alliance Energy...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
    const dealId = `QDE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return { dealId, status: 'Active' };
  }

  async post(shared: DealState, prepRes: any, execRes: any) {
    shared.phase = 'complete';
    shared.dealId = execRes.dealId;
    console.log('📝 Deal Creation Agent: Deal created successfully -', execRes.dealId);
    return 'created';
  }
}

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