import { BaseNode } from '../pocket-flow';
import { DealState } from '../types';
import { AgentRegistry, globalAgentRegistry } from './agent-registry';
import { ObservableFlow } from './observable-flow';

/**
 * Flow transition configuration
 */
export interface FlowTransition {
  /** Action that triggers this transition */
  action: string;
  /** Target node name */
  target: string;
  /** Optional condition function */
  condition?: (state: DealState) => boolean;
  /** Parameters to pass to target node */
  params?: Record<string, any>;
}

/**
 * Node configuration in a flow
 */
export interface FlowNodeConfig {
  /** Agent name from registry */
  agent: string;
  /** Node-specific parameters */
  params?: Record<string, any>;
  /** Transitions from this node */
  transitions: FlowTransition[];
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delay: number;
  };
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Complete flow configuration
 */
export interface FlowConfig {
  /** Flow name */
  name: string;
  /** Flow description */
  description?: string;
  /** Flow version */
  version?: string;
  /** Starting node */
  startNode: string;
  /** Node configurations */
  nodes: Record<string, FlowNodeConfig>;
  /** Global flow parameters */
  globalParams?: Record<string, any>;
  /** Flow-level retry configuration */
  globalRetry?: {
    maxAttempts: number;
    delay: number;
  };
}

/**
 * Flow validation result
 */
export interface FlowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Dynamic flow configuration manager
 */
export class FlowConfigManager {
  private registry: AgentRegistry;
  private configs: Map<string, FlowConfig> = new Map();

  constructor(registry: AgentRegistry = globalAgentRegistry) {
    this.registry = registry;
  }

