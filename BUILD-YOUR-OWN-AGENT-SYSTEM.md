# 🏗️ Build Your Own Multi-Agent System - Complete Blueprint

## 📚 Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Step 1: Project Setup](#step-1-project-setup)
3. [Step 2: Define Your Domain Model](#step-2-define-your-domain-model)
4. [Step 3: Implement PocketFlow Base](#step-3-implement-pocketflow-base)
5. [Step 4: Create Your Agents](#step-4-create-your-agents)
6. [Step 5: Build the MCP Integration](#step-5-build-the-mcp-integration)
7. [Step 6: Wire Everything Together](#step-6-wire-everything-together)
8. [Step 7: Testing & Deployment](#step-7-testing--deployment)
9. [Common Patterns & Best Practices](#common-patterns--best-practices)
10. [Adapting to Different Domains](#adapting-to-different-domains)

---

## 🎯 System Architecture Overview

### Core Components You'll Need:

```
┌─────────────────────────────────────────────────────────┐
│                   User Input Layer                       │
│                 (Natural Language)                       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Orchestration Layer                     │
│                    (PocketFlow)                          │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Agent 1    │  │   Agent 2    │  │   Agent N    │
│ (Specialized) │  │ (Specialized) │  │ (Specialized) │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Bridge Layer                      │
│              (API/Database Integration)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  External Systems                        │
│            (APIs, Databases, Services)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Step 1: Project Setup

### 1.1 Initialize Your Project

```bash
# Create project directory
mkdir my-agent-system
cd my-agent-system

# Initialize npm project
npm init -y

# Install essential dependencies
npm install --save \
  typescript \
  @types/node \
  tsx \
  dotenv

# Install dev dependencies
npm install --save-dev \
  @types/jest \
  jest \
  ts-jest \
  nodemon

# Initialize TypeScript
npx tsc --init
```

### 1.2 Create Project Structure

```bash
# Create directory structure
mkdir -p \
  src/pocket-flow \
  src/types \
  src/agents \
  src/infrastructure \
  src/utils \
  mcp/server \
  mcp/tools \
  tests \
  docs \
  examples
```

### 1.3 Setup Configuration Files

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "mcp/**/*", "agents/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "test": "jest",
    "demo": "tsx src/demo.ts",
    "mcp-server": "tsx mcp/server/index.ts",
    "interactive": "tsx interactive-test.ts"
  }
}
```

---

## 🎨 Step 2: Define Your Domain Model

### 2.1 Create Your Shared State Type

**src/types/index.ts:**
```typescript
// Define what data flows between agents
export interface SharedState {
  // Input/Output
  userInput: string;
  finalOutput?: any;
  
  // Phase tracking
  phase: 'initialization' | 'processing' | 'validation' | 'complete' | 'error';
  
  // Data that agents will populate
  extractedData?: any;
  processedData?: any;
  validatedData?: any;
  
  // Error handling
  errors?: string[];
  warnings?: string[];
  
  // Metadata
  startTime?: Date;
  endTime?: Date;
  agentsExecuted?: string[];
}

// Define agent-specific types
export interface AgentRequirements {
  // What an agent needs to start
}

export interface AgentResults {
  // What an agent produces
  success: boolean;
  data?: any;
  error?: string;
}
```

### 2.2 Identify Your Domain Entities

Think about what your system deals with:
- **E-commerce**: Products, Orders, Customers, Inventory
- **Healthcare**: Patients, Appointments, Prescriptions, Records
- **Education**: Students, Courses, Assignments, Grades
- **Finance**: Accounts, Transactions, Portfolios, Reports

---

## 🔧 Step 3: Implement PocketFlow Base

### 3.1 Create the Node Base Class

**src/pocket-flow/node.ts:**
```typescript
export abstract class Node<T> {
  protected maxRetries: number;
  protected waitTime: number;

  constructor(maxRetries = 3, waitTime = 1000) {
    this.maxRetries = maxRetries;
    this.waitTime = waitTime;
  }

  // Preparation phase - gather requirements
  abstract prep(shared: T): Promise<any>;

  // Execution phase - do the work
  abstract exec(prepResult: any): Promise<any>;

  // Post-processing phase - update state and determine next action
  abstract post(shared: T, prepResult: any, execResult: any): Promise<string>;

  // Error recovery
  async execFallback(prepResult: any, error: Error): Promise<any> {
    console.error(`Fallback triggered: ${error.message}`);
    throw error;
  }

  // Main execution with retry logic
  async execute(shared: T): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Run the three phases
        const prepResult = await this.prep(shared);
        const execResult = await this.exec(prepResult);
        const nextAction = await this.post(shared, prepResult, execResult);
        
        return nextAction;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.waitTime));
        }
      }
    }
    
    // All retries failed, try fallback
    if (lastError) {
      const prepResult = await this.prep(shared);
      const fallbackResult = await this.execFallback(prepResult, lastError);
      return this.post(shared, prepResult, fallbackResult);
    }
    
    throw new Error('Execution failed after all retries');
  }
}
```

### 3.2 Create the Flow Orchestrator

**src/pocket-flow/flow.ts:**
```typescript
import { Node } from './node';

export interface FlowConfig {
  nodes: Map<string, Node<any>>;
  transitions: Map<string, Map<string, string>>;
  startNode: string;
}

export class Flow<T> {
  private config: FlowConfig;
  
  constructor(config: FlowConfig) {
    this.config = config;
  }

  async execute(sharedState: T): Promise<T> {
    let currentNode = this.config.startNode;
    const executedNodes = new Set<string>();
    
    while (currentNode) {
      // Prevent infinite loops
      if (executedNodes.has(currentNode)) {
        console.warn(`Detected loop at node: ${currentNode}`);
        break;
      }
      executedNodes.add(currentNode);
      
      // Get and execute the node
      const node = this.config.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node not found: ${currentNode}`);
      }
      
      console.log(`Executing node: ${currentNode}`);
      const action = await node.execute(sharedState);
      
      // Determine next node based on action
      const transitions = this.config.transitions.get(currentNode);
      if (!transitions) {
        console.log('No transitions defined, flow complete');
        break;
      }
      
      currentNode = transitions.get(action) || '';
      
      if (!currentNode) {
        console.log(`Flow complete with action: ${action}`);
        break;
      }
    }
    
    return sharedState;
  }
}
```

---

## 🤖 Step 4: Create Your Agents

### 4.1 Agent Template

**agents/template-agent/index.ts:**
```typescript
import { Node } from '../../src/pocket-flow';
import { SharedState } from '../../src/types';

interface AgentRequirements {
  // Define what this agent needs
  requiredData: string[];
  configuration: any;
}

interface AgentResults {
  // Define what this agent produces
  success: boolean;
  processedData: any;
  metadata: any;
}

export class TemplateAgent extends Node<SharedState> {
  private agentName = 'TemplateAgent';
  
  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: SharedState): Promise<AgentRequirements> {
    console.log(`📊 ${this.agentName}: Preparing requirements...`);
    
    // Analyze what we need from shared state
    const requirements: AgentRequirements = {
      requiredData: this.identifyRequirements(shared),
      configuration: this.loadConfiguration()
    };
    
    return requirements;
  }

  async exec(prepRes: AgentRequirements): Promise<AgentResults> {
    console.log(`🔄 ${this.agentName}: Processing...`);
    
    try {
      // Core business logic here
      const processedData = await this.processData(prepRes);
      
      return {
        success: true,
        processedData,
        metadata: {
          timestamp: new Date(),
          dataPoints: Object.keys(processedData).length
        }
      };
    } catch (error) {
      console.error(`❌ ${this.agentName}: Processing failed:`, error);
      throw error;
    }
  }

  async post(
    shared: SharedState,
    prepRes: AgentRequirements,
    execRes: AgentResults
  ): Promise<string> {
    console.log(`💾 ${this.agentName}: Updating shared state...`);
    
    // Update shared state with results
    shared.processedData = execRes.processedData;
    shared.agentsExecuted = shared.agentsExecuted || [];
    shared.agentsExecuted.push(this.agentName);
    
    // Determine next action
    if (execRes.success) {
      return 'next-agent'; // Return the action for transition
    } else {
      return 'error-handler';
    }
  }

  // Private helper methods
  private identifyRequirements(shared: SharedState): string[] {
    // Logic to identify what data is needed
    return [];
  }

  private loadConfiguration(): any {
    // Load agent-specific configuration
    return {};
  }

  private async processData(requirements: AgentRequirements): Promise<any> {
    // Core processing logic
    return {};
  }

  async execFallback(prepRes: AgentRequirements, error: Error): Promise<AgentResults> {
    console.error(`🔄 ${this.agentName}: Attempting fallback...`);
    
    // Implement fallback logic
    return {
      success: false,
      processedData: {},
      metadata: { error: error.message }
    };
  }
}
```

### 4.2 Real-World Agent Examples

**Data Extraction Agent:**
```typescript
export class DataExtractionAgent extends Node<SharedState> {
  async prep(shared: SharedState): Promise<any> {
    // Identify patterns to extract
    return {
      input: shared.userInput,
      patterns: this.loadExtractionPatterns()
    };
  }

  async exec(prepRes: any): Promise<any> {
    // Use regex, NLP, or LLM to extract data
    const extracted = this.extractDataFromText(prepRes.input, prepRes.patterns);
    return { extracted };
  }

  async post(shared: SharedState, prepRes: any, execRes: any): Promise<string> {
    shared.extractedData = execRes.extracted;
    return shared.extractedData ? 'validation' : 'clarification';
  }
}
```

**Validation Agent:**
```typescript
export class ValidationAgent extends Node<SharedState> {
  async prep(shared: SharedState): Promise<any> {
    return {
      data: shared.extractedData,
      rules: this.loadValidationRules()
    };
  }

  async exec(prepRes: any): Promise<any> {
    const errors = [];
    const warnings = [];
    
    // Apply validation rules
    for (const rule of prepRes.rules) {
      const result = this.validateRule(prepRes.data, rule);
      if (!result.valid) {
        result.severity === 'error' 
          ? errors.push(result.message)
          : warnings.push(result.message);
      }
    }
    
    return { 
      isValid: errors.length === 0,
      errors,
      warnings 
    };
  }

  async post(shared: SharedState, prepRes: any, execRes: any): Promise<string> {
    shared.errors = execRes.errors;
    shared.warnings = execRes.warnings;
    
    return execRes.isValid ? 'processing' : 'error-correction';
  }
}
```

---

## 🌉 Step 5: Build the MCP Integration

### 5.1 MCP Server Setup

**mcp/server/index.ts:**
```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class MCPServer {
  private server: Server;
  private tools: Map<string, any>;

  constructor() {
    this.server = new Server(
      { name: 'my-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    this.tools = new Map();
    this.registerTools();
    this.setupHandlers();
  }

  private registerTools() {
    // Register your tools
    this.tools.set('fetch-data', {
      description: 'Fetch data from external source',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          query: { type: 'object' }
        },
        required: ['source']
      }
    });

    this.tools.set('process-data', {
      description: 'Process data according to rules',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          operation: { type: 'string' }
        },
        required: ['data', 'operation']
      }
    });
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'fetch-data':
          return await this.fetchData(args);
        case 'process-data':
          return await this.processData(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async fetchData(args: any) {
    // Implement data fetching logic
    try {
      // Example: Call external API
      const response = await fetch(`${process.env.API_URL}/${args.source}`, {
        method: 'POST',
        body: JSON.stringify(args.query)
      });
      
      const data = await response.json();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }]
      };
    }
  }

  private async processData(args: any) {
    // Implement data processing logic
    return {
      content: [{
        type: 'text',
        text: 'Processed successfully'
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Server running...');
  }
}

// Start server
const server = new MCPServer();
server.run().catch(console.error);
```

### 5.2 MCP Tool Integration in Agents

**agents/base-agent-with-mcp.ts:**
```typescript
import { spawn } from 'child_process';

export abstract class MCPEnabledAgent extends Node<SharedState> {
  protected async callMCPTool(toolName: string, args: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const mcpPath = './mcp/server/index.ts';
      const child = spawn('npx', ['tsx', mcpPath]);
      
      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse JSON-RPC response
            const response = this.parseResponse(output);
            resolve(response);
          } catch (parseError) {
            reject(new Error(`Failed to parse MCP response: ${parseError}`));
          }
        } else {
          reject(new Error(`MCP call failed with code ${code}: ${error}`));
        }
      });

      // Send the tool call request
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };
      
      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }

  private parseResponse(output: string): string {
    const lines = output.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        if (response.result && response.result.content) {
          return response.result.content[0].text;
        }
      } catch {
        // Continue to next line
      }
    }
    throw new Error('No valid JSON-RPC response found');
  }
}
```

---

## 🔌 Step 6: Wire Everything Together

### 6.1 Create the Infrastructure

**src/infrastructure/index.ts:**
```typescript
import { Flow } from '../pocket-flow/flow';
import { DataExtractionAgent } from '../../agents/data-extraction';
import { ValidationAgent } from '../../agents/validation';
import { ProcessingAgent } from '../../agents/processing';
import { OutputAgent } from '../../agents/output';

