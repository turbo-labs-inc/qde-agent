# QDE Interactive Deal Creation Testing Guide

## Overview

This document outlines the **Interactive Deal Creation Testing Process** for the QDE (Quick Data Entry) Agent System. This test demonstrates the complete integration between Claude Code AI and the Alliance Energy trading platform through the QDE MCP server.

## Test Objective

Validate that Claude Code can conduct an **intelligent interview process** to create energy trade deals by:
- ✅ Asking targeted questions for each deal component
- ✅ Using QDE MCP tools to validate answers in real-time
- ✅ Providing helpful feedback when inputs are invalid
- ✅ Guiding users toward valid options from Alliance Energy data
- ✅ Successfully creating deals in the trading system

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Claude Code   │───▶│   QDE MCP Server │───▶│  Alliance Energy    │
│  (AI Interview) │    │   (Tool Bridge)  │    │  API (Trading Data) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
        │                        │                         │
        ▼                        ▼                         ▼
  Natural Language    ┌──────────────────────┐      Real Trading Data
  Deal Requests       │ 4 QDE MCP Tools:     │      ├─ Companies
  User Responses      │ • search-reference   │      ├─ Locations  
  Validation Feedback │ • get-pricing        │      ├─ Products
                      │ • calculate-pricing  │      ├─ Market Prices
                      │ • manage-deals       │      └─ Business Rules
                      └──────────────────────┘
```

## QDE MCP Tools Reference

### 1. **qde-search-trade-reference-data** 🔍
**Purpose**: Search Alliance Energy reference data
```typescript
// Usage Examples:
{type: "companies"}              // Find trading partners
{type: "origin-locations"}       // Get pickup points
{type: "destination-locations"}  // Get delivery locations  
{type: "frequencies"}           // Get delivery schedules
```

### 2. **qde-get-market-pricing-data** 📊
**Purpose**: Retrieve market pricing information
```typescript
// Usage Examples:
{type: "price-publishers"}                           // OPIS, Platts, etc.
{type: "opis-price", locationId: 100, productId: 1} // Historical prices
{type: "price-components", id: 5}                   // Product pricing
```

### 3. **qde-calculate-trade-pricing** 💰
**Purpose**: Perform pricing calculations
```typescript
// Usage Examples:
{type: "book-from-location", locationId: 100}       // Location booking
{type: "location-diff-price", locationId: 100}      // Price differentials
{type: "base-price-default", locationId: 100}       // Base pricing
```

### 4. **qde-manage-trade-deals** 📝
**Purpose**: Complete deal management
```typescript
// Usage Examples:
{action: "create", dealData: {...}}     // Create new deal
{action: "list", filters: {...}}        // Search existing deals
{action: "get", dealId: "12345"}        // Retrieve specific deal
```

## Test Setup Instructions

### Step 1: Start Alliance Energy API
```bash
cd /Users/nickbrooks/work/alliance/alliance-energy
./run-webapi-standalone.sh
```
✅ **Verify**: API running at `http://localhost:5000`
✅ **Check**: Swagger docs at `http://localhost:5000/swagger`

### Step 2: Start QDE MCP Server
```bash
cd /Users/nickbrooks/work/alliance/qde-agent
npm install
npm run mcp-server
```
✅ **Verify**: See "QDE MCP server running on stdio"
✅ **Check**: No error messages in console

### Step 3: Verify Claude Code Integration
Ensure Claude Code can access QDE MCP tools:
- Check for `qde-search-trade-reference-data` tool
- Check for `qde-get-market-pricing-data` tool
- Check for `qde-calculate-trade-pricing` tool
- Check for `qde-manage-trade-deals` tool

## Test Execution Process

### Initiate Test
**Command to Claude Code:**
> "Please conduct an interactive interview to create a trade deal using the QDE MCP tools. Ask me questions for each deal component and validate my answers against the Alliance Energy API in real-time."

### Interview Flow Checklist

#### 1. **Counterparty Selection** ✅
- [ ] Ask for company name
- [ ] Use `qde-search-trade-reference-data` (type: "companies")
- [ ] Validate company exists
- [ ] Suggest alternatives if invalid
- [ ] Confirm selection

#### 2. **Product Selection** ✅
- [ ] Ask for product type
- [ ] Validate against available products
- [ ] Provide product options if needed
- [ ] Confirm product selection

