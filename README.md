# QDE Agent System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An AI-powered agent system for **QDE (Quick Data Entry)** trade operations in the energy sector. Built with [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript) framework and [Model Context Protocol (MCP)](https://github.com/anthropics/mcp).

## 🚀 Features ✅ (PRODUCTION READY)

- **Natural Language Processing**: Transform plain English into validated trade deals
- **4 Specialized Agents**: Complete Data Collection, Pricing, Validation, and Deal Creation pipeline
- **MCP Integration**: Seamless bridge between agents and Alliance Energy API
- **Real-time Pricing**: Live OPIS integration with location differentials and base pricing
- **Smart Validation**: Comprehensive business rules, capacity checks, and error reporting
- **Robust Error Recovery**: Retry mechanisms, fallback strategies, and graceful degradation
- **Intelligent Caching**: Reference data optimization with performance monitoring

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│    User     │───▶│   Main Agent     │───▶│  QDE API    │
└─────────────┘    │  (Orchestrator)  │    └─────────────┘
                   └──────────────────┘           ▲
                            │                     │
              ┌─────────────┼─────────────┐      │
              ▼             ▼             ▼      │
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
    │Data Collection│ │   Pricing   │ │ Validation  │ │
    │    Agent    │ │    Agent    │ │    Agent    │ │
    └─────────────┘ └─────────────┘ └─────────────┘ │
              │             │             │        │
              └─────────────┼─────────────┘        │
                            ▼                      │
                   ┌──────────────────┐           │
                   │   MCP Server     │───────────┘
                   └──────────────────┘
```

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/qde-agent.git
cd qde-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your QDE API endpoint in .env
```

## 🔧 Configuration

Create a `.env` file with your QDE API configuration:

```env
QDE_API_BASE_URL=http://localhost:5000
QDE_API_KEY=your-api-key
MCP_SERVER_PORT=3001
```

## 🚀 Quick Start

### 1. Start the MCP Server

```bash
npm run mcp-server
```

### 2. Run the QDE Agent

```bash
npm run dev
```

### 3. Create a Trade Deal

```bash
# Example natural language input:
"Create a deal with ABC Trading Company for 1000 gallons of gasoline 
from Houston Terminal to Dallas Hub, monthly frequency, 
using current OPIS pricing"
```

## 🤖 Agent Capabilities ✅ (ALL IMPLEMENTED)

### Data Collection Agent ✅
- Fetches companies and counterparties with smart matching
- Retrieves origin/destination locations with intelligent filtering  
- Gets frequency and product information with validation
- Caches reference data for performance with fallback handling

### Pricing Agent ✅
- Accesses real-time OPIS market pricing
- Calculates location differentials with volume considerations
- Computes base price defaults with frequency adjustments
- Combines all pricing components with robust error handling

### Validation Agent ✅
- Comprehensive business rule validation (quantity limits, pricing ranges)
- Reference data validation against live company/location data
- Capacity checking via MCP tools with real-time status
- Detailed error reporting with clarification suggestions

### Deal Creation Agent ✅
- Intelligent payload assembly with smart field extraction
- Real Alliance Energy API integration via MCP tools
- Professional deal confirmation with comprehensive details
- Robust error handling with graceful fallback creation

## 🛠️ Development

### Project Structure

```
qde-agent/
├── src/
│   ├── pocket-flow.ts      # PocketFlow core classes
│   ├── nodes/              # Custom node implementations
│   ├── flows/              # Workflow definitions
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── agents/                 # Specialized agent implementations
│   ├── data-collection/    # Data Collection Agent
│   ├── pricing/           # Pricing Agent
│   ├── validation/        # Validation Agent
│   └── deal-creation/     # Deal Creation Agent
├── mcp/                   # Model Context Protocol
│   ├── server/            # MCP server implementation
│   ├── tools/             # MCP tool definitions
│   └── schemas/           # JSON schemas
├── tests/                 # Test files
└── examples/              # Usage examples
```

### Available Scripts

```bash
npm run dev          # Run development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run mcp-server   # Start MCP server
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- agents/pricing

# Run with coverage
npm test -- --coverage
```

## 📚 Examples

Check the `examples/` directory for:
- Simple trade deal creation
- Complex multi-product deals
- Error handling scenarios
- Custom agent implementations

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript) framework
- Uses [Model Context Protocol](https://github.com/anthropics/mcp) for tool integration
- Inspired by agentic coding principles

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/qde-agent/issues)
- 💬 [Discussions](https://github.com/yourusername/qde-agent/discussions)