export function setupInfrastructure() {
  // Create agent instances
  const agents = {
    extraction: new DataExtractionAgent(),
    validation: new ValidationAgent(),
    processing: new ProcessingAgent(),
    output: new OutputAgent()
  };

  // Define the workflow
  const nodes = new Map([
    ['extraction', agents.extraction],
    ['validation', agents.validation],
    ['processing', agents.processing],
    ['output', agents.output]
  ]);

  // Define transitions (action -> next node)
  const transitions = new Map([
    ['extraction', new Map([
      ['validation', 'validation'],
      ['clarification', 'extraction'],
      ['error', 'error-handler']
    ])],
    ['validation', new Map([
      ['processing', 'processing'],
      ['error-correction', 'extraction'],
      ['error', 'error-handler']
    ])],
    ['processing', new Map([
      ['output', 'output'],
      ['reprocess', 'processing'],
      ['error', 'error-handler']
    ])],
    ['output', new Map([
      ['complete', null],
      ['error', 'error-handler']
    ])]
  ]);

  return new Flow({
    nodes,
    transitions,
    startNode: 'extraction'
  });
}
```

### 6.2 Create the Main Entry Point

**src/index.ts:**
```typescript
import { setupInfrastructure } from './infrastructure';
import { SharedState } from './types';