#### 3. **Origin Location** ✅
- [ ] Ask for pickup location
- [ ] Use `qde-search-trade-reference-data` (type: "origin-locations")
- [ ] Validate location exists
- [ ] Show location options if needed
- [ ] Confirm origin location

#### 4. **Destination Location** ✅
- [ ] Ask for delivery location
- [ ] Use `qde-search-trade-reference-data` (type: "destination-locations")
- [ ] Validate location exists
- [ ] Show delivery options if needed
- [ ] Confirm destination location

#### 5. **Quantity Specification** ✅
- [ ] Ask for volume amount
- [ ] Validate reasonable quantities
- [ ] Suggest typical ranges if needed
- [ ] Confirm quantity

#### 6. **Delivery Frequency** ✅
- [ ] Ask for delivery schedule
- [ ] Use `qde-search-trade-reference-data` (type: "frequencies")
- [ ] Show available frequencies
- [ ] Confirm frequency selection

#### 7. **Date Range** ✅
- [ ] Ask for start and end dates
- [ ] Validate logical date ranges
- [ ] Ensure future dates
- [ ] Confirm date range

#### 8. **Pricing (Optional)** ✅
- [ ] Ask about pricing preference
- [ ] Use `qde-get-market-pricing-data` if needed
- [ ] Explain pricing options
- [ ] Confirm pricing method

#### 9. **Deal Creation** ✅
- [ ] Review all collected information
- [ ] Ask for final confirmation
- [ ] Use `qde-manage-trade-deals` (action: "create")
- [ ] Report success or handle errors
- [ ] Provide deal ID if successful

## Expected Claude Code Behaviors

### ✅ **Correct Behaviors**
- **Sequential questioning**: Ask one component at a time
- **Real-time validation**: Use MCP tools to check each answer
- **Helpful feedback**: Explain why inputs are invalid
- **Smart suggestions**: Offer valid alternatives from Alliance Energy data
- **Error recovery**: Guide users to correct invalid inputs
- **Final confirmation**: Review all data before creating deal

## 📋 Available Deal Options

### 🏢 **Customer/Company Examples**
*Use `qde-search-trade-reference-data` with type: "companies"*
- ABC Energy Partners (ID: 1005)
- Energy Solutions LLC (ID: 1004)
- Global Energy Corp (ID: 1003)
- Houston Energy Trading (ID: 1002)
- Alliance Energy Partners (ID: 1001)
- Texas Fuel Distributors (ID: 1006)
- Southwest Gas Holdings (ID: 1007)
- Midstream Energy Co (ID: 1008)

### 🛢️ **Product Types Available**
*Standard fuel products in the system*
- **Propane** (ID: 1) - Most common, residential/commercial
- **Gasoline Regular Unleaded** (ID: 2) - Automotive fuel
- **Diesel** (ID: 3) - Commercial/industrial fuel
- **Butane** (ID: 4) - Industrial applications
- **Natural Gas** (ID: 5) - Pipeline gas

### 🗺️ **Origin Location Examples** 
*Use `qde-search-trade-reference-data` with type: "origin-locations"*
- Houston Terminal (ID: 100) - Major Texas hub
- Beaumont Terminal (ID: 101) - Gulf Coast refinery area
- Corpus Christi Terminal (ID: 102) - South Texas port
- Dallas Terminal (ID: 103) - North Texas distribution
- Austin Terminal (ID: 104) - Central Texas hub
- San Antonio Terminal (ID: 105) - South Central Texas
- Tyler Terminal (ID: 106) - East Texas hub
- Midland Terminal (ID: 107) - West Texas oil region

### 🎯 **Destination Location Examples**
*Use `qde-search-trade-reference-data` with type: "destination-locations"*
- Dallas Hub (ID: 200) - Major metropolitan delivery
- Austin Hub (ID: 201) - Capital city distribution
- San Antonio Hub (ID: 202) - Military city delivery
- Fort Worth Hub (ID: 203) - DFW area coverage
- El Paso Hub (ID: 204) - West Texas border
- Amarillo Hub (ID: 205) - Texas Panhandle
- Lubbock Hub (ID: 206) - West Texas plains
- Waco Hub (ID: 207) - Central Texas corridor

### ⏰ **Delivery Frequency Options**
*Use `qde-search-trade-reference-data` with type: "frequencies"*
- **Daily** (ID: 1) - High-volume, consistent supply
- **Weekly** (ID: 2) - Regular commercial delivery
- **Monthly** (ID: 3) - Standard business frequency
- **Quarterly** (ID: 4) - Seasonal or bulk contracts
- **One-time** (ID: 5) - Spot market transactions

