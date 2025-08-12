# MCP Implementation Guide for QDE Agent System

## Overview

This guide walks through implementing Model Context Protocol (MCP) integration to replace mock data with real API calls in our QDE Agent System. We'll start simple with a customer data tool and expand from there.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [MCP Architecture Overview](#mcp-architecture-overview)
3. [Building Your First MCP Server](#building-your-first-mcp-server)
4. [Customer Data Tool Implementation](#customer-data-tool-implementation)
5. [Claude Code Integration](#claude-code-integration)
6. [Agent Integration](#agent-integration)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js version 16 or higher
- TypeScript
- QDE Mock API running on `http://localhost:8000`

Verify your setup:
```bash
node --version
npm --version
```

### Knowledge Requirements

- TypeScript
- Understanding of LLMs like Claude
- Basic API concepts

### CRITICAL: MCP Logging Rules

⚠️ **STDIO-based servers must NEVER write to stdout**

```typescript
// ❌ BAD (corrupts JSON-RPC messages)
console.log("Server started");

// ✅ GOOD (stderr is safe)
console.error("Server started");
```

## MCP Architecture Overview

### Why MCP for QDE Agent System?

**Current Problem**: Our agents use mock data and direct API calls:
```typescript
// Current approach - direct API calls
const companies = await axios.get('/api/fake/tradeentry/externalcompanies');
```

**MCP Solution**: Standardized tool interface:
```typescript
// MCP approach - standardized tools
const companies = await mcpTool.execute({type: 'companies'});
```

### Benefits

1. **Standardization**: All agents use consistent tool interface
2. **Abstraction**: MCP handles API complexity, auth, error handling
3. **Reusability**: Tools work with Claude Code, Claude Desktop, agents
4. **Type Safety**: Schema validation for inputs/outputs

### Architecture Flow

```
User Input → Agent → MCP Tool → QDE API → Response → Agent → User
```

## Building Your First MCP Server

### Step 1: Project Setup

Create MCP server structure:
```bash
cd /Users/nickbrooks/work/qde-agent
mkdir -p mcp/customer-server
cd mcp/customer-server
```

### Step 2: Package Configuration

Update your main `package.json` to add MCP build support:

```json
{
  "scripts": {
    "build-mcp": "tsc -p mcp/customer-server/tsconfig.json && chmod 755 mcp/customer-server/build/index.js"
  }
}
```

Create `mcp/customer-server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Create `mcp/customer-server/package.json`:
```json
{
  "name": "qde-customer-mcp",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "qde-customer": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod 755 build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.8.2"
  }
}
```

Install dependencies:
```bash
cd mcp/customer-server
npm install
```

### Step 3: Server Implementation

Create `mcp/customer-server/src/index.ts`:

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

const QDE_API_BASE = "http://localhost:8000";

// Create server instance
const server = new McpServer({
  name: "qde-customer",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for QDE API requests
async function makeQDERequest<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await axios.get(`${QDE_API_BASE}${endpoint}`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok && response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.data as T;
  } catch (error) {
    console.error("Error making QDE request:", error);
    return null;
  }
}

// Company data interface
interface Company {
  value: string;
  text: string;
}

// Register customer data tool
server.tool(
  "get_customer_data",
  "Get customer company information by company name",
  {
    companyName: z.string().describe("Name of the company to search for"),
    exactMatch: z.boolean().optional().describe("Whether to require exact name match (default: false)")
  },
  async ({ companyName, exactMatch = false }) => {
    console.error(`Fetching customer data for: ${companyName}`);
    
    const companiesData = await makeQDERequest<Company[]>('/api/fake/tradeentry/externalcompanies');

    if (!companiesData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve customer data from QDE API",
          },
        ],
      };
    }

    // Filter companies based on name match
    let matchingCompanies: Company[];
    
    if (exactMatch) {
      matchingCompanies = companiesData.filter(
        company => company.text.toLowerCase() === companyName.toLowerCase()
      );
    } else {
      matchingCompanies = companiesData.filter(
        company => company.text.toLowerCase().includes(companyName.toLowerCase())
      );
    }

    if (matchingCompanies.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No customer found matching "${companyName}". Available companies: ${companiesData.map(c => c.text).join(', ')}`,
          },
        ],
      };
    }

    // Format response
    const resultText = matchingCompanies.length === 1
      ? `Customer found: ${matchingCompanies[0].text} (ID: ${matchingCompanies[0].value})`
      : `Multiple customers found matching "${companyName}":\n${matchingCompanies.map(c => `- ${c.text} (ID: ${c.value})`).join('\n')}`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QDE Customer MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

### Step 4: Build the Server

```bash
cd mcp/customer-server
npm run build
```

This creates `mcp/customer-server/build/index.js` ready for use.

## Customer Data Tool Implementation

### Tool Specification

Our `get_customer_data` tool:

- **Input**: `companyName` (string), `exactMatch` (optional boolean)
- **Output**: Customer information with ID and name
- **API**: Calls QDE mock API `/api/fake/tradeentry/externalcompanies`
- **Matching**: Fuzzy search by default, exact match optional

