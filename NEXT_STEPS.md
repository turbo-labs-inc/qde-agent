# QDE Agent System - Next Steps

## 🎯 Project Status Overview

The **QDE Enhanced Multi-Agent Infrastructure** is **100% complete** and fully operational! 

✅ **Infrastructure Complete:**
- Agent Registry with discovery and health checking
- Observable Flow with comprehensive logging and metrics
- Dynamic Flow Configuration with JSON-based workflows
- Workflow Orchestrator with priority queuing and concurrent execution

✅ **1/4 Agents Fully Implemented:**
- **Data Collection Agent** - Fully working with MCP integration and fallbacks

🚧 **3/4 Agents Need Real Implementation:**
- **Pricing Agent** - Currently placeholder
- **Validation Agent** - Currently placeholder  
- **Deal Creation Agent** - Currently placeholder

---

## 🚀 Next Steps to Complete All 4 Agents

### **Step 1: Implement Pricing Agent** 
**Priority: HIGH** | **Estimated Time: 4-6 hours**

**Location:** `/agents/pricing/index.ts`

**Current Status:** Smart placeholder that simulates pricing calculations

**What Needs to Be Done:**
```typescript
class PricingAgent extends Node<DealState> {
  async prep(shared: DealState) {
    // Extract pricing requirements from deal data
    // Validate required fields for pricing calculations
  }

  async exec() {
    // 1. Call qde-get-market-pricing-data for OPIS prices
    // 2. Call qde-calculate-trade-pricing for location differentials  
    // 3. Call qde-calculate-trade-pricing for base price calculations
    // 4. Combine all pricing components into final structure
  }

  async post(shared: DealState, prepRes: any, execRes: any) {
    // Update shared.dealData.pricing with calculated prices
    // Set phase to 'validation'
    // Return 'success' or error action
  }
}
```

**Required MCP Tool Integration:**
- `qde-get-market-pricing-data` with type `"opis-price"`
- `qde-calculate-trade-pricing` with type `"location-diff-price"`
- `qde-calculate-trade-pricing` with type `"base-price-default"`

**Key Implementation Tasks:**
1. ✅ Replace placeholder with real Node class extending pattern
2. ✅ Add MCP tool calls for current market pricing
3. ✅ Implement location differential calculations
4. ✅ Add base price calculations with frequency adjustments
5. ✅ Combine pricing components into coherent structure
6. ✅ Add error handling for failed pricing calculations
7. ✅ Update agent registration with correct capabilities

---

### **Step 2: Implement Validation Agent**
**Priority: HIGH** | **Estimated Time: 3-4 hours**

**Location:** `/agents/validation/index.ts`

**Current Status:** Smart placeholder that always returns valid

**What Needs to Be Done:**
```typescript
class ValidationAgent extends Node<DealState> {
  async prep(shared: DealState) {
    // Analyze deal completeness and extract validation requirements
  }

  async exec() {
    // 1. Validate required fields are present
    // 2. Validate business rules (quantities, dates, pricing)
    // 3. Check counterparty and location availability
    // 4. Verify pricing reasonableness
  }

  async post(shared: DealState, prepRes: any, execRes: any) {
    // Update shared.validationErrors with any issues found
    // Set phase to 'creation' if valid, stay in 'validation' if not
    // Return 'valid', 'invalid', or 'missing-fields'
  }
}
```

**Validation Rules to Implement:**
1. **Required Fields:** counterparty, product, quantity, locations, frequency
2. **Business Rules:** 
   - Quantity > 0 and within reasonable bounds
   - Valid date ranges (start < end, future dates)
   - Pricing within market ranges
3. **Reference Data:** 
   - Counterparty exists in system
   - Locations are valid and operational
   - Product is supported
4. **Capacity Checks:** Use `qde-calculate-trade-pricing` with `"book-from-location"`

**Key Implementation Tasks:**
1. ✅ Create comprehensive validation rule engine
2. ✅ Add reference data validation against MCP responses
3. ✅ Implement business logic validation
4. ✅ Add capacity checking via MCP tools
5. ✅ Create detailed error reporting
6. ✅ Add validation bypass for express workflows

---

### **Step 3: Implement Deal Creation Agent**  
**Priority: HIGH** | **Estimated Time: 2-3 hours**

**Location:** `/agents/deal-creation/index.ts`

**Current Status:** Smart placeholder that generates fake deal IDs

**What Needs to Be Done:**
```typescript
class DealCreationAgent extends Node<DealState> {
  async prep(shared: DealState) {
    // Prepare final deal payload from validated deal data
  }

  async exec() {
    // 1. Map deal data to Alliance Energy API format
    // 2. Call qde-manage-trade-deals with action="create"  
    // 3. Handle API response and extract deal ID
    // 4. Confirm deal creation was successful
  }

  async post(shared: DealState, prepRes: any, execRes: any) {
    // Update shared.dealId with real deal ID from Alliance Energy
    // Set phase to 'complete' 
    // Return 'created' or error action
  }
}
```

**Required MCP Tool Integration:**
- `qde-manage-trade-deals` with action `"create"`
- Full deal payload mapping to Alliance Energy format

**Key Implementation Tasks:**
1. ✅ Replace placeholder with real MCP integration  
2. ✅ Add deal data mapping to Alliance Energy API format
3. ✅ Implement real deal creation via MCP tools
4. ✅ Add confirmation and deal ID extraction
5. ✅ Add retry logic for failed creations
6. ✅ Handle API errors gracefully

---

## 🛠️ Implementation Guidelines

### **Code Structure Pattern**
All agents should follow this proven pattern (used by Data Collection Agent):

```typescript
import { Node } from '../src/pocket-flow';
import { DealState } from '../src/types';

export class YourAgent extends Node<DealState> {
  constructor() {
    super(3, 1000); // 3 retries, 1 second delay
  }

  async prep(shared: DealState): Promise<InputData> {
    // Preprocess shared state
    // Extract requirements for this agent
    // Validate prerequisites
  }

  async exec(prepRes: InputData): Promise<OutputData> {
    // Main business logic
    // MCP tool calls
    // Data processing
  }

  async post(
    shared: DealState, 
    prepRes: InputData, 
    execRes: OutputData
  ): Promise<string> {
    // Update shared state with results
    // Set next phase
    // Return action for next agent
  }

  // Optional: Error handling
  async execFallback(prepRes: InputData, error: Error): Promise<OutputData> {
    // Fallback logic when main execution fails
    // Could use mock data or simplified processing
  }
}
```

### **MCP Tool Integration Pattern**
```typescript
// Use child process to call MCP tools (following Data Collection Agent pattern)
private async callMCPTool(toolName: string, args: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'mcp/server/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    const input = JSON.stringify({
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    });

    // Handle response
    child.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}
```

### **Error Handling Best Practices**
1. **Always provide fallbacks** when MCP tools fail
2. **Log detailed errors** for debugging
3. **Update shared state** even on failures
4. **Use retry logic** for transient failures
5. **Return appropriate actions** to route to error handlers

---

## 🧪 Testing Strategy

### **Unit Tests for Each Agent**
Create test files in `/tests/` for each agent:

```typescript
describe('PricingAgent', () => {
  test('should calculate correct pricing with volume discounts', async () => {
    const agent = new PricingAgent();
    const mockState: DealState = { /* test data */ };
    
    const result = await agent.run(mockState);
    
    expect(mockState.dealData?.pricing?.totalPrice).toBeGreaterThan(0);
    expect(result).toBe('success');
  });
});
```

### **Integration Tests**
Test complete workflows end-to-end:

```typescript
describe('Complete Workflow Integration', () => {
  test('should create real deal through all 4 agents', async () => {
    const initialState: DealState = {
      userRequirements: 'Create deal with ABC Trading for 5000 gallons propane',
      phase: 'parsing'
    };

    const result = await globalWorkflowOrchestrator.executeWorkflow(
      'standard-deal-creation',
      initialState
    );

    expect(result.success).toBe(true);
    expect(result.finalState.dealId).toBeDefined();
    expect(result.finalState.phase).toBe('complete');
  });
});
```

---

## 📋 Development Checklist

### **For Each Agent Implementation:**

- [ ] **Create agent file** in appropriate `/agents/` directory
- [ ] **Extend Node class** with proper TypeScript types  
- [ ] **Implement prep/exec/post pattern** following Data Collection Agent
- [ ] **Add MCP tool integration** using established patterns
- [ ] **Include error handling** and fallback mechanisms
- [ ] **Update agent registration** in `setup-enhanced-infrastructure.ts`
- [ ] **Add unit tests** for agent functionality
- [ ] **Test integration** with existing workflow
- [ ] **Update documentation** and add inline comments
- [ ] **Verify health checks** pass in registry

### **After All Agents Complete:**

- [ ] **Run full integration tests** with real Alliance Energy API
- [ ] **Performance testing** with multiple concurrent workflows
- [ ] **Error scenario testing** (API down, invalid data, etc.)
- [ ] **Load testing** with high volume of deal requests
- [ ] **Update documentation** with complete system overview
- [ ] **Create deployment guide** for production readiness

---

## 💡 Quick Start Commands

### **Start Development Environment**
```bash
# Terminal 1: Start Alliance Energy API  
cd /Users/nickbrooks/work/alliance/alliance-energy
./run-webapi-standalone.sh

# Terminal 2: Start QDE Mock API
cd /Users/nickbrooks/work/alliance/qde-agent  
npm run mock-api

# Terminal 3: Test infrastructure
npm run demo
```

### **Test Individual Agents**
```bash
# Run specific agent tests
npm test -- --testNamePattern="PricingAgent"
npm test -- --testNamePattern="ValidationAgent"  
npm test -- --testNamePattern="DealCreationAgent"

# Run integration tests
npm test -- --testNamePattern="Integration"
```

---

## 🎯 Success Criteria

**The QDE system will be 100% complete when:**

✅ **Infrastructure:** Agent registry, observable flows, orchestration (DONE)
✅ **Agent 1:** Data Collection with MCP integration (DONE)  
🎯 **Agent 2:** Pricing with real market data calculations
🎯 **Agent 3:** Validation with comprehensive business rules
🎯 **Agent 4:** Deal Creation with Alliance Energy API integration
🎯 **Testing:** Full end-to-end workflow testing  
🎯 **Performance:** Sub-30 second deal creation times
🎯 **Reliability:** 99%+ success rate with proper error handling

---

## 🚀 Ready to Implement!

The **enhanced infrastructure is production-ready** and waiting for the remaining agent implementations. Each agent can be developed independently and will automatically integrate with the existing registry, logging, and orchestration systems.

**Estimated Total Time:** 9-13 hours for all 3 remaining agents

**Recommended Order:**
1. **Pricing Agent** (most complex, foundational)
2. **Validation Agent** (depends on pricing results)  
3. **Deal Creation Agent** (final step, depends on validation)

The system is **architected for success** - just implement the business logic and plug into the existing infrastructure! 🎉