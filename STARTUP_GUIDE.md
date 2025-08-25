# 🚀 QDE Agent System - One-Command Startup

## Quick Start

Instead of opening 3 separate terminals, now you can start everything with one command:

```bash
npm run start-all
```

## What This Does

The `start-all.js` script automatically starts all 3 required components in the correct order:

1. **🏢 Alliance Energy API** (localhost:5000)
   - Starts the .NET Core trading API
   - Waits for it to be ready before proceeding

2. **🌉 QDE MCP Server** (stdio bridge)
   - Starts the MCP server that bridges agents to API
   - Provides 4 tools for the agent system

3. **🎯 Interactive Test Interface**
   - Starts the command-line interface
   - Ready to accept natural language deal requests

## Usage

```bash
cd /Users/nickbrooks/work/alliance/qde-agent
npm run start-all
```

You'll see colored output from all 3 components, then the interactive prompt:

```
🎯 Enter deal request: Create a deal with ABC Trading for 5000 gallons of propane from Houston to Dallas
```

## Shutdown

Press **Ctrl+C** once and all components will shut down gracefully.

## Alternative Commands

If you prefer to run components individually:

```bash
# Just the interactive test (requires API and MCP to be running)
npm run interactive

# Just the MCP server
npm run mcp-server

# Just the Alliance Energy API
cd /Users/nickbrooks/work/alliance/alliance-energy
./run-webapi-standalone.sh
```

## Troubleshooting

### Port 5000 Already in Use
```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process if needed
kill -9 <PID>
```

### API Won't Start
- Make sure .NET 6 SDK is installed
- Check if you're in the correct directory
- Try running the API manually first

### MCP Server Issues
- Ensure all npm dependencies are installed
- Check that TypeScript files compile without errors

### Interactive Test Not Working
- Verify the infrastructure setup completes successfully
- Check that all 4 agents are registered properly

## What You'll See

Successful startup looks like this:

```
🚀 QDE Agent System - Complete Startup
==================================================
[10:15:23] [API] Starting Alliance Energy API Server...
[10:15:30] [API] Now listening on: http://localhost:5000
[10:15:30] [MAIN] ✅ Alliance Energy API is ready!
[10:15:31] [MCP] Starting QDE MCP Server...
[10:15:33] [MCP] QDE MCP server running on stdio
[10:15:33] [MAIN] ✅ QDE MCP Server is ready!
[10:15:35] [TEST] Starting Interactive Test Interface...
[10:15:37] [MAIN] 🎯 All systems ready! Starting interactive test...
════════════════════════════════════════════════
🎉 QDE AGENT SYSTEM READY FOR TESTING! 🎉
════════════════════════════════════════════════

🎯 QDE Agent System - Interactive Testing
==========================================

🚀 Setting up infrastructure...
✅ Infrastructure ready!

🎬 Welcome to the Interactive QDE Testing Tool!
   Type your deal requests in natural language.
   Type "examples" to see sample requests.
   Type "quit" or "exit" to stop.

🎯 Enter deal request: 
```

Now you can test deal creation with natural language!