### Example Usage

```bash
# Test the tool directly
echo '{"method": "call_tool", "params": {"name": "get_customer_data", "arguments": {"companyName": "ABC Trading"}}}' | node mcp/customer-server/build/index.js
```

## Claude Code Integration

### Step 1: Configure Claude Code

Create or edit your Claude Code configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "qde-customer": {
      "command": "node",
      "args": ["/Users/nickbrooks/work/qde-agent/mcp/customer-server/build/index.js"]
    }
  }
}
```

**Important**: Use the **absolute path** to your built server file.

### Step 2: Restart Claude Code

Close and reopen Claude Code completely for the configuration to take effect.

### Step 3: Test Integration

In a Claude Code conversation, try:

```
Get customer data for "XYZ Logistics"
```

You should see Claude Code automatically call your MCP tool and return customer information.

## Agent Integration

### Modify Data Collection Agent

Update `agents/data-collection/index.ts` to use MCP instead of mock data:

```typescript
import { spawn } from 'child_process';

export class DataCollectionAgent extends Node<DealState> {
  
  // Replace mockFetchCompanies with MCP call
  private async mcpFetchCompanies(companyName?: string): Promise<Company[]> {
    if (!companyName) {
      // If no specific company, get all companies
      return this.mockFetchCompanies(); // Keep fallback for now
    }

    try {
      const mcpResponse = await this.callMCPTool('get_customer_data', {
        companyName,
        exactMatch: false
      });
      
      // Parse MCP response and convert to Company array
      // This is a simplified example - in practice you'd parse the text response
      return [
        { value: "1001", text: companyName } // Simplified for demo
      ];
      
    } catch (error) {
      console.error('MCP call failed, using fallback:', error);
      return this.mockFetchCompanies();
    }
  }

  // Helper method to call MCP tools
  private async callMCPTool(toolName: string, args: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const mcpPath = '/Users/nickbrooks/work/qde-agent/mcp/customer-server/build/index.js';
      const child = spawn('node', [mcpPath]);
      
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
          resolve(output);
        } else {
          reject(new Error(`MCP call failed: ${error}`));
        }
      });

      // Send the tool call request
      const request = {
        method: "call_tool",
        params: {
          name: toolName,
          arguments: args
        }
      };
      
      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }
}
```

## Testing & Validation

### 1. Test MCP Server Directly

```bash
cd mcp/customer-server
echo '{"method": "call_tool", "params": {"name": "get_customer_data", "arguments": {"companyName": "ABC Trading"}}}' | node build/index.js
```

Expected output:
```
Customer found: ABC Trading Company (ID: 1001)
```

### 2. Test Claude Code Integration

1. Open Claude Code
2. Start a conversation
3. Ask: "Get customer data for ABC Trading"
4. Verify tool is called and returns data

### 3. Test Agent Integration

```bash
npm run dev -- "Create a deal with ABC Trading Company for 5000 gallons"
```

Verify the Data Collection Agent uses MCP tool instead of mock data.

### 4. End-to-End Test

Complete workflow test:
```bash
npm run mock-api &  # Start QDE API
# In new terminal:
npm run dev -- "I want to make a deal with XYZ Logistics for 10000 gallons from Houston to Dallas"
```

Expected flow:
1. Orchestrator parses "XYZ Logistics"
2. Data Collection Agent calls MCP tool
3. MCP tool queries QDE API
4. Returns customer data
5. Deal creation continues

## Troubleshooting

### Common Issues

#### 1. "Connection refused" errors
- **Cause**: QDE Mock API not running
- **Solution**: Start with `npm run mock-api`

#### 2. "MCP server not found"
- **Cause**: Incorrect path in Claude Code config
- **Solution**: Use absolute path to built server

#### 3. "Tool not available"
- **Cause**: Claude Code config not loaded
- **Solution**: Restart Claude Code completely

#### 4. JSON-RPC errors
- **Cause**: stdout contamination
- **Solution**: Use `console.error()` instead of `console.log()`

#### 5. TypeScript build errors
- **Cause**: Missing dependencies or config issues
- **Solution**: Check tsconfig.json and run `npm install`

### Debug Mode

Enable detailed logging:

```typescript
// In MCP server
console.error("Debug: Tool called with args:", JSON.stringify(arguments));
```

### Validation Checklist

- [ ] QDE Mock API running on port 8000
- [ ] MCP server builds without errors
- [ ] Claude Code config has absolute path
- [ ] Tool responds to direct JSON-RPC calls
- [ ] Claude Code can call tool successfully
- [ ] Agent integration works end-to-end

## Next Steps

After customer data tool works:

1. **Expand MCP Tools**: Add location data, frequency data tools
2. **Replace All Mock Data**: Update all agents to use MCP
3. **Production API**: Point MCP to real QDE API instead of mock
4. **Error Handling**: Add comprehensive retry logic and fallbacks
5. **Monitoring**: Add logging and metrics to MCP tools

## Resources

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Code MCP Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)

---

**Remember**: Start simple, test each step, and build incrementally. MCP provides powerful abstractions, but master the basics first!