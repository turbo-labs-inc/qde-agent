#!/usr/bin/env tsx

import axios from 'axios';

/**
 * Test QDE API connectivity and endpoint responses
 * Run with: npx tsx examples/api-test.ts
 */

const QDE_API_BASE = process.env.QDE_API_BASE_URL || 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail';
  responseTime: number;
  error?: string;
  sampleData?: any;
}

async function testEndpoint(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET', 
  data?: any
): Promise<TestResult> {
  const fullUrl = `${QDE_API_BASE}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method,
      url: fullUrl,
      data,
      timeout: 5000
    });

    const responseTime = Date.now() - startTime;
    
    return {
      endpoint,
      method,
      status: 'pass',
      responseTime,
      sampleData: Array.isArray(response.data) ? response.data.slice(0, 2) : response.data
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      endpoint,
      method,
      status: 'fail',
      responseTime,
      error: error.code === 'ECONNREFUSED' 
        ? 'Connection refused - API not running'
        : error.message
    };
  }
}

async function testAllEndpoints() {
  console.log('🌐 Testing QDE API Connectivity');
  console.log(`🔗 Base URL: ${QDE_API_BASE}`);
  console.log('=====================================\n');

  const tests: Array<[string, 'GET' | 'POST', any?]> = [
    // Reference Data Endpoints
    ['/api/fake/tradeentry/externalcompanies?getByPrimaryMarketer=false', 'GET'],
    ['/api/fake/tradeentry/customoriginlocations?showFiltered=false', 'GET'],
    ['/api/fake/tradeentry/customdestinationlocations?showFiltered=false', 'GET'],
    ['/api/fake/tradeentry/customfrequencyvalues', 'GET'],
    
    // Pricing Endpoints
    ['/api/fake/tradeentry/pricecomponents/123', 'GET'],
    ['/api/fake/tradeentry/pricepublishers?priceType=1', 'GET'],
    ['/api/fake/tradeentry/previousaverageopisprice?locationId=100&productId=5&fromDateString=2024-01-15', 'GET'],
    ['/api/fake/tradeentry/customindexpricetypes?pricePublisherId=1', 'GET'],
    
    // Calculation Endpoints
    ['/api/fake/tradeentry/bookfromlocation/100', 'GET'],
    ['/api/fake/tradeentry/locationdiffpricedefault', 'POST', {
      locationId: 100,
      productId: 1,
      quantities: [1000, 2000, 3000]
    }],
    ['/api/fake/tradeentry/basepricedefault', 'POST', {
      priceDictionary: { "base": 2.85, "premium": 0.10 },
      frequencyType: "Monthly",
      quantities: [1000, 2000, 3000]
    }]
  ];

  const results: TestResult[] = [];
  let passCount = 0;
  let failCount = 0;

  for (const [endpoint, method, data] of tests) {
    const result = await testEndpoint(endpoint, method, data);
    results.push(result);

    const statusIcon = result.status === 'pass' ? '✅' : '❌';
    const timing = `${result.responseTime}ms`;
    
    console.log(`${statusIcon} ${method.padEnd(4)} ${endpoint}`);
    console.log(`   Response Time: ${timing}`);
    
    if (result.status === 'pass') {
      passCount++;
      if (result.sampleData) {
        const preview = JSON.stringify(result.sampleData).slice(0, 100);
        console.log(`   Sample: ${preview}${preview.length >= 100 ? '...' : ''}`);
      }
    } else {
      failCount++;
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  console.log('=====================================');
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success Rate: ${Math.round((passCount / results.length) * 100)}%`);

  if (failCount > 0) {
    console.log('\n⚠️  Some endpoints failed. Make sure:');
    console.log('   1. QDE API is running: npm run dev (in alli-copy project)');
    console.log('   2. API is accessible at:', QDE_API_BASE);
    console.log('   3. All mock endpoints are implemented');
  }

  return { results, passCount, failCount };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllEndpoints();
}

export { testAllEndpoints };