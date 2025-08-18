import { DealState } from '../types';
import { AgentRegistry, globalAgentRegistry } from './agent-registry';
import { FlowLogger, globalFlowLogger } from './flow-logger';
import { FlowConfigManager, FlowConfig, globalFlowConfigManager } from './flow-config';
import { ObservableFlow, createObservableFlow } from './observable-flow';

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  /** Timeout for entire workflow in milliseconds */
  timeout?: number;
  /** Whether to continue on agent failures */
  continueOnError?: boolean;
  /** Additional parameters to pass to all agents */
  globalParams?: Record<string, any>;
  /** Custom logger instance */
  logger?: FlowLogger;
  /** Execution priority (higher = more important) */
  priority?: number;
  /** Tags for workflow categorization */
  tags?: string[];
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  /** Whether workflow completed successfully */
  success: boolean;
  /** Final deal state */
  finalState: DealState;
  /** Workflow execution time in milliseconds */
  duration: number;
  /** Number of agents executed */
  agentsExecuted: number;
  /** Any errors that occurred */
  errors: Error[];
  /** Flow execution ID for tracking */
  executionId: string;
  /** Detailed execution metrics */
  metrics: {
    startTime: Date;
    endTime: Date;
    nodesExecuted: number;
    retries: number;
    stateUpdates: number;
  };
}

/**
 * Queued workflow execution
 */
interface QueuedWorkflow {
  id: string;
  configName: string;
  initialState: DealState;
  options: WorkflowExecutionOptions;
  priority: number;
  queuedAt: Date;
  startedAt?: Date;
  resolve: (result: WorkflowExecutionResult) => void;
  reject: (error: Error) => void;
}

/**
 * Enhanced workflow orchestrator for the QDE system
 */
export class WorkflowOrchestrator {
  private registry: AgentRegistry;
  private configManager: FlowConfigManager;
  private logger: FlowLogger;
  
  private executionQueue: QueuedWorkflow[] = [];
  private activeExecutions: Map<string, Promise<WorkflowExecutionResult>> = new Map();
  private maxConcurrentExecutions: number = 3;
  private isProcessing: boolean = false;

  constructor(options: {
    registry?: AgentRegistry;
    configManager?: FlowConfigManager;
    logger?: FlowLogger;
    maxConcurrentExecutions?: number;
  } = {}) {
    this.registry = options.registry || globalAgentRegistry;
    this.configManager = options.configManager || globalFlowConfigManager;
    this.logger = options.logger || globalFlowLogger;
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 3;
  }

