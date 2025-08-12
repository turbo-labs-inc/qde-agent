#!/bin/bash

# Test script for MCP integration with Alliance Energy API

echo "======================================"
echo "Testing QDE MCP Integration"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Alliance Energy API is running
echo -e "${YELLOW}1. Checking Alliance Energy API...${NC}"
if curl -s http://localhost:5000/api/fake/tradeentry/externalcompanies?getByPrimaryMarketer=false > /dev/null; then
    echo -e "${GREEN}✓ Alliance Energy API is running on port 5000${NC}"
else
    echo -e "${RED}✗ Alliance Energy API is not running${NC}"
    echo -e "${YELLOW}Please start it with: cd /Users/nickbrooks/work/alliance-energy && ./run-webapi-standalone.sh${NC}"
    exit 1
fi

# Check if MCP server is built
echo -e "${YELLOW}2. Checking MCP server build...${NC}"
if [ -f "mcp/customer-server/build/index.js" ]; then
    echo -e "${GREEN}✓ MCP server is built${NC}"
else
    echo -e "${YELLOW}Building MCP server...${NC}"
    npm run build-mcp
fi

# Test MCP tools directly
echo -e "${YELLOW}3. Testing MCP tools...${NC}"

echo -e "${YELLOW}Testing customer data tool...${NC}"
CUSTOMER_TEST='{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_customer_data", "arguments": {"companyName": "ABC Trading"}}}'
echo "$CUSTOMER_TEST" | node mcp/customer-server/build/index.js 2>/dev/null | grep -q "ABC Trading" && echo -e "${GREEN}✓ Customer data tool working${NC}" || echo -e "${RED}✗ Customer data tool failed${NC}"

echo -e "${YELLOW}Testing location data tool...${NC}"
LOCATION_TEST='{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_location_data", "arguments": {"locationType": "origin"}}}'
echo "$LOCATION_TEST" | node mcp/customer-server/build/index.js 2>/dev/null | grep -q "Terminal\|Hub" && echo -e "${GREEN}✓ Location data tool working${NC}" || echo -e "${RED}✗ Location data tool failed${NC}"

echo -e "${YELLOW}Testing frequency data tool...${NC}"
FREQUENCY_TEST='{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_frequency_data", "arguments": {}}}'
echo "$FREQUENCY_TEST" | node mcp/customer-server/build/index.js 2>/dev/null | grep -q "Monthly\|Weekly" && echo -e "${GREEN}✓ Frequency data tool working${NC}" || echo -e "${RED}✗ Frequency data tool failed${NC}"

# Test API endpoints directly
echo -e "${YELLOW}4. Testing API endpoints directly...${NC}"

echo -e "${YELLOW}Testing companies endpoint...${NC}"
curl -s "http://localhost:5000/api/fake/tradeentry/externalcompanies?getByPrimaryMarketer=false" | grep -q "ABC Trading" && echo -e "${GREEN}✓ Companies endpoint working${NC}" || echo -e "${RED}✗ Companies endpoint failed${NC}"

echo -e "${YELLOW}Testing locations endpoint...${NC}"
curl -s "http://localhost:5000/api/fake/tradeentry/customoriginlocations?showFiltered=false" | grep -q "Terminal\|Hub" && echo -e "${GREEN}✓ Origin locations endpoint working${NC}" || echo -e "${RED}✗ Origin locations endpoint failed${NC}"

echo -e "${YELLOW}Testing frequencies endpoint...${NC}"
curl -s "http://localhost:5000/api/fake/tradeentry/customfrequencyvalues" | grep -q "Monthly\|Weekly" && echo -e "${GREEN}✓ Frequencies endpoint working${NC}" || echo -e "${RED}✗ Frequencies endpoint failed${NC}"

echo ""
echo -e "${GREEN}======================================"
echo -e "${GREEN}Integration Test Complete!${NC}"
echo -e "${GREEN}======================================"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Configure Claude Code with MCP server path"
echo -e "2. Restart Claude Code"
echo -e "3. Test with: 'Get customer data for ABC Trading'"
echo ""