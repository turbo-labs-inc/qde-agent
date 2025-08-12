# POCKETFLOW.md - Framework Reference

## Overview

**PocketFlow.js** is a minimalist TypeScript LLM framework designed for building AI agents, workflows, and multi-agent systems. The entire core framework is just 100 lines of code with zero dependencies, providing a lightweight foundation for complex LLM applications.

## Key Principles

- **Lightweight**: Zero bloat, zero dependencies, zero vendor lock-in
- **Expressive**: Supports Agents, Multi-Agent systems, Workflows, RAG patterns, and more
- **Agentic Coding**: Designed for AI agents to help humans build LLM applications
- **Graph + Shared Store**: Models LLM workflows as graphs with shared state communication

## Core Architecture

PocketFlow models LLM workflows as a **Graph + Shared Store**:

```
┌─────────────────────────────────────────────┐
│                 Shared Store                │
│           (Communication Layer)             │
└─────────────────────────────────────────────┘
                        ▲
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │  Node A │────▶│  Node B │────▶│  Node C │
   └─────────┘     └─────────┘     └─────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                  ┌─────────┐
                  │  Flow   │
                  └─────────┘
```

## Core Abstractions

### 1. Node
The smallest building block with a 3-step lifecycle:

**Lifecycle Pattern:**
```typescript
class CustomNode extends Node<SharedStore> {
  // 1. PREP: Read and preprocess data from shared store
  async prep(shared: SharedStore): Promise<InputData> {
    return shared.someData;
  }

  // 2. EXEC: Execute compute logic (LLM calls, APIs, calculations)
  async exec(prepRes: InputData): Promise<OutputData> {
    return await callLLM(prepRes);
  }

  // 3. POST: Write results back to shared store and return next action
  async post(shared: SharedStore, prepRes: InputData, execRes: OutputData): Promise<string> {
    shared.results = execRes;
    return 'next_node'; // Action determines flow routing
  }
}
```

**Key Features:**
- **Separation of Concerns**: Data storage and processing are separated
- **Fault Tolerance**: Built-in retry logic with configurable `maxRetries` and `wait` times
- **Graceful Fallback**: Override `execFallback()` for error handling
- **All steps optional**: Can implement just `prep` and `post` for data processing

### 2. Flow
Orchestrates a graph of Nodes using action-based transitions:

**Action-Based Routing:**
```typescript
// Basic sequence
nodeA.next(nodeB); // "default" action goes to nodeB

// Branching logic
nodeA.on("approved", nodeB)
     .on("rejected", nodeC)
     .on("needs_review", nodeD);

// Method chaining for linear flows
nodeA.next(nodeB).next(nodeC).next(nodeD);

// Create and run flow
const flow = new Flow(nodeA);
await flow.run(sharedStore);
```

**Nested Flows:**
- Flows can act as Nodes within other Flows
- Enables composition and reusability
- Perfect for breaking complex workflows into manageable sub-flows

### 3. Shared Store
Central communication mechanism between all nodes:

```typescript
interface SharedStore {
  // Input data
  userRequirements: string;
  
  // Intermediate results
  processedData?: any[];
  calculations?: number[];
  
  // Final outputs
  results?: FinalResult;
  errors?: string[];
}
```

### 4. Batch Processing
Handle data-intensive tasks with specialized batch nodes:

- **BatchNode**: Process arrays of data items
- **ParallelBatchNode**: Handle I/O-bound batch operations concurrently

## Design Patterns

### 1. Agent Pattern
Autonomous decision-making entities:
```typescript
class AgentNode extends Node<AgentStore> {
  async exec(context: Context): Promise<Action> {
    // LLM decides what action to take based on context
    return await llm.decide(context, availableActions);
  }
}
```

### 2. Workflow Pattern
Chain multiple tasks into pipelines:
```typescript
// Sequential workflow
inputNode.next(processNode).next(outputNode);
```

### 3. RAG Pattern
Retrieve-Augment-Generate for knowledge-enhanced responses:
```typescript
// Typical RAG flow
retrievalNode.next(augmentationNode).next(generationNode);
```

### 4. Map-Reduce Pattern
Split data processing into map and reduce phases:
```typescript
// Map phase processes individual items
// Reduce phase combines results
mapNode.next(reduceNode);
```

### 5. Multi-Agent Pattern
Coordinate multiple autonomous agents:
```typescript
// Agents communicate through shared store
agent1.on("task_complete", agent2);
agent2.on("needs_help", agent3);
```

## Agentic Coding Methodology

**7-Step Development Process:**

1. **Requirements** (Human-led): Clarify project goals and AI suitability
2. **Flow Design** (Collaborative): Outline high-level workflow with mermaid diagrams
3. **Utilities** (Collaborative): Implement external integrations and APIs
4. **Node Design** (AI-led): Plan data flow and processing logic
5. **Implementation** (AI-led): Code the nodes and flows
6. **Optimization** (Collaborative): Iterate on performance and accuracy
7. **Reliability** (AI-led): Add error handling, retries, and tests

**Key Principles:**
- Start with simple solutions and iterate
- Design at high level before implementation
- Frequently ask humans for feedback
- Keep utility functions separate and testable
- Use shared store for all inter-node communication

## File Structure Best Practices

```
my-project/
├── docs/
│   └── design.md          # High-level design (no code)
├── src/
│   ├── index.ts           # Entry point
│   ├── types.ts           # Shared interfaces
│   ├── nodes.ts           # Node implementations
│   ├── flow.ts            # Flow definitions
│   └── utils/             # Utility functions
│       ├── callLlm.ts     # LLM integration
│       └── searchWeb.ts   # External APIs
├── package.json
└── tsconfig.json
```

## Integration with QDE Agent System

The QDE Agent project follows PocketFlow patterns:

- **Shared State**: `DealState` interface for communication
- **Specialized Nodes**: Data Collection, Pricing, Validation, Deal Creation agents
- **Action-Based Flow**: Agents return actions like 'pricing', 'validation', 'complete'
- **Error Handling**: Retry logic and fallback methods for API failures
- **Nested Flows**: MCP tools act as utility functions within the larger agent flow

## Best Practices

### Development
- **FAIL FAST**: Avoid try-catch logic to quickly identify weak points
- **Add Logging**: Include comprehensive logging for debugging
- **Keep It Simple**: Avoid complex features and full-scale type checking
- **Idempotent Exec**: Ensure exec() can be safely retried

### Architecture
- **One File Per Utility**: Separate TypeScript files for each API integration
- **Test Utilities**: Include test cases for each utility function
- **High-Level Design**: Document workflow in design.md before coding
- **Shared Store Design**: Plan data structure carefully to avoid repetition

### Error Handling
- **Node Retries**: Configure `maxRetries` and `wait` for unreliable operations
- **Graceful Fallbacks**: Implement `execFallback()` for production resilience
- **Self-Evaluation**: Add LLM-powered validation nodes for uncertain outputs

## Community and Resources

- **GitHub**: [PocketFlow-Typescript](https://github.com/The-Pocket/PocketFlow-Typescript)
- **Documentation**: [Official Docs](https://the-pocket.github.io/PocketFlow/)
- **Discord**: Community support and discussions
- **Philosophy**: [Design Essay](https://github.com/The-Pocket/.github/blob/main/profile/pocketflow.md)

---

**Key Insight**: PocketFlow's power lies not in providing built-in utilities, but in offering a clean, composable abstraction that makes it easy for both humans and AI agents to build complex LLM applications. The framework's minimalist design ensures you're never locked into specific vendors or APIs while maintaining the expressiveness needed for sophisticated workflows.