export async function processRequest(userInput: string): Promise<any> {
  // Initialize shared state
  const sharedState: SharedState = {
    userInput,
    phase: 'initialization',
    startTime: new Date(),
    agentsExecuted: []
  };

  // Setup and run the flow
  const flow = setupInfrastructure();
  
  try {
    const result = await flow.execute(sharedState);
    result.endTime = new Date();
    result.phase = 'complete';
    
    console.log('✅ Processing complete!');
    return result.finalOutput;
  } catch (error) {
    console.error('❌ Processing failed:', error);
    sharedState.phase = 'error';
    sharedState.errors = [error.message];
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const input = process.argv.slice(2).join(' ');
  
  if (!input) {
    console.log('Usage: npm run dev "your input here"');
    process.exit(1);
  }
  
  processRequest(input)
    .then(result => {
      console.log('\nResult:', result);
    })
    .catch(error => {
      console.error('\nError:', error);
      process.exit(1);
    });
}
```

### 6.3 Create Interactive Testing Interface

**interactive-test.ts:**
```typescript
import * as readline from 'readline';
import { processRequest } from './src';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🎯 Interactive Agent System Tester');
  console.log('Type "quit" to exit\n');
  
  while (true) {
    const input = await askQuestion('Enter request: ');
    
    if (input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      break;
    }
    
    try {
      console.log('\nProcessing...\n');
      const result = await processRequest(input);
      console.log('\n✅ Result:', result);
    } catch (error) {
      console.log('\n❌ Error:', error);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  rl.close();
}

main().catch(console.error);
```

---

## 🧪 Step 7: Testing & Deployment

### 7.1 Unit Tests

**tests/agents/data-extraction.test.ts:**
```typescript
import { DataExtractionAgent } from '../../agents/data-extraction';
import { SharedState } from '../../src/types';

describe('DataExtractionAgent', () => {
  let agent: DataExtractionAgent;
  let sharedState: SharedState;

  beforeEach(() => {
    agent = new DataExtractionAgent();
    sharedState = {
      userInput: 'test input',
      phase: 'initialization'
    };
  });

  test('should extract data correctly', async () => {
    const prep = await agent.prep(sharedState);
    expect(prep).toBeDefined();
    
    const exec = await agent.exec(prep);
    expect(exec.success).toBe(true);
    
    const action = await agent.post(sharedState, prep, exec);
    expect(action).toBe('validation');
  });

  test('should handle errors gracefully', async () => {
    sharedState.userInput = '';
    
    const prep = await agent.prep(sharedState);
    const exec = await agent.exec(prep);
    
    expect(exec.success).toBe(false);
  });
});
```

### 7.2 Integration Tests

**tests/integration/full-flow.test.ts:**
```typescript
import { processRequest } from '../../src';

describe('Full Flow Integration', () => {
  test('should process valid request end-to-end', async () => {
    const input = 'Process this test data';
    const result = await processRequest(input);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  test('should handle invalid input', async () => {
    const input = '';
    
    await expect(processRequest(input)).rejects.toThrow();
  });
});
```

### 7.3 Deployment Configuration

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port if needed
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/index.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  agent-system:
    build: .
    environment:
      - NODE_ENV=production
      - API_URL=${API_URL}
      - API_KEY=${API_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  mcp-server:
    build: .
    command: npm run mcp-server
    environment:
      - NODE_ENV=production
    ports:
      - "3001:3001"
    restart: unless-stopped
```

---

## 🎯 Common Patterns & Best Practices

### Pattern 1: Error Recovery Chain
```typescript
class ResilientAgent extends Node<SharedState> {
  async exec(prepRes: any): Promise<any> {
    try {
      return await this.primaryMethod(prepRes);
    } catch (error) {
      console.warn('Primary method failed, trying secondary...');
      
      try {
        return await this.secondaryMethod(prepRes);
      } catch (secondError) {
        console.warn('Secondary failed, using fallback...');
        return await this.fallbackMethod(prepRes);
      }
    }
  }
}
```

### Pattern 2: Parallel Agent Execution
```typescript
class ParallelCoordinator extends Node<SharedState> {
  async exec(prepRes: any): Promise<any> {
    const tasks = [
      this.callAgent1(prepRes),
      this.callAgent2(prepRes),
      this.callAgent3(prepRes)
    ];
    
    const results = await Promise.allSettled(tasks);
    
    return {
      successful: results.filter(r => r.status === 'fulfilled'),
      failed: results.filter(r => r.status === 'rejected')
    };
  }
}
```

### Pattern 3: Dynamic Agent Selection
```typescript
class DynamicRouter extends Node<SharedState> {
  async post(shared: SharedState, prepRes: any, execRes: any): Promise<string> {
    // Dynamically choose next agent based on data
    if (execRes.dataType === 'typeA') {
      return 'agent-type-a';
    } else if (execRes.dataType === 'typeB') {
      return 'agent-type-b';
    } else {
      return 'default-agent';
    }
  }
}
```

### Pattern 4: State Checkpointing
```typescript
class CheckpointAgent extends Node<SharedState> {
  async post(shared: SharedState, prepRes: any, execRes: any): Promise<string> {
    // Save state checkpoint
    await this.saveCheckpoint(shared);
    
    // Can recover from this point if needed
    return 'next-agent';
  }
  
  private async saveCheckpoint(state: SharedState) {
    // Save to database, file, or cache
    await fs.writeFile(
      `checkpoints/${Date.now()}.json`,
      JSON.stringify(state)
    );
  }
}
```

---

## 🌍 Adapting to Different Domains

### E-Commerce Order Processing
```typescript
// Agents: ProductSearch → InventoryCheck → PriceCalculation → PaymentProcessing → OrderConfirmation
interface OrderState {
  customerQuery: string;
  products?: Product[];
  inventory?: InventoryStatus;
  pricing?: PricingDetails;
  payment?: PaymentResult;
  orderNumber?: string;
}
```

### Healthcare Appointment Booking
```typescript
// Agents: PatientVerification → DoctorAvailability → InsuranceCheck → AppointmentScheduling → Confirmation
interface AppointmentState {
  patientRequest: string;
  patientId?: string;
  availableSlots?: TimeSlot[];
  insuranceCoverage?: Coverage;
  appointmentId?: string;
}
```

### Customer Support Ticketing
```typescript
// Agents: IssueClassification → KnowledgeSearch → SolutionGeneration → TicketCreation → ResponseDelivery
interface TicketState {
  customerMessage: string;
  issueCategory?: string;
  relevantArticles?: Article[];
  suggestedSolution?: Solution;
  ticketNumber?: string;
}
```

### Document Processing Pipeline
```typescript
// Agents: FileIngestion → TextExtraction → DataParsing → Validation → StorageUpload
interface DocumentState {
  filePath: string;
  extractedText?: string;
  parsedData?: any;
  validationResults?: ValidationResult;
  storageLocation?: string;
}
```

---

## 🚀 Advanced Features

### 1. Agent Communication Protocol
```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  payload: any;
  timestamp: Date;
}

class MessageBus {
  private subscribers = new Map<string, Function[]>();
  
  subscribe(agent: string, handler: Function) {
    if (!this.subscribers.has(agent)) {
      this.subscribers.set(agent, []);
    }
    this.subscribers.get(agent)!.push(handler);
  }
  
  publish(message: AgentMessage) {
    const handlers = this.subscribers.get(message.to) || [];
    handlers.forEach(handler => handler(message));
  }
}
```

### 2. Agent Performance Monitoring
```typescript
class MonitoredAgent extends Node<SharedState> {
  private metrics = {
    executionCount: 0,
    totalDuration: 0,
    errors: 0,
    successRate: 0
  };
  
  async execute(shared: SharedState): Promise<string> {
    const startTime = Date.now();
    
    try {
      const result = await super.execute(shared);
      this.metrics.executionCount++;
      this.metrics.totalDuration += Date.now() - startTime;
      this.updateSuccessRate();
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.updateSuccessRate();
      throw error;
    }
  }
  
  private updateSuccessRate() {
    this.metrics.successRate = 
      (this.metrics.executionCount - this.metrics.errors) / 
      this.metrics.executionCount * 100;
  }
}
```

### 3. Configuration Management
```typescript
interface AgentConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
  features: {
    [key: string]: boolean;
  };
}

class ConfigurableAgent extends Node<SharedState> {
  private config: AgentConfig;
  
  constructor(config: AgentConfig) {
    super(config.retryPolicy.maxAttempts);
    this.config = config;
  }
  
  async exec(prepRes: any): Promise<any> {
    if (!this.config.enabled) {
      throw new Error('Agent is disabled');
    }
    
    // Use config for execution
    return this.executeWithTimeout(
      () => this.performTask(prepRes),
      this.config.timeout
    );
  }
}
```

---

## 📚 Resources & Learning Path

### Recommended Learning Order:
1. **Understand PocketFlow**: Study the Node lifecycle (prep → exec → post)
2. **Build Simple Agents**: Start with 2-3 basic agents
3. **Add State Management**: Implement shared state passing
4. **Integrate External Systems**: Add MCP or direct API calls
5. **Implement Error Handling**: Add retries and fallbacks
6. **Add Monitoring**: Track performance and errors
7. **Scale Up**: Add more agents and complex workflows

### Key Concepts to Master:
- **Separation of Concerns**: Each agent does ONE thing well
- **State Management**: Efficient data passing between agents
- **Error Recovery**: Graceful degradation and fallbacks
- **Scalability**: Design for parallel execution where possible
- **Monitoring**: Track everything for debugging

### Common Pitfalls to Avoid:
- ❌ Making agents too complex (keep them focused)
- ❌ Tight coupling between agents (use shared state)
- ❌ Ignoring error cases (always have fallbacks)
- ❌ Not testing edge cases (test thoroughly)
- ❌ Hardcoding configuration (use environment variables)

---

## 🎉 Conclusion

You now have a complete blueprint to build multi-agent systems for ANY domain:

1. **Setup** → Project structure and dependencies
2. **Model** → Define your domain and shared state
3. **Base** → Implement PocketFlow foundation
4. **Agents** → Create specialized workers
5. **Bridge** → Connect to external systems via MCP
6. **Wire** → Orchestrate the workflow
7. **Test** → Ensure reliability
8. **Deploy** → Production-ready setup

This pattern works for:
- 🛒 E-commerce automation
- 🏥 Healthcare workflows
- 📊 Data processing pipelines
- 🎓 Educational systems
- 💼 Business process automation
- 🤖 AI orchestration
- And much more!

**Remember**: Start simple, test often, and iterate based on real-world feedback!

---

## 🔗 Quick Reference Commands

```bash
# Start your system
npm run dev "your input here"

# Run interactive mode
npm run interactive

# Start MCP server
npm run mcp-server

# Run tests
npm test

# Build for production
npm run build

# Run in Docker
docker-compose up

# Check logs
docker-compose logs -f agent-system
```

**Happy Building! 🚀**