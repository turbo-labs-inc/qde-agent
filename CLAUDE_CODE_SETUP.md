# Claude Code MCP Integration Setup

## Quick Setup Guide

### 1. Build the MCP Server
```bash
npm run build-mcp
```

### 2. Configure Claude Code

Edit your Claude Code configuration file:

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

**Important**: Replace `/Users/nickbrooks/work/qde-agent/` with your actual project path.

### 3. Start Alliance Energy API
```bash
cd /Users/nickbrooks/work/alliance-energy
./run-webapi-standalone.sh
```

This will start the .NET Core API on port 5000 with endpoints at:
- HTTP: http://localhost:5000
- Swagger: http://localhost:5000/swagger

### 4. Restart Claude Code
Close and reopen Claude Code completely.

### 5. Test Integration

In Claude Code, try these commands:

**Customer Data:**
```
Get customer data for "ABC Trading"
```

**Location Data:**
```
Get origin locations
```
```
Find locations matching "Houston"
```
```
Get destination locations matching "Dallas"
```

**Frequency Data:**
```
Get all delivery frequencies
```
```
Find monthly frequency options
```

**Combined Queries:**
```
Find company information for XYZ Logistics and get origin locations
```

### Troubleshooting

- **Tool not found**: Check the absolute path in config file
- **API errors**: Ensure Alliance Energy API is running on port 5000
- **Permission issues**: Make sure build/index.js has execute permissions
- **.NET not found**: Install .NET 6 SDK if the API fails to start

### Test Commands

**Test MCP server directly:**
```bash
# Test customer data
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_customer_data", "arguments": {"companyName": "ABC Trading"}}}' | node mcp/customer-server/build/index.js

# Test location data
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_location_data", "arguments": {"locationType": "origin", "locationName": "Houston"}}}' | node mcp/customer-server/build/index.js

# Test frequency data
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_frequency_data", "arguments": {"frequencyName": "monthly"}}}' | node mcp/customer-server/build/index.js
```

**Test full agent workflow:**
```bash
npm run dev -- "Create a deal with ABC Trading Company for 5000 gallons from Houston Terminal to Dallas Hub"
```

**Available MCP Tools:**
- `get_customer_data` - Find companies by name
- `get_location_data` - Get origin/destination locations
- `get_frequency_data` - Get delivery frequencies