  /**
   * Register a flow configuration
   */
  registerConfig(config: FlowConfig): void {
    const validation = this.validateConfig(config);
    
    if (!validation.isValid) {
      throw new Error(`Flow config validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn(`Flow config warnings for '${config.name}':`, validation.warnings);
    }

    this.configs.set(config.name, config);
    console.log(`📋 Flow config registered: ${config.name} v${config.version || '1.0.0'}`);
  }

  /**
   * Get flow configuration
   */
  getConfig(name: string): FlowConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * List all registered configurations
   */
  listConfigs(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Create executable flow from configuration
   */
  createFlow(configName: string): ObservableFlow<DealState> | undefined {
    const config = this.configs.get(configName);
    if (!config) {
      console.error(`Flow config not found: ${configName}`);
      return undefined;
    }

    // Get starting node from registry
    const startAgent = this.registry.getAgent(config.startNode);
    if (!startAgent) {
      console.error(`Start agent not found in registry: ${config.startNode}`);
      return undefined;
    }

    // Apply global parameters
    if (config.globalParams) {
      startAgent.setParams(config.globalParams);
    }

    // Build the flow by connecting nodes
    const flow = this.buildFlowFromConfig(config, startAgent);
    
    return new ObservableFlow(flow, { name: config.name });
  }

  /**
   * Build connected flow from configuration
   */
  private buildFlowFromConfig(config: FlowConfig, startNode: BaseNode<DealState>): BaseNode<DealState> {
    const nodeMap = new Map<string, BaseNode<DealState>>();
    
    // Create all nodes first
    for (const [nodeName, nodeConfig] of Object.entries(config.nodes)) {
      let agent = this.registry.getAgent(nodeConfig.agent);
      if (!agent) {
        throw new Error(`Agent not found in registry: ${nodeConfig.agent}`);
      }

      // Apply node-specific parameters
      if (nodeConfig.params) {
        agent = agent.setParams(nodeConfig.params);
      }

      nodeMap.set(nodeName, agent);
    }

    // Set starting node in the map
    nodeMap.set(config.startNode, startNode);

    // Connect nodes based on transitions
    for (const [nodeName, nodeConfig] of Object.entries(config.nodes)) {
      const currentNode = nodeMap.get(nodeName);
      if (!currentNode) continue;

      // Add transitions
      for (const transition of nodeConfig.transitions) {
        const targetNode = nodeMap.get(transition.target);
        if (!targetNode) {
          console.warn(`Target node not found: ${transition.target}`);
          continue;
        }

        // Create conditional node wrapper if needed
        if (transition.condition) {
          const conditionalNode = this.createConditionalNode(
            targetNode, 
            transition.condition
          );
          currentNode.on(transition.action, conditionalNode);
        } else {
          currentNode.on(transition.action, targetNode);
        }
      }
    }

    return startNode;
  }

  /**
   * Create a conditional node wrapper
   */
  private createConditionalNode(
    targetNode: BaseNode<DealState>, 
    condition: (state: DealState) => boolean
  ): BaseNode<DealState> {
    return new class extends BaseNode<DealState> {
      async run(shared: DealState) {
        if (condition(shared)) {
          return await targetNode.run(shared);
        }
        
        // Condition not met, skip this node
        console.log(`⏭️  Skipping node due to condition: ${targetNode.constructor.name}`);
        return 'skip';
      }
    }();
  }

  /**
   * Validate flow configuration
   */
  validateConfig(config: FlowConfig): FlowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.name) {
      errors.push('Flow name is required');
    }

    if (!config.startNode) {
      errors.push('Start node is required');
    }

    if (!config.nodes || Object.keys(config.nodes).length === 0) {
      errors.push('At least one node configuration is required');
    }

    // Validate start node exists in nodes
    if (config.startNode && !config.nodes[config.startNode]) {
      errors.push(`Start node '${config.startNode}' not found in nodes configuration`);
    }

    // Validate each node
    for (const [nodeName, nodeConfig] of Object.entries(config.nodes || {})) {
      // Check if agent exists in registry
      if (!this.registry.getAgent(nodeConfig.agent)) {
        errors.push(`Agent '${nodeConfig.agent}' for node '${nodeName}' not found in registry`);
      }

      // Validate transitions
      for (const transition of nodeConfig.transitions) {
        if (!transition.action) {
          errors.push(`Transition in node '${nodeName}' missing action`);
        }

        if (!transition.target) {
          errors.push(`Transition '${transition.action}' in node '${nodeName}' missing target`);
        }

        // Check if target node exists
        if (transition.target && !config.nodes[transition.target]) {
          errors.push(`Transition target '${transition.target}' in node '${nodeName}' not found in nodes`);
        }
      }

      // Warnings for best practices
      if (nodeConfig.transitions.length === 0) {
        warnings.push(`Node '${nodeName}' has no transitions (might be terminal)`);
      }
    }

    // Check for unreachable nodes
    const reachableNodes = this.findReachableNodes(config);
    const allNodes = Object.keys(config.nodes);
    const unreachableNodes = allNodes.filter(node => !reachableNodes.has(node));
    
    if (unreachableNodes.length > 0) {
      warnings.push(`Unreachable nodes found: ${unreachableNodes.join(', ')}`);
    }

    // Check for cycles (could be warning or error based on requirements)
    const cycles = this.findCycles(config);
    if (cycles.length > 0) {
      warnings.push(`Potential cycles detected: ${cycles.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Find all nodes reachable from start node
   */
  private findReachableNodes(config: FlowConfig): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();
    const queue = [config.startNode];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      reachable.add(current);

      const nodeConfig = config.nodes[current];
      if (nodeConfig) {
        for (const transition of nodeConfig.transitions) {
          if (!visited.has(transition.target)) {
            queue.push(transition.target);
          }
        }
      }
    }

    return reachable;
  }

  /**
   * Find cycles in flow configuration
   */
  private findCycles(config: FlowConfig): string[] {
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);

      const nodeConfig = config.nodes[node];
      if (nodeConfig) {
        for (const transition of nodeConfig.transitions) {
          const target = transition.target;
          
          if (!visited.has(target)) {
            dfs(target, [...path, target]);
          } else if (recursionStack.has(target)) {
            const cycleStart = path.indexOf(target);
            if (cycleStart >= 0) {
              cycles.push(path.slice(cycleStart).join(' → '));
            }
          }
        }
      }

      recursionStack.delete(node);
    };

    dfs(config.startNode, [config.startNode]);
    
    return cycles;
  }

  /**
   * Generate configuration from existing flow (reverse engineering)
   */
  generateConfigFromFlow(flow: BaseNode<DealState>, name: string): FlowConfig {
    // This would be a complex implementation to traverse an existing flow
    // For now, return a basic template
    return {
      name,
      description: `Generated configuration for ${name}`,
      version: '1.0.0',
      startNode: 'start',
      nodes: {
        start: {
          agent: 'data-collection',
          transitions: [
            { action: 'success', target: 'end' }
          ]
        },
        end: {
          agent: 'deal-creation',
          transitions: []
        }
      }
    };
  }

  /**
   * Export configurations to JSON
   */
  exportConfigs(): Record<string, FlowConfig> {
    const configs: Record<string, FlowConfig> = {};
    for (const [name, config] of this.configs.entries()) {
      configs[name] = config;
    }
    return configs;
  }

  /**
   * Import configurations from JSON
   */
  importConfigs(configs: Record<string, FlowConfig>): void {
    for (const [name, config] of Object.entries(configs)) {
      try {
        this.registerConfig(config);
      } catch (error) {
        console.error(`Failed to import config '${name}':`, error);
      }
    }
  }

  /**
   * Clear all configurations
   */
  clear(): void {
    this.configs.clear();
    console.log('🧹 Flow configurations cleared');
  }
}

// Global configuration manager
export const globalFlowConfigManager = new FlowConfigManager();