  /**
   * Execute a workflow by configuration name
   */
  async executeWorkflow(
    configName: string,
    initialState: DealState,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    
    console.log(`🚀 Queuing workflow: ${configName} (${executionId})`);
    
    return new Promise<WorkflowExecutionResult>((resolve, reject) => {
      const queuedWorkflow: QueuedWorkflow = {
        id: executionId,
        configName,
        initialState: { ...initialState },
        options,
        priority: options.priority || 0,
        queuedAt: new Date(),
        resolve,
        reject
      };

      // Insert into queue based on priority
      this.insertIntoQueue(queuedWorkflow);
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Execute workflow directly (for testing/debug)
   */
  async executeWorkflowDirect(
    configName: string,
    initialState: DealState,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    console.log(`🚀 Executing workflow directly: ${configName} (${executionId})`);
    
    try {
      // Get workflow configuration
      const config = this.configManager.getConfig(configName);
      if (!config) {
        throw new Error(`Workflow configuration not found: ${configName}`);
      }

      // Validate all required agents are available
      await this.validateAgentAvailability(config);

      // Create and execute flow
      const flow = this.configManager.createFlow(configName);
      if (!flow) {
        throw new Error(`Failed to create workflow from configuration: ${configName}`);
      }

      // Set timeout if specified
      const timeoutPromise = options.timeout 
        ? this.createTimeoutPromise(options.timeout, executionId)
        : null;

      // Execute workflow
      const executionPromise = this.executeFlowWithTracking(
        flow, 
        initialState, 
        executionId, 
        options
      );

      // Race between execution and timeout
      const result = timeoutPromise 
        ? await Promise.race([executionPromise, timeoutPromise])
        : await executionPromise;

      const duration = Date.now() - startTime;
      
      console.log(`✅ Workflow completed: ${configName} in ${duration}ms`);
      
      return result as WorkflowExecutionResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ Workflow failed: ${configName} after ${duration}ms`, error);
      
      return {
        success: false,
        finalState: initialState,
        duration,
        agentsExecuted: 0,
        errors: [error as Error],
        executionId,
        metrics: {
          startTime: new Date(startTime),
          endTime: new Date(),
          nodesExecuted: 0,
          retries: 0,
          stateUpdates: 0
        }
      };
    }
  }

  /**
   * Insert workflow into priority queue
   */
  private insertIntoQueue(workflow: QueuedWorkflow): void {
    // Find insertion point based on priority (higher priority first)
    let insertIndex = this.executionQueue.findIndex(
      queued => queued.priority < workflow.priority
    );
    
    if (insertIndex === -1) {
      insertIndex = this.executionQueue.length;
    }
    
    this.executionQueue.splice(insertIndex, 0, workflow);
    
    console.log(`📋 Workflow queued at position ${insertIndex + 1} (priority: ${workflow.priority})`);
  }

  /**
   * Process execution queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.executionQueue.length > 0 || this.activeExecutions.size > 0) {
        // Start new executions if we have capacity
        while (
          this.executionQueue.length > 0 && 
          this.activeExecutions.size < this.maxConcurrentExecutions
        ) {
          const workflow = this.executionQueue.shift()!;
          const executionPromise = this.executeQueuedWorkflow(workflow);
          this.activeExecutions.set(workflow.id, executionPromise);
        }

        // Wait for at least one execution to complete
        if (this.activeExecutions.size > 0) {
          await Promise.race(Array.from(this.activeExecutions.values()));
        }

        // Clean up completed executions
        for (const [id, promise] of this.activeExecutions.entries()) {
          if (await this.isPromiseSettled(promise)) {
            this.activeExecutions.delete(id);
          }
        }

        // Small delay to prevent busy waiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a queued workflow
   */
  private async executeQueuedWorkflow(workflow: QueuedWorkflow): Promise<WorkflowExecutionResult> {
    workflow.startedAt = new Date();
    
    const waitTime = workflow.startedAt.getTime() - workflow.queuedAt.getTime();
    console.log(`⏱️  Starting workflow ${workflow.id} after ${waitTime}ms wait`);
    
    try {
      const result = await this.executeWorkflowDirect(
        workflow.configName,
        workflow.initialState,
        workflow.options
      );
      
      workflow.resolve(result);
      return result;
      
    } catch (error) {
      workflow.reject(error as Error);
      throw error;
    }
  }

  /**
   * Execute flow with comprehensive tracking
   */
  private async executeFlowWithTracking(
    flow: ObservableFlow<DealState>,
    initialState: DealState,
    executionId: string,
    options: WorkflowExecutionOptions
  ): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    let errors: Error[] = [];

    try {
      // Execute the flow
      await flow.run(initialState);
      
      // Get execution context and metrics
      const context = flow.getContext();
      const metrics = flow.getMetrics();

      return {
        success: errors.length === 0,
        finalState: { ...initialState },
        duration: metrics?.duration || 0,
        agentsExecuted: metrics?.nodesExecuted || 0,
        errors,
        executionId,
        metrics: {
          startTime,
          endTime: new Date(),
          nodesExecuted: metrics?.nodesExecuted || 0,
          retries: metrics?.retries || 0,
          stateUpdates: metrics?.stateUpdates || 0
        }
      };

    } catch (error) {
      errors.push(error as Error);
      
      if (!options.continueOnError) {
        throw error;
      }

      return {
        success: false,
        finalState: { ...initialState },
        duration: Date.now() - startTime.getTime(),
        agentsExecuted: 0,
        errors,
        executionId,
        metrics: {
          startTime,
          endTime: new Date(),
          nodesExecuted: 0,
          retries: 0,
          stateUpdates: 0
        }
      };
    }
  }

  /**
   * Validate that all required agents are available
   */
  private async validateAgentAvailability(config: FlowConfig): Promise<void> {
    const requiredAgents = new Set<string>();
    
    // Collect all required agents
    for (const nodeConfig of Object.values(config.nodes)) {
      requiredAgents.add(nodeConfig.agent);
    }

    // Check availability
    const unavailableAgents: string[] = [];
    
    for (const agentName of requiredAgents) {
      const agent = this.registry.getAgent(agentName);
      if (!agent) {
        unavailableAgents.push(agentName);
        continue;
      }

      // Run health check
      const isHealthy = await this.registry.healthCheck(agentName);
      if (!isHealthy) {
        unavailableAgents.push(`${agentName} (unhealthy)`);
      }
    }

    if (unavailableAgents.length > 0) {
      throw new Error(`Required agents unavailable: ${unavailableAgents.join(', ')}`);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number, executionId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow execution timed out after ${timeoutMs}ms (${executionId})`));
      }, timeoutMs);
    });
  }

  /**
   * Check if promise is settled
   */
  private async isPromiseSettled(promise: Promise<any>): Promise<boolean> {
    try {
      const result = await Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(Symbol('timeout')), 0))
      ]);
      
      return result !== Symbol('timeout');
    } catch {
      return true; // Promise rejected, so it's settled
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution queue status
   */
  getQueueStatus() {
    return {
      queued: this.executionQueue.length,
      active: this.activeExecutions.size,
      maxConcurrent: this.maxConcurrentExecutions,
      isProcessing: this.isProcessing,
      nextPriority: this.executionQueue[0]?.priority || null
    };
  }

  /**
   * Get execution history summary
   */
  getExecutionSummary() {
    return this.logger.getSummary();
  }

  /**
   * Cancel queued workflow
   */
  cancelQueuedWorkflow(executionId: string): boolean {
    const index = this.executionQueue.findIndex(w => w.id === executionId);
    
    if (index >= 0) {
      const workflow = this.executionQueue.splice(index, 1)[0];
      workflow.reject(new Error(`Workflow cancelled: ${executionId}`));
      console.log(`❌ Cancelled queued workflow: ${executionId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Set maximum concurrent executions
   */
  setMaxConcurrentExecutions(max: number): void {
    this.maxConcurrentExecutions = Math.max(1, max);
    console.log(`⚙️  Max concurrent executions set to: ${this.maxConcurrentExecutions}`);
  }

  /**
   * Clear execution queue (emergency stop)
   */
  clearQueue(): number {
    const count = this.executionQueue.length;
    
    // Reject all queued workflows
    for (const workflow of this.executionQueue) {
      workflow.reject(new Error('Execution queue cleared'));
    }
    
    this.executionQueue = [];
    console.log(`🛑 Cleared ${count} queued workflows`);
    
    return count;
  }
}

// Global orchestrator instance
export const globalWorkflowOrchestrator = new WorkflowOrchestrator();