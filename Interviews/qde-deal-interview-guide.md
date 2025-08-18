# QDE Alliance Energy Deal Creation Interview Guide

## 📋 Overview

This guide provides a complete interview process for creating energy trade deals using the QDE (Quick Data Entry) system. The interview maps to all 12 Alliance Energy API endpoints and generates the data needed for the `qde-manage-trade-deals` MCP tool.

### Interview Flow Process
1. **Reference Data Collection** (Questions 1-4) → API Endpoints 1-4
2. **Market Pricing Information** (Questions 5-8) → API Endpoints 5-8  
3. **Deal Calculations** (Questions 9-11) → API Endpoints 9-11
4. **Final Deal Creation** (Question 12) → API Endpoint 12

---

## 🎯 Interview Questions & Sample Answers

### **Reference Data Questions (Endpoints 1-4)**

#### **Question 1: Trading Counterparty** (Companies Endpoint)
**"Which trading partner/counterparty would you like to work with?"**

**Sample Answers:**
- ABC Trading Company
- XYZ Logistics Inc  
- Global Petroleum Corp
- Energy Solutions LLC
- Alliance Energy Partners
- Metro Oil & Gas
- Coastal Refining Co
- Midwest Energy Trading
- Pacific Fuel Distribution
- Continental Energy Corp

---

#### **Question 2: Origin Location** (Origin Locations Endpoint)
**"Where will the product be picked up from?"**

**Sample Answers:**
- Houston Terminal
- Dallas Hub
- San Antonio Depot
- Austin Facility
- Fort Worth Station
- Corpus Christi Port
- Beaumont Refinery
- Tyler Distribution
- Amarillo Terminal
- El Paso Hub

---

#### **Question 3: Destination Location** (Destination Locations Endpoint)
**"Where should the product be delivered to?"**

**Sample Answers:**
- Oklahoma City Terminal
- Tulsa Distribution Center
- Little Rock Hub
- Kansas City Depot
- New Orleans Port
- Memphis Junction
- Birmingham Terminal
- Nashville Distribution
- Atlanta Hub
- Jacksonville Port

---

#### **Question 4: Delivery Frequency** (Frequency Endpoint)
**"How often should deliveries occur?"**

**Sample Answers:**
- Daily
- Weekly
- Bi-Weekly
- Monthly
- Quarterly
- Semi-Annual
- Annual

---

### **Market Pricing Questions (Endpoints 5-8)**

#### **Question 5: Product Selection** (Price Components Endpoint)
**"What product are you trading?"**

**Sample Answers:**
- Gasoline Regular Unleaded (ID: 123)
- Diesel Fuel (ID: 124)
- Propane
- Butane
- Natural Gas
- Crude Oil
- Heating Oil

---

#### **Question 6: Price Publisher** (Price Publishers Endpoint)
**"Which pricing source should we use for market rates?"**

**Sample Answers:**
- OPIS (Oil Price Information Service)
- Platts
- Argus Media
- Bloomberg
- Reuters

---

#### **Question 7: Historical Price Date** (OPIS Price Endpoint)
**"What date should we use for historical price reference? (Format: YYYY-MM-DD)"**

**Sample Answers:**
- 2024-01-15
- 2024-02-01
- 2024-03-15
- 2024-06-01
- 2024-08-15
- 2024-12-01

---

#### **Question 8: Pricing Method** (Index Price Types Endpoint)
**"What pricing method do you prefer?"**

**Sample Answers:**
- Daily Average
- Weekly Average
- Monthly Average
- Spot Price
- Contract Price

---

### **Deal Calculations Questions (Endpoints 9-11)**

#### **Question 9: Capacity Check** (Book From Location Endpoint)
**"Do you need to verify capacity at your pickup location? (Yes/No)"**

**Sample Answers:**
- Yes, check Houston Terminal capacity
- Yes, verify Corpus Christi Port availability
- No, capacity already confirmed
- Yes, need minimum 50,000 gallon capacity

---

#### **Question 10: Quantity** (Location Differential Endpoint)
**"What quantity (in gallons) are you planning to trade?"**

**Sample Answers:**
- 1,000 gallons
- 5,000 gallons
- 10,000 gallons
- 25,000 gallons
- 50,000 gallons
- 100,000 gallons
- 250,000 gallons

---

#### **Question 11: Target Base Price** (Base Price Calculation Endpoint)
**"What's your target base price per gallon? (USD)"**

**Sample Answers:**
- $2.50 per gallon
- $2.85 per gallon
- $3.00 per gallon
- $3.25 per gallon
- Market rate
- To be calculated

---

### **Final Deal Details (Endpoint 12)**

#### **Question 12: Deal Specifics** (Create Deal Endpoint)
**"Please provide the final deal details:"**

**Sub-questions & Sample Answers:**

**Start Date (YYYY-MM-DD):**
- 2025-09-01
- 2025-10-15
- 2025-11-01
- 2025-12-01

**End Date (YYYY-MM-DD):**
- 2025-12-31
- 2026-03-31
- 2026-06-30
- 2026-12-31

**Comments/Requirements:**
- "Winter supply contract"
- "Emergency inventory replenishment"
- "Seasonal demand coverage"
- "Market pricing based on OPIS"
- "Payment terms: Net 30"
- "Subject to credit approval"

**Activate Immediately:**
- Yes, activate now
- No, save as draft
- Yes, effective immediately
- No, pending approval

---

## 🎬 Expected MCP Workflow & Outcome

