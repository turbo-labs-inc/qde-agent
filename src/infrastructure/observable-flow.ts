import { BaseNode, Flow } from '../pocket-flow';
import { DealState } from '../types';
import { FlowLogger, globalFlowLogger } from './flow-logger';
import { AgentRegistry, globalAgentRegistry } from './agent-registry';

type NonIterableObject = Partial<Record<string, unknown>> & { [Symbol.iterator]?: never };
type Action = string;

/**
 * Enhanced Flow with observability, metrics, and agent registry integration
 */
export class ObservableFlow<S extends DealState = DealState, P extends NonIterableObject = NonIterableObject> extends Flow<S, P> {
  private logger: FlowLogger;
  private registry: AgentRegistry;
  private flowName: string;
  private flowId: string;

  constructor(
    start: BaseNode,
    options: {
      name?: string;
      logger?: FlowLogger;
      registry?: AgentRegistry;
    } = {}
  ) {
    super(start);
    
    this.flowName = options.name || 'UnnamedFlow';
    this.logger = options.logger || globalFlowLogger;
    this.registry = options.registry || globalAgentRegistry;
    this.flowId = this.generateFlowId();
  }

  /**
   * Generate unique flow ID
   */
  private generateFlowId(): string {
    return `${this.flowName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enhanced orchestration with full observability
   */
  protected async _orchestrate(shared: S, params?: P): Promise<void> {
    let current: BaseNode | undefined = this.start.clone();
    const startTime = Date.now();
    
    // Start flow tracking
    this.logger.startFlow(this.flowId, this.flowName, shared);
    
    try {
      while (current) {
        const nodeName = this.getNodeName(current);
        const nodeStartTime = Date.now();
        
        // Apply parameters
        if (params) {
          current.setParams(params);
        }

        // Log node start
        this.logger.logNodeStart(this.flowId, nodeName, shared);

        let action: string | undefined;
        
        try {
          // Execute node with retry monitoring
          action = await this.executeNodeWithMonitoring(current, shared, nodeName);
          
          // Log successful completion
          const duration = Date.now() - nodeStartTime;
          this.logger.logNodeComplete(this.flowId, nodeName, action, duration);
          
        } catch (error) {
          // Log node error
          this.logger.logNodeError(this.flowId, nodeName, error as Error);
          throw error;
        }

        // Get next node
        const nextNode = current.getNextNode(action);
        if (!nextNode && action && action !== 'default') {
          // Log missing transition
          this.logger.logTransition(this.flowId, nodeName, `MISSING: ${action}`);
        }
        
        current = nextNode?.clone();
      }

      // Complete flow successfully
      this.logger.completeFlow(this.flowId, shared, true);
      
    } catch (error) {
      // Complete flow with error
      this.logger.completeFlow(this.flowId, shared, false);
      throw error;
    }
  }

  /**
   * Execute node with retry monitoring and state tracking
   */
  private async executeNodeWithMonitoring(
    node: BaseNode, 
    shared: S, 
    nodeName: string
  ): Promise<string | undefined> {
    const originalState = JSON.parse(JSON.stringify(shared));
    
    // Monitor retries if node supports them
    const monitoredNode = this.wrapNodeForRetryMonitoring(node, nodeName);
    
    // Execute node
    const action = await monitoredNode._run(shared);
    
    // Track state changes
    this.trackStateChanges(originalState, shared, nodeName);
    
    return action;
  }

  /**
   * Wrap node to monitor retries
   */
  private wrapNodeForRetryMonitoring(node: BaseNode, nodeName: string): BaseNode {
    const originalExec = node._exec.bind(node);
    const flowId = this.flowId;
    const logger = this.logger;
    
    // Override _exec to monitor retries
    node._exec = async function(prepRes: unknown): Promise<unknown> {
      // Check if this is a retryable node
      const retryableNode = node as any;
      const maxRetries = retryableNode.maxRetries || 1;
      const currentRetry = retryableNode.currentRetry || 0;
      
      if (currentRetry > 0) {
        logger.logNodeRetry(flowId, nodeName, currentRetry + 1, maxRetries);
      }
      
      return await originalExec(prepRes);
    };
    
    return node;
  }

  /**
   * Track changes to shared state
   */
  private trackStateChanges(originalState: S, newState: S, nodeName: string): void {
    const changes = this.findStateChanges(originalState, newState);
    
    for (const [field, { oldValue, newValue }] of changes.entries()) {
      this.logger.logStateUpdate(this.flowId, nodeName, field, oldValue, newValue);
    }
  }

  /**
   * Find differences between two state objects
   */
  private findStateChanges(oldState: S, newState: S): Map<string, { oldValue: any; newValue: any }> {
    const changes = new Map<string, { oldValue: any; newValue: any }>();
    
    // Check for changes in top-level properties
    for (const key of Object.keys(newState) as Array<keyof S>) {
      if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        changes.set(key as string, {
          oldValue: oldState[key],
          newValue: newState[key]
        });
      }
    }
    
    return changes;
  }

  /**
   * Get node name from instance
   */
  private getNodeName(node: BaseNode): string {
    // Try to get name from constructor
    const constructorName = node.constructor.name;
    
    // If it's not a generic name, use it
    if (constructorName && constructorName !== 'BaseNode' && constructorName !== 'Node') {
      return constructorName;
    }
    
    // Fall back to generic name
    return 'UnknownNode';
  }

  /**
   * Get flow execution context
   */
  getContext() {
    return this.logger.getContext(this.flowId);
  }

  /**
   * Get flow metrics
   */
  getMetrics() {
    const context = this.getContext();
    return context?.metrics;
  }

  /**
   * Get flow logs
   */
  getLogs() {
    const context = this.getContext();
    return context?.logs || [];
  }

  /**
   * Override run method to include observability
   */
  async run(shared: S): Promise<Action | undefined> {
    const startTime = Date.now();
    
    try {
      const result = await super.run(shared);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Flow '${this.flowName}' completed in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Flow '${this.flowName}' failed after ${duration}ms:`, error);
      throw error;
    }
  }
}

/**
 * Enhanced Batch Flow with observability
 */
export class ObservableBatchFlow<
  S extends DealState = DealState,
  P extends NonIterableObject = NonIterableObject,
  NP extends NonIterableObject[] = NonIterableObject[]
> extends ObservableFlow<S, P> {
  
  async _run(shared: S): Promise<Action | undefined> {
    const batchParams = await this.prep(shared) as NP;
    
    this.logger.startFlow(this.flowId, `${this.flowName}-Batch`, shared);
    
    console.log(`🔄 Starting batch flow with ${batchParams.length} items`);
    
    for (let i = 0; i < batchParams.length; i++) {
      const bp = batchParams[i];
      const mergedParams = { ...this._params, ...bp };
      
      console.log(`📦 Processing batch item ${i + 1}/${batchParams.length}`);
      
      try {
        await this._orchestrate(shared, mergedParams);
      } catch (error) {
        console.error(`❌ Batch item ${i + 1} failed:`, error);
        // Continue with remaining items unless it's a critical error
      }
    }
    
    return await this.post(shared, batchParams, undefined);
  }

  async prep(shared: S): Promise<NP> {
    const empty: readonly NonIterableObject[] = [];
    return empty as NP;
  }
}

/**
 * Enhanced Parallel Batch Flow with observability
 */
export class ObservableParallelBatchFlow<
  S extends DealState = DealState,
  P extends NonIterableObject = NonIterableObject,
  NP extends NonIterableObject[] = NonIterableObject[]
> extends ObservableBatchFlow<S, P, NP> {
  
  async _run(shared: S): Promise<Action | undefined> {
    const batchParams = await this.prep(shared) as NP;
    
    this.logger.startFlow(this.flowId, `${this.flowName}-ParallelBatch`, shared);
    
    console.log(`⚡ Starting parallel batch flow with ${batchParams.length} items`);
    
    const results = await Promise.allSettled(
      batchParams.map((bp, index) => {
        const mergedParams = { ...this._params, ...bp };
        return this._orchestrate(shared, mergedParams)
          .then(() => console.log(`✅ Batch item ${index + 1} completed`))
          .catch((error) => {
            console.error(`❌ Batch item ${index + 1} failed:`, error);
            throw error;
          });
      })
    );
    
    // Log results summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 Parallel batch completed: ${successful} succeeded, ${failed} failed`);
    
    return await this.post(shared, batchParams, undefined);
  }
}

/**
 * Factory function to create observable flows
 */
export function createObservableFlow<S extends DealState = DealState>(
  startNode: BaseNode<S>,
  name: string = 'QDE-Flow'
): ObservableFlow<S> {
  return new ObservableFlow(startNode, { name });
}

/**
 * Factory function to create observable batch flows
 */
export function createObservableBatchFlow<S extends DealState = DealState>(
  startNode: BaseNode<S>,
  name: string = 'QDE-BatchFlow'
): ObservableBatchFlow<S> {
  return new ObservableBatchFlow(startNode, { name });
}