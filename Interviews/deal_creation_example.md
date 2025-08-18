# Deal Creation Example
## Based on Interview: August 17, 2025

### Interview Summary
- **Counterparty:** Global Petroleum Corp
- **Product:** Diesel
- **Origin:** Los Angeles Refinery
- **Destination:** Miami Storage Facility
- **Volume:** 50,000 barrels
- **Frequency:** Weekly
- **Date Range:** September 1, 2025 - December 31, 2025
- **Pricing:** Market pricing based on NYMEX

### Expected MCP Tool Call

If the `qde-manage-trade-deals` tool were available, the call would be:

```javascript
qde-manage-trade-deals({
  "action": "create",
  "dealData": {
    "counterparty": "Global Petroleum Corp",
    "product": "Diesel",
    "quantity": 50000,
    "originLocation": "Los Angeles Refinery",
    "destinationLocation": "Miami Storage Facility",
    "frequency": "Weekly",
    "fromDate": "2025-09-01",
    "toDate": "2025-12-31",
    "activate": true,
    "comments": "Market pricing based on NYMEX - created from interview on 2025-08-17"
  }
})
```

### Expected Response

A successful deal creation would return:
```json
{
  "success": true,
  "dealId": "QDE-2025-0817-001",
  "message": "Deal created successfully",
  "dealSummary": {
    "counterparty": "Global Petroleum Corp (ID: 1005)",
    "product": "Diesel (ID: 2)",
    "volume": "50,000 barrels",
    "route": "Los Angeles Refinery → Miami Storage Facility",
    "frequency": "Weekly",
    "term": "Sep 1, 2025 - Dec 31, 2025",
    "pricing": "NYMEX Market Pricing"
  }
}
```

### Notes
- The Alliance Energy API would validate all fields
- Company name would be matched to ID automatically
- Locations would be verified against available terminals
- Market pricing would pull current NYMEX rates
- Deal would be activated immediately in the trading system