### **Step 1: Reference Data Validation**
```javascript
// Tool calls based on interview answers
qde-search-trade-reference-data({ type: "companies" })
qde-search-trade-reference-data({ type: "origin-locations" })
qde-search-trade-reference-data({ type: "destination-locations" })
qde-search-trade-reference-data({ type: "frequencies" })
```

### **Step 2: Market Pricing Analysis**
```javascript
qde-get-market-pricing-data({ type: "price-components", id: 123 })
qde-get-market-pricing-data({ type: "price-publishers" })
qde-get-market-pricing-data({ 
  type: "opis-price", 
  locationId: 100, 
  productId: 123, 
  fromDateString: "2024-01-15" 
})
qde-get-market-pricing-data({ type: "price-types", pricePublisherId: 1 })
```

### **Step 3: Pricing Calculations**
```javascript
qde-calculate-trade-pricing({ 
  type: "book-from-location", 
  locationId: 100 
})
qde-calculate-trade-pricing({ 
  type: "location-diff-price", 
  locationId: 100, 
  productId: 123, 
  quantities: [5000] 
})
qde-calculate-trade-pricing({ 
  type: "base-price-default", 
  locationId: 100,
  priceDictionary: { base: 2.85, premium: 0.10 },
  frequencyType: "Monthly"
})
```

### **Step 4: Deal Creation**
```javascript
qde-manage-trade-deals({
  action: "create",
  dealData: {
    counterparty: "ABC Trading Company",
    product: "Propane",
    quantity: 5000,
    originLocation: "Houston Terminal",
    destinationLocation: "Dallas Hub",
    frequency: "Monthly",
    fromDate: "2025-09-01",
    toDate: "2025-12-31",
    priceValue: 2.85,
    comments: "Winter supply contract - created via QDE interview",
    activate: true
  }
})
```

### **Expected Final Response**
```json
{
  "success": true,
  "message": "Deal created successfully",
  "deal": {
    "dealId": "QDE-1755533455789-4321",
    "status": "Active",
    "createdAt": "2025-08-18T16:30:55.789Z",
    "counterparty": "ABC Trading Company",
    "product": "Propane",
    "quantity": 5000,
    "originLocation": "Houston Terminal",
    "destinationLocation": "Dallas Hub",
    "frequency": "Monthly",
    "fromDate": "2025-09-01",
    "toDate": "2025-12-31",
    "pricing": {
      "basePrice": 2.85,
      "locationDifferential": -0.03,
      "finalPrice": 2.82,
      "currency": "USD",
      "unit": "gallon"
    },
    "confirmationNumber": "CN-894562",
    "estimatedValue": "14100.00",
    "comments": "Winter supply contract - created via QDE interview"
  }
}
```

---

## 🔄 Sample Interview Scenarios

### **Scenario A: Standard Monthly Propane Deal**
```yaml
Counterparty: ABC Trading Company
Product: Propane  
Quantity: 5,000 gallons
Origin: Houston Terminal
Destination: Dallas Hub
Frequency: Monthly
Dates: 2025-09-01 to 2025-12-31
Price: $2.50/gallon fixed
Comments: Winter heating season supply
```

### **Scenario B: Large Volume Gasoline Contract**
```yaml
Counterparty: Global Petroleum Corp
Product: Gasoline Regular Unleaded
Quantity: 50,000 gallons
Origin: Beaumont Refinery
Destination: Oklahoma City Terminal
Frequency: Weekly
Dates: 2025-10-01 to 2026-03-31
Price: OPIS market pricing
Comments: High-volume retail supply contract
```

### **Scenario C: Emergency Diesel Supply**
```yaml
Counterparty: Energy Solutions LLC
Product: Diesel Fuel
Quantity: 10,000 gallons
Origin: Corpus Christi Port
Destination: San Antonio Depot
Frequency: Daily
Dates: 2025-08-20 to 2025-08-25
Price: Spot market + $0.05 premium
Comments: Emergency inventory replenishment
```

### **Scenario D: Quarterly Natural Gas Contract**
```yaml
Counterparty: Midwest Energy Trading
Product: Natural Gas
Quantity: 100,000 MMBtu
Origin: Houston Terminal
Destination: Kansas City Depot
Frequency: Quarterly
Dates: 2025-09-01 to 2026-08-31
Price: NYMEX Henry Hub pricing
Comments: Long-term supply agreement
```

---

## 🚀 Interview Best Practices

### **For Interviewers:**
1. **Start with basics** - Company, product, quantity first
2. **Validate real-time** - Check if companies/locations exist in system
3. **Provide context** - Explain why each piece of data is needed
4. **Allow corrections** - Let users go back and change answers
5. **Summarize before creating** - Review all details before final submission

### **For Testing Multiple Interviews:**
1. **Use different scenarios** - Vary products, quantities, and terms
2. **Test edge cases** - Very large/small quantities, unusual frequencies
3. **Mix pricing methods** - Fixed, market, index-based
4. **Vary activation states** - Some active, some draft
5. **Include different urgency levels** - Emergency vs routine deals

### **Common Validation Points:**
- ✅ Company exists in Alliance Energy system
- ✅ Origin/destination locations are valid terminals
- ✅ Product has pricing data available
- ✅ Quantity is within location capacity limits
- ✅ Date range is valid (start < end, future dates)
- ✅ Pricing method matches available publishers

---

## 📊 Success Metrics

**Complete Interview Should Produce:**
- ✅ Valid deal ID (QDE-timestamp-random format)
- ✅ Confirmation number (CN-XXXXXX format)
- ✅ Calculated total contract value
- ✅ Optimized pricing with location differentials
- ✅ All 12 API endpoints utilized
- ✅ Deal status (Active/Draft) as requested

**Ready to start your QDE deal creation interview!**