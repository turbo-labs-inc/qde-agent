/**
 * QDE Enhanced Multi-Agent Infrastructure
 * 
 * This module provides enhanced infrastructure for multi-agent workflows:
 * - Agent Registry: Discovery and management of agents
 * - Observable Flows: Logging, metrics, and monitoring
 * - Dynamic Configuration: JSON-based flow definitions
 * - Workflow Orchestration: Queue management and execution
 */

// Core infrastructure components
export * from './agent-registry';
export * from './flow-logger';
export * from './observable-flow';
export * from './flow-config';
export * from './workflow-orchestrator';

// Global instances (ready to use)
export { globalAgentRegistry } from './agent-registry';
export { globalFlowLogger } from './flow-logger';
export { globalFlowConfigManager } from './flow-config';
export { globalWorkflowOrchestrator } from './workflow-orchestrator';

export {
  consoleLogHandler
} from './flow-logger';

// Factory functions
export {
  createObservableFlow,
  createObservableBatchFlow
} from './observable-flow';

// Types
export type {
  AgentMetadata,
  RegisteredAgent
} from './agent-registry';

export type {
  FlowLogEntry,
  FlowMetrics,
  FlowContext,
  LogLevel,
  FlowEventType
} from './flow-logger';

export type {
  FlowConfig,
  FlowNodeConfig,
  FlowTransition,
  FlowValidationResult
} from './flow-config';

export type {
  WorkflowExecutionOptions,
  WorkflowExecutionResult
} from './workflow-orchestrator';