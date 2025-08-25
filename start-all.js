#!/usr/bin/env node

/**
 * QDE Agent System - Complete Startup Script
 * 
 * This script starts all 3 required components simultaneously:
 * 1. Alliance Energy API Server (localhost:5000)
 * 2. QDE MCP Server (stdio bridge)
 * 3. Interactive Test Interface (user input)
 * 
 * Usage: node start-all.js
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
const config = {
  allianceEnergyPath: '/Users/nickbrooks/work/alliance/alliance-energy',
  qdePath: '/Users/nickbrooks/work/alliance/qde-agent',
  apiStartupDelay: 8000,  // Wait 8 seconds for API to be ready
  mcpStartupDelay: 3000   // Wait 3 seconds for MCP to be ready
};

let processes = [];
let shutdownInProgress = false;

function log(component, message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${component}]${colors.reset} ${message}`);
}

function startAllianceEnergyAPI() {
  return new Promise((resolve, reject) => {
    log('API', 'Starting Alliance Energy API Server...', colors.blue);
    
    const apiProcess = spawn('./run-webapi-standalone.sh', [], {
      cwd: config.allianceEnergyPath,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    processes.push({ name: 'Alliance Energy API', process: apiProcess });

    apiProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log('API', output, colors.blue);
      }
      // Look for API ready indicators
      if (output.includes('Now listening on') || output.includes('localhost:5000')) {
        resolve();
      }
    });

    apiProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log('API', output, colors.yellow);
      }
      // .NET Core often outputs startup info to stderr
      if (output.includes('Now listening on') || output.includes('localhost:5000')) {
        resolve();
      }
    });

    apiProcess.on('error', (error) => {
      log('API', `Error: ${error.message}`, colors.red);
      reject(error);
    });

    apiProcess.on('exit', (code) => {
      if (!shutdownInProgress) {
        log('API', `Process exited with code ${code}`, colors.red);
      }
    });

    // Fallback: resolve after delay even if we don't see startup message
    setTimeout(() => {
      log('API', 'Assuming API is ready (timeout reached)', colors.yellow);
      resolve();
    }, config.apiStartupDelay);
  });
}

function startQDEMCPServer() {
  return new Promise((resolve, reject) => {
    log('MCP', 'Starting QDE MCP Server...', colors.green);
    
    const mcpProcess = spawn('npm', ['run', 'mcp-server'], {
      cwd: config.qdePath,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    processes.push({ name: 'QDE MCP Server', process: mcpProcess });

    mcpProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log('MCP', output, colors.green);
      }
      // Look for MCP ready indicator
      if (output.includes('MCP server running') || output.includes('stdio')) {
        resolve();
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('ExperimentalWarning')) {
        log('MCP', output, colors.yellow);
      }
      // MCP server logs to stderr
      if (output.includes('MCP server running') || output.includes('stdio')) {
        resolve();
      }
    });

    mcpProcess.on('error', (error) => {
      log('MCP', `Error: ${error.message}`, colors.red);
      reject(error);
    });

    mcpProcess.on('exit', (code) => {
      if (!shutdownInProgress) {
        log('MCP', `Process exited with code ${code}`, colors.red);
      }
    });

    // Fallback: resolve after delay
    setTimeout(() => {
      log('MCP', 'Assuming MCP server is ready (timeout reached)', colors.yellow);
      resolve();
    }, config.mcpStartupDelay);
  });
}

function startInteractiveTest() {
  return new Promise((resolve, reject) => {
    log('TEST', 'Starting Interactive Test Interface...', colors.magenta);
    
    const testProcess = spawn('npx', ['tsx', 'interactive-test-paste-safe.ts'], {
      cwd: config.qdePath,
      stdio: 'inherit',
      shell: true
    });

    processes.push({ name: 'Interactive Test', process: testProcess });

    testProcess.on('error', (error) => {
      log('TEST', `Error: ${error.message}`, colors.red);
      reject(error);
    });

    testProcess.on('exit', (code) => {
      if (!shutdownInProgress) {
        log('TEST', `Interactive test exited with code ${code}`, colors.magenta);
      }
      resolve();
    });
  });
}

function cleanup() {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  
  console.log(`\n${colors.yellow}🛑 Shutting down all processes...${colors.reset}`);
  
  processes.forEach(({ name, process }) => {
    if (!process.killed) {
      log('SHUTDOWN', `Terminating ${name}...`, colors.yellow);
      process.kill('SIGTERM');
      
      // Force kill after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        if (!process.killed) {
          log('SHUTDOWN', `Force killing ${name}...`, colors.red);
          process.kill('SIGKILL');
        }
      }, 5000);
    }
  });
  
  setTimeout(() => {
    console.log(`${colors.green}🛢️ Pipeline shutdown complete. All deals sealed! ⚡${colors.reset}`);
    process.exit(0);
  }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function main() {
  try {
    console.log(`${colors.bright}${colors.cyan}🚀 QDE Agent System - Complete Startup${colors.reset}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`${colors.cyan}Starting all components in sequence...${colors.reset}\n`);

    // Step 1: Start Alliance Energy API
    await startAllianceEnergyAPI();
    log('MAIN', '✅ Alliance Energy API is ready!', colors.green);

    // Step 2: Start QDE MCP Server
    await startQDEMCPServer();
    log('MAIN', '✅ QDE MCP Server is ready!', colors.green);

    // Small delay to ensure everything is stable
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Start Interactive Test
    log('MAIN', '🎯 All systems ready! Starting interactive test...', colors.bright);
    console.log(`${colors.bright}${colors.green}════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}🎉 QDE AGENT SYSTEM READY FOR TESTING! 🎉${colors.reset}`);
    console.log(`${colors.bright}⚡ Fast mode enabled by default for responsiveness${colors.reset}`);
    console.log(`${colors.bright}${colors.green}════════════════════════════════════════════════${colors.reset}\n`);

    await startInteractiveTest();

  } catch (error) {
    log('MAIN', `❌ Startup failed: ${error.message}`, colors.red);
    cleanup();
    process.exit(1);
  }
}

// Display startup banner
console.log(`${colors.bright}${colors.magenta}
╔═══════════════════════════════════════════════════════════════╗
║              QDE CONVERSATIONAL AGENT SYSTEM                 ║
║                                                               ║
║  🏢 Alliance Energy API      → localhost:5000                ║
║  🌉 QDE MCP Server          → stdio bridge                   ║
║  💬 Conversational Interface → natural language chat         ║
║                                                               ║
║  🎯 Talk to create deals: "I need fuel for ABC Trading"      ║
║  Press Ctrl+C to shutdown all components                     ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

// Start the main process
main().catch((error) => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  cleanup();
  process.exit(1);
});