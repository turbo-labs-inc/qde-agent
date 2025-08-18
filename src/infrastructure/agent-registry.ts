import { BaseNode } from '../pocket-flow';
import { DealState } from '../types';

/**
 * Agent metadata for discovery and management
 */
export interface AgentMetadata {
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  capabilities: string[];
  maxRetries?: number;
  timeout?: number;
}

/**
 * Registered agent with metadata and instance
 */
export interface RegisteredAgent {
  metadata: AgentMetadata;
  instance: BaseNode<DealState>;
  isEnabled: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Agent Registry for managing and discovering agents in the QDE system
 */
export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();
  private healthChecks: Map<string, boolean> = new Map();

  /**
   * Register a new agent with metadata
   */
  register(
    name: string, 
    agent: BaseNode<DealState>, 
    metadata: Partial<AgentMetadata> = {}
  ): this {
    const fullMetadata: AgentMetadata = {
      name,
      description: metadata.description || `${name} agent`,
      version: metadata.version || '1.0.0',
      dependencies: metadata.dependencies || [],
      capabilities: metadata.capabilities || [],
      maxRetries: metadata.maxRetries || 3,
      timeout: metadata.timeout || 30000
    };

    this.agents.set(name, {
      metadata: fullMetadata,
      instance: agent,
      isEnabled: true,
      createdAt: new Date()
    });

    this.healthChecks.set(name, true);
    
    console.log(`🤖 Agent registered: ${name} v${fullMetadata.version}`);
    return this;
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): BaseNode<DealState> | undefined {
    const registered = this.agents.get(name);
    if (!registered || !registered.isEnabled) {
      return undefined;
    }

    // Update last used timestamp
    registered.lastUsed = new Date();
    return registered.instance.clone();
  }

  /**
   * Get agent metadata
   */
  getMetadata(name: string): AgentMetadata | undefined {
    return this.agents.get(name)?.metadata;
  }

  /**
   * List all registered agents
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys()).filter(name => 
      this.agents.get(name)?.isEnabled
    );
  }

  /**
   * List agents with full details
   */
  listAgentDetails(): RegisteredAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.isEnabled);
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: string): string[] {
    return this.listAgents().filter(name => {
      const metadata = this.getMetadata(name);
      return metadata?.capabilities.includes(capability);
    });
  }

  /**
   * Find agents with no dependencies (can run first)
   */
  findEntryPoints(): string[] {
    return this.listAgents().filter(name => {
      const metadata = this.getMetadata(name);
      return metadata?.dependencies.length === 0;
    });
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const name of this.listAgents()) {
      const metadata = this.getMetadata(name);
      if (metadata) {
        graph.set(name, metadata.dependencies);
      }
    }
    
    return graph;
  }

  /**
   * Validate dependency chain
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const agents = this.listAgents();
    
    for (const agentName of agents) {
      const metadata = this.getMetadata(agentName);
      if (!metadata) continue;
      
      for (const dependency of metadata.dependencies) {
        if (!agents.includes(dependency)) {
          errors.push(`Agent '${agentName}' depends on '${dependency}' which is not registered`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enable/disable agent
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const agent = this.agents.get(name);
    if (!agent) return false;
    
    agent.isEnabled = enabled;
    this.healthChecks.set(name, enabled);
    
    console.log(`🤖 Agent ${name} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Unregister agent
   */
  unregister(name: string): boolean {
    const result = this.agents.delete(name);
    this.healthChecks.delete(name);
    
    if (result) {
      console.log(`🗑️  Agent unregistered: ${name}`);
    }
    
    return result;
  }

  /**
   * Health check for agent
   */
  async healthCheck(name: string): Promise<boolean> {
    const agent = this.agents.get(name);
    if (!agent || !agent.isEnabled) {
      return false;
    }

    try {
      // Basic health check - ensure agent can be cloned
      const cloned = agent.instance.clone();
      this.healthChecks.set(name, true);
      return true;
    } catch (error) {
      console.error(`❌ Health check failed for agent ${name}:`, error);
      this.healthChecks.set(name, false);
      return false;
    }
  }

  /**
   * Run health checks on all agents
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const name of this.listAgents()) {
      results.set(name, await this.healthCheck(name));
    }
    
    return results;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const agents = this.listAgentDetails();
    const capabilities = new Set<string>();
    
    agents.forEach(agent => {
      agent.metadata.capabilities.forEach(cap => capabilities.add(cap));
    });

    return {
      totalAgents: agents.length,
      enabledAgents: agents.filter(a => a.isEnabled).length,
      uniqueCapabilities: capabilities.size,
      healthyAgents: Array.from(this.healthChecks.values()).filter(Boolean).length,
      oldestAgent: agents.reduce((oldest, current) => 
        current.createdAt < oldest.createdAt ? current : oldest
      ),
      mostRecentlyUsed: agents.reduce((recent, current) => 
        (current.lastUsed && (!recent.lastUsed || current.lastUsed > recent.lastUsed)) 
          ? current : recent
      )
    };
  }

  /**
   * Clear all agents (for testing)
   */
  clear(): void {
    this.agents.clear();
    this.healthChecks.clear();
    console.log('🧹 Agent registry cleared');
  }
}

// Global registry instance
export const globalAgentRegistry = new AgentRegistry();