### 📊 **Typical Quantity Ranges**
*Volume amounts commonly traded*
- **Small Commercial**: 1,000 - 5,000 gallons
- **Medium Commercial**: 5,000 - 25,000 gallons  
- **Large Commercial**: 25,000 - 100,000 gallons
- **Industrial**: 100,000+ gallons
- **Spot Market**: Variable, often 5,000 - 50,000 gallons

### ❌ **Behaviors to Avoid**
- **Creating script files** to test MCP functionality
- **Skipping validation** of user inputs
- **Accepting invalid data** without checking
- **Not using MCP tools** for real-time validation
- **Saving interview data** to unnecessary files
- **Batch questioning** instead of step-by-step process

## Test Scenarios

### Scenario 1: **Happy Path** 🎯
- All valid inputs provided
- Smooth progression through interview
- Successful deal creation
- Clear confirmation message

### Scenario 2: **Invalid Company** ⚠️
- User provides non-existent company name
- Claude should suggest valid companies from Alliance Energy
- Guide user to correct selection

### Scenario 3: **Invalid Locations** ⚠️
- User provides wrong location names
- Claude should show available locations
- Help user find correct pickup/delivery points

### Scenario 4: **Invalid Dates** ⚠️
- User provides past dates or illogical ranges
- Claude should explain date requirements
- Guide to reasonable future date ranges

### Scenario 5: **Incomplete Information** ⚠️
- User provides vague or missing details
- Claude should ask clarifying questions
- Use MCP tools to provide specific options

## Success Criteria

### Technical Validation ✅
- [ ] All QDE MCP tools used appropriately
- [ ] Real-time validation performed for each input
- [ ] Alliance Energy API data retrieved successfully
- [ ] Deal created in trading system with valid ID

### User Experience ✅
- [ ] Clear, step-by-step questioning process
- [ ] Helpful feedback for invalid inputs
- [ ] Smooth error recovery and guidance
- [ ] Professional interview flow
- [ ] Final deal confirmation with details

### Data Integrity ✅
- [ ] All deal components validated against Alliance Energy
- [ ] Business rules enforced correctly
- [ ] Pricing calculations accurate (if applicable)
- [ ] Deal structure matches Alliance Energy requirements

## Troubleshooting

### Common Issues
```bash
# MCP tools not available
npm run mcp-server  # Restart QDE server

# Alliance Energy API not responding  
./run-webapi-standalone.sh  # Restart API

# Invalid reference data
curl http://localhost:5000/api/fake/tradeentry/externalcompanies  # Test API

# Tool execution errors
# Check QDE server console for error messages
```

### Debug Checklist
- [ ] Alliance Energy API accessible at localhost:5000
- [ ] QDE MCP server running without errors
- [ ] Claude Code can see qde-* tools
- [ ] No network connectivity issues
- [ ] Valid sample data in Alliance Energy database

## Sample Interview Session

```
Claude: "I'll help you create a trade deal. What company would you like to trade with?"

User: "ABC Energy"

Claude: [Uses qde-search-trade-reference-data] 
"I found 'ABC Energy Partners' (ID: 1005) in the Alliance Energy system. Is this the correct company?"

User: "Yes, that's right"

Claude: "Perfect! What product would you like to trade? Common options include Propane, Butane, Gasoline, and Natural Gas."

User: "Propane"

Claude: "Great choice! Where should we pick up the propane?"
[Uses qde-search-trade-reference-data for origin-locations]
"I can see several options including Houston Terminal, Beaumont Terminal, and Corpus Christi Terminal. Which would you prefer?"

...continues through all components...

Claude: "Let me review your deal:
- Company: ABC Energy Partners
- Product: Propane  
- Origin: Houston Terminal
- Destination: Dallas Hub
- Quantity: 5000 gallons
- Frequency: Monthly
- Start Date: 2024-09-01
- End Date: 2024-12-31

Does this look correct?"

User: "Yes, create the deal"

Claude: [Uses qde-manage-trade-deals]
"Deal created successfully! Your new deal ID is 12345. The deal is now active in the Alliance Energy trading system."
```

## Notes

This interactive testing process demonstrates the power of AI-assisted deal creation, transforming complex energy trading workflows into simple conversational interfaces while maintaining full integration with production trading systems.