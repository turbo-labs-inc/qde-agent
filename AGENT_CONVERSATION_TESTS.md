# QDE Agent System - Conversation Test Examples

## Overview

This document provides **5 complete conversation test scenarios** for the QDE Agent System. Each test demonstrates different interaction patterns and complexity levels to validate the conversational orchestrator and specialized capture agents.

## Test Architecture

```
User Input → ConversationOrchestrator → ConversationManagerAgent → Capture Agents → Response
```

**Agent Flow:**

- **ConversationOrchestrator**: Main traffic controller
- **ConversationManagerAgent**: Decision-making brain
- **CustomerCaptureAgent**: Extracts company information
- **ProductCaptureAgent**: Identifies fuel types
- **QuantityCaptureAgent**: Captures volume amounts
- **LocationCaptureAgent**: Handles origin/destination
- **FrequencyCaptureAgent**: Determines delivery schedule

---

## Test 1: Complete Deal Request (Happy Path) 🎯

**Scenario**: User provides all information in one comprehensive request

### Conversation Flow:

```
User: "Create a monthly deal with ABC Trading for 5000 gallons of propane from Houston Terminal to Dallas Hub"

Agent: "Perfect! I have all the information I need for your deal:
• Customer: ABC Trading ✅
• Product: Propane ✅
• Quantity: 5000 gallons ✅
• Origin: Houston Terminal ✅
• Destination: Dallas Hub ✅
• Frequency: Monthly ✅

Should I create this deal for you?"

User: "Yes, create it"

Agent: "Deal created successfully! Your deal ID is QDE-2024-001. The monthly propane delivery from Houston Terminal to Dallas Hub for ABC Trading is now active in the Alliance Energy system."
```

### **Expected Agent Behavior:**

- ✅ **ConversationManagerAgent** recognizes complete information
- ✅ **All capture agents** extract their respective data simultaneously
- ✅ **No additional questions** needed - proceed directly to confirmation
- ✅ **Deal creation** executes immediately after confirmation

---

## Test 2: Step-by-Step Information Gathering 🔄

**Scenario**: User provides minimal initial information, agent guides through each component

### Conversation Flow:

```
User: "I need to create a fuel deal"

Agent: "I'll help you create a fuel deal! Let's start with the basics. Who is the customer or company for this deal?"

User: "Energy Solutions LLC"

Agent: "Great! I've got Energy Solutions LLC as the customer. What type of fuel do you need - propane, gasoline, or diesel?"

User: "Diesel"

Agent: "Perfect! Diesel it is. How many gallons do you need?"

User: "25000"

Agent: "Got it - 25,000 gallons of diesel. Where should we pick up the fuel from?"

User: "Beaumont Terminal"

Agent: "Excellent! Beaumont Terminal for pickup. Where should we deliver it to?"

User: "San Antonio Hub"

Agent: "Perfect! And how often do you need delivery - daily, weekly, monthly, or one-time?"

User: "Weekly"

Agent: "Wonderful! Let me confirm your deal:
• Customer: Energy Solutions LLC ✅
• Product: Diesel ✅
• Quantity: 25,000 gallons ✅
• Origin: Beaumont Terminal ✅
• Destination: San Antonio Hub ✅
• Frequency: Weekly ✅

Should I create this deal?"

User: "Yes"

Agent: "Deal created successfully! Your deal ID is QDE-2024-002."
```

### **Expected Agent Behavior:**

- ✅ **ConversationManagerAgent** identifies missing information systematically
- ✅ **CustomerCaptureAgent** processes company name first
- ✅ **Sequential questioning** for each missing component
- ✅ **Progress tracking** through all required fields
- ✅ **Confirmation phase** before deal creation

---

## Test 3: Partial Information with Clarifications ⚠️

**Scenario**: User provides incomplete/ambiguous information requiring clarification

### Conversation Flow:

```
User: "Set up propane delivery for Houston company"

Agent: "I can help with propane delivery! I need a bit more specific information. What's the exact name of the Houston company?"

User: "Something with Energy in the name"

Agent: "I found several companies with 'Energy' in Houston area:
• Houston Energy Trading (ID: 1002)
• Global Energy Corp (ID: 1003)
• Alliance Energy Partners (ID: 1001)

Which company did you mean?"

User: "Houston Energy Trading"

Agent: "Perfect! Houston Energy Trading it is. How many gallons of propane do you need?"

User: "A lot - like industrial scale"

Agent: "For industrial scale propane, typical quantities range from 25,000 to 100,000+ gallons. What specific amount did you have in mind?"

User: "50000 gallons"

Agent: "Got it - 50,000 gallons. Where should we pick up the propane from?"

User: "Somewhere in Houston"

Agent: "I can see several Houston area terminals:
• Houston Terminal (ID: 100) - Major Texas hub
• Corpus Christi Terminal (ID: 102) - South Texas port

Which terminal would you prefer for pickup?"

User: "Houston Terminal"

Agent: "Great! And where should we deliver the 50,000 gallons to?"

User: "Their facility in Austin"

Agent: "I found Austin Hub (ID: 201) for deliveries. Is this the correct destination?"

User: "Yes"

Agent: "Perfect! How often do you need delivery - daily, weekly, monthly, or one-time?"

User: "Monthly"

Agent: "Excellent! Here's your complete deal:
• Customer: Houston Energy Trading
• Product: Propane
• Quantity: 50,000 gallons
• Origin: Houston Terminal
• Destination: Austin Hub
• Frequency: Monthly

Ready to create this deal?"

User: "Create it"

Agent: "Deal created successfully! Your deal ID is QDE-2024-003."
```

### **Expected Agent Behavior:**

- ✅ **ConversationManagerAgent** identifies ambiguous inputs
- ✅ **Smart suggestions** when information is unclear
- ✅ **Reference data lookup** for company and location clarifications
- ✅ **Guidance on typical quantities** for industrial scale
- ✅ **Patience with iterative refinement** of requirements

---

## Test 4: Error Handling and Corrections 🛠️

**Scenario**: User makes mistakes and needs to correct information

### Conversation Flow:

```
User: "Create a deal with XYZ Corp for gasoline from Dallas to Houston, 10000 gallons daily"

Agent: "I have most of your deal information:
• Customer: XYZ Corp ✅
• Product: Gasoline ✅
• Quantity: 10,000 gallons ✅
• Origin: Dallas Terminal ✅
• Destination: Houston Terminal ✅
• Frequency: Daily ✅

Should I create this deal?"

User: "Wait, I made a mistake. It should be from Houston to Dallas, not Dallas to Houston"

Agent: "No problem! Let me correct that:
• Origin: Houston Terminal (corrected) ✅
• Destination: Dallas Hub (corrected) ✅

So the updated deal is gasoline delivery FROM Houston TO Dallas. Is this correct now?"

User: "Yes, but actually make it weekly, not daily"

Agent: "Got it! Updated to weekly delivery. Here's the corrected deal:
• Customer: XYZ Corp ✅
• Product: Gasoline ✅
• Quantity: 10,000 gallons ✅
• Origin: Houston Terminal ✅
• Destination: Dallas Hub ✅
• Frequency: Weekly (updated) ✅

Is this correct now?"

User: "Perfect, create it"

Agent: "Deal created successfully with all corrections! Your deal ID is QDE-2024-004."
```

### **Expected Agent Behavior:**

- ✅ **ConversationManagerAgent** handles correction requests gracefully
- ✅ **State updates** reflect user corrections immediately
- ✅ **Confirmation of changes** before proceeding
- ✅ **Flexible modification** of any deal component
- ✅ **Clear acknowledgment** of what was changed

---

## Test 5: Complex Multi-Product Inquiry 🔄

**Scenario**: User asks about multiple options before settling on one deal

### Conversation Flow:

```
User: "I'm comparing options for fuel delivery. What's available for a 15000 gallon delivery to Fort Worth?"

Agent: "I can help you explore fuel delivery options to Fort Worth! I found Fort Worth Hub (ID: 203) as the destination. What type of fuel are you considering - propane, gasoline, or diesel?"

User: "What's the difference in availability between propane and diesel?"

Agent: "Both propane and diesel are readily available for delivery to Fort Worth Hub. For 15,000 gallons:
• Propane: Suitable for residential/commercial heating, common delivery size
• Diesel: Good for commercial/industrial use, standard fleet quantity

Which fuel type fits your needs better?"

User: "Let's go with diesel. What pickup locations are available?"

Agent: "For diesel pickup, I can see several options:
• Houston Terminal (ID: 100) - Major supply hub
• Beaumont Terminal (ID: 101) - Gulf Coast refinery area
• Dallas Terminal (ID: 103) - Closer to Fort Worth destination

Which pickup location works best for you?"

User: "Dallas Terminal makes sense since it's closer"

Agent: "Smart choice! Dallas Terminal to Fort Worth Hub will minimize transport. Who is the customer for this deal?"

User: "Midstream Energy Co"

Agent: "Perfect! And how often do you need 15,000 gallons delivered - weekly, monthly, or quarterly?"

User: "Let's start with monthly and see how it goes"

Agent: "Excellent! Here's your complete deal:
• Customer: Midstream Energy Co ✅
• Product: Diesel ✅
• Quantity: 15,000 gallons ✅
• Origin: Dallas Terminal ✅
• Destination: Fort Worth Hub ✅
• Frequency: Monthly ✅

Should I create this deal?"

User: "Yes, create it"

Agent: "Deal created successfully! Your deal ID is QDE-2024-005. Monthly diesel delivery from Dallas Terminal to Fort Worth Hub for Midstream Energy Co is now active."
```

### **Expected Agent Behavior:**

- ✅ **ConversationManagerAgent** handles exploratory questions
- ✅ **Educational responses** about product differences
- ✅ **Location optimization suggestions** based on efficiency
- ✅ **Flexible conversation flow** allowing user exploration
- ✅ **Logical progression** from inquiry to deal creation

---

## Testing Instructions

### Pre-Test Setup:

1. **Start Alliance Energy API**: `./run-webapi-standalone.sh`
2. **Launch QDE Agent System**: `npm run start-all`
3. **Verify orchestrator is running**: Check for conversation manager initialization

### Test Execution:

1. **Copy exact user inputs** from each test scenario
2. **Paste into interactive interface** and press Enter
3. **Verify agent responses** match expected patterns
4. **Complete full conversation** through to deal creation
5. **Confirm deal ID generation** for successful tests

### Success Criteria:

- ✅ **Conversation flow** matches expected patterns
- ✅ **All capture agents** extract correct information
- ✅ **Error handling** works gracefully in Test 4
- ✅ **Deal creation** succeeds with valid IDs
- ✅ **State management** persists correctly across turns

### Expected Timing:

- **Test 1** (Complete): ~2-3 conversation turns
- **Test 2** (Step-by-step): ~8-10 conversation turns
- **Test 3** (Clarifications): ~12-15 conversation turns
- **Test 4** (Corrections): ~6-8 conversation turns
- **Test 5** (Complex): ~10-12 conversation turns

---

## Troubleshooting

### Common Issues:

```bash
# Agent not responding
Check conversation orchestrator initialization

# Missing information not detected
Verify ConversationManagerAgent logic

# Capture agents not extracting data
Check individual agent implementations

# State not persisting
Verify conversation state management
```

### Debug Commands:

- **Type "status"** - Check current conversation state
- **Type "reset"** - Start fresh conversation
- **Type "help"** - View available commands

---

This test suite validates the complete conversational agent system from simple happy-path scenarios to complex multi-turn negotiations with error handling and corrections.
