import { DealState } from '../types';

/**
 * Log levels for flow execution
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Flow execution event types
 */
export enum FlowEventType {
  FLOW_START = 'FLOW_START',
  FLOW_COMPLETE = 'FLOW_COMPLETE',
  FLOW_ERROR = 'FLOW_ERROR',
  NODE_START = 'NODE_START',
  NODE_COMPLETE = 'NODE_COMPLETE',
  NODE_ERROR = 'NODE_ERROR',
  NODE_RETRY = 'NODE_RETRY',
  STATE_UPDATE = 'STATE_UPDATE',
  TRANSITION = 'TRANSITION'
}

/**
 * Flow execution metrics
 */
export interface FlowMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodesExecuted: number;
  errors: number;
  retries: number;
  stateUpdates: number;
  transitions: number;
}

/**
 * Flow log entry
 */
export interface FlowLogEntry {
  timestamp: Date;
  level: LogLevel;
  eventType: FlowEventType;
  flowId: string;
  nodeName?: string;
  message: string;
  data?: any;
  error?: Error;
  metrics?: Partial<FlowMetrics>;
}

/**
 * Flow execution context for tracking
 */
export interface FlowContext {
  flowId: string;
  flowName: string;
  startTime: Date;
  metrics: FlowMetrics;
  logs: FlowLogEntry[];
  state: DealState;
}

/**
 * Enhanced logger for PocketFlow execution
 */
export class FlowLogger {
  private contexts: Map<string, FlowContext> = new Map();
  private logHandlers: Array<(entry: FlowLogEntry) => void> = [];

  /**
   * Add a log handler (console, file, external service)
   */
  addLogHandler(handler: (entry: FlowLogEntry) => void): void {
    this.logHandlers.push(handler);
  }

  /**
   * Start tracking a flow execution
   */
  startFlow(flowId: string, flowName: string, initialState: DealState): FlowContext {
    const context: FlowContext = {
      flowId,
      flowName,
      startTime: new Date(),
      metrics: {
        startTime: new Date(),
        nodesExecuted: 0,
        errors: 0,
        retries: 0,
        stateUpdates: 0,
        transitions: 0
      },
      logs: [],
      state: { ...initialState }
    };

    this.contexts.set(flowId, context);
    
    this.log(flowId, LogLevel.INFO, FlowEventType.FLOW_START, {
      message: `Flow started: ${flowName}`,
      data: { initialPhase: initialState.phase }
    });

    return context;
  }

  /**
   * Log node execution start
   */
  logNodeStart(flowId: string, nodeName: string, state: DealState): void {
    const context = this.contexts.get(flowId);
    if (!context) return;

    context.metrics.nodesExecuted++;
    
    this.log(flowId, LogLevel.INFO, FlowEventType.NODE_START, {
      nodeName,
      message: `Node started: ${nodeName}`,
      data: { phase: state.phase, missingFields: state.missingFields?.length || 0 }
    });
  }

  /**
   * Log node execution completion
   */
  logNodeComplete(flowId: string, nodeName: string, action: string | undefined, duration: number): void {
    this.log(flowId, LogLevel.INFO, FlowEventType.NODE_COMPLETE, {
      nodeName,
      message: `Node completed: ${nodeName} → ${action || 'default'}`,
      data: { action, duration }
    });

    if (action) {
      this.logTransition(flowId, nodeName, action);
    }
  }

  /**
   * Log node error
   */
  logNodeError(flowId: string, nodeName: string, error: Error): void {
    const context = this.contexts.get(flowId);
    if (context) {
      context.metrics.errors++;
    }

    this.log(flowId, LogLevel.ERROR, FlowEventType.NODE_ERROR, {
      nodeName,
      message: `Node error: ${nodeName}`,
      error,
      data: { errorType: error.constructor.name }
    });
  }

  /**
   * Log node retry
   */
  logNodeRetry(flowId: string, nodeName: string, attempt: number, maxRetries: number): void {
    const context = this.contexts.get(flowId);
    if (context) {
      context.metrics.retries++;
    }

    this.log(flowId, LogLevel.WARN, FlowEventType.NODE_RETRY, {
      nodeName,
      message: `Node retry: ${nodeName} (${attempt}/${maxRetries})`,
      data: { attempt, maxRetries }
    });
  }

  /**
   * Log state update
   */
  logStateUpdate(flowId: string, nodeName: string, field: string, oldValue: any, newValue: any): void {
    const context = this.contexts.get(flowId);
    if (context) {
      context.metrics.stateUpdates++;
    }

    this.log(flowId, LogLevel.DEBUG, FlowEventType.STATE_UPDATE, {
      nodeName,
      message: `State updated: ${field}`,
      data: { field, oldValue, newValue }
    });
  }

  /**
   * Log flow transition
   */
  logTransition(flowId: string, fromNode: string, action: string): void {
    const context = this.contexts.get(flowId);
    if (context) {
      context.metrics.transitions++;
    }

    this.log(flowId, LogLevel.INFO, FlowEventType.TRANSITION, {
      nodeName: fromNode,
      message: `Transition: ${fromNode} → ${action}`,
      data: { fromNode, action }
    });
  }

  /**
   * Complete flow execution
   */
  completeFlow(flowId: string, finalState: DealState, success: boolean = true): FlowContext | undefined {
    const context = this.contexts.get(flowId);
    if (!context) return undefined;

    context.metrics.endTime = new Date();
    context.metrics.duration = context.metrics.endTime.getTime() - context.metrics.startTime.getTime();
    context.state = { ...finalState };

    this.log(flowId, success ? LogLevel.INFO : LogLevel.ERROR, 
      success ? FlowEventType.FLOW_COMPLETE : FlowEventType.FLOW_ERROR, {
        message: `Flow ${success ? 'completed' : 'failed'}`,
        data: { 
          finalPhase: finalState.phase,
          dealId: finalState.dealId,
          duration: context.metrics.duration
        },
        metrics: context.metrics
      });

    return context;
  }

  /**
   * Get flow context
   */
  getContext(flowId: string): FlowContext | undefined {
    return this.contexts.get(flowId);
  }

  /**
   * Get all active flows
   */
  getActiveFlows(): FlowContext[] {
    return Array.from(this.contexts.values()).filter(ctx => !ctx.metrics.endTime);
  }

  /**
   * Core logging method
   */
  private log(flowId: string, level: LogLevel, eventType: FlowEventType, details: {
    nodeName?: string;
    message: string;
    data?: any;
    error?: Error;
    metrics?: Partial<FlowMetrics>;
  }): void {
    const context = this.contexts.get(flowId);
    
    const entry: FlowLogEntry = {
      timestamp: new Date(),
      level,
      eventType,
      flowId,
      nodeName: details.nodeName,
      message: details.message,
      data: details.data,
      error: details.error,
      metrics: details.metrics
    };

    // Add to context logs
    if (context) {
      context.logs.push(entry);
    }

    // Send to all handlers
    this.logHandlers.forEach(handler => {
      try {
        handler(entry);
      } catch (error) {
        console.error('Log handler error:', error);
      }
    });
  }

  /**
   * Clear old flow contexts (for memory management)
   */
  cleanup(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    let removed = 0;

    for (const [flowId, context] of this.contexts.entries()) {
      if (context.metrics.endTime && context.metrics.endTime < cutoff) {
        this.contexts.delete(flowId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old flow contexts`);
    }

    return removed;
  }

  /**
   * Get execution summary
   */
  getSummary(): {
    activeFlows: number;
    totalFlows: number;
    avgDuration: number;
    successRate: number;
    totalErrors: number;
  } {
    const contexts = Array.from(this.contexts.values());
    const completed = contexts.filter(ctx => ctx.metrics.endTime);
    const successful = completed.filter(ctx => ctx.metrics.errors === 0);
    
    const totalDuration = completed.reduce((sum, ctx) => sum + (ctx.metrics.duration || 0), 0);
    const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;
    
    return {
      activeFlows: contexts.filter(ctx => !ctx.metrics.endTime).length,
      totalFlows: contexts.length,
      avgDuration,
      successRate: completed.length > 0 ? (successful.length / completed.length) * 100 : 0,
      totalErrors: contexts.reduce((sum, ctx) => sum + ctx.metrics.errors, 0)
    };
  }
}

/**
 * Default console log handler
 */
export const consoleLogHandler = (entry: FlowLogEntry) => {
  const timestamp = entry.timestamp.toISOString().substr(11, 12);
  const level = entry.level.padEnd(5);
  const eventType = entry.eventType.padEnd(15);
  const nodeName = entry.nodeName ? `[${entry.nodeName}]` : '';
  
  const prefix = `${timestamp} ${level} ${eventType} ${entry.flowId.substr(-8)} ${nodeName}`;
  
  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(`${prefix} ${entry.message}`, entry.error || entry.data || '');
      break;
    case LogLevel.WARN:
      console.warn(`${prefix} ${entry.message}`, entry.data || '');
      break;
    case LogLevel.INFO:
      console.log(`${prefix} ${entry.message}`, entry.data || '');
      break;
    case LogLevel.DEBUG:
      console.debug(`${prefix} ${entry.message}`, entry.data || '');
      break;
  }
};

// Global logger instance
export const globalFlowLogger = new FlowLogger();
globalFlowLogger.addLogHandler(consoleLogHandler);