import axios from 'axios';
import { QdeReferenceDataTool } from '../mcp/tools/reference-data';
import { QdePricingTool } from '../mcp/tools/pricing';
import { QdeCalculationsTool } from '../mcp/tools/calculations';

describe('MCP Tools Integration', () => {
  const apiConfig = {
    baseUrl: process.env.QDE_API_BASE_URL || 'http://localhost:8000',
    timeout: 5000
  };

  // Skip these tests if QDE API is not running
  const skipIfApiDown = () => {
    beforeAll(async () => {
      try {
        await axios.get(`${apiConfig.baseUrl}/api/fake/tradeentry/externalcompanies?getByPrimaryMarketer=false`, { timeout: 2000 });
      } catch (error) {
        console.log('⚠️  QDE API not running at localhost:8000, skipping integration tests');
        return; // Skip test instead of using pending
      }
    }, 10000);
  };

  describe('Reference Data Tool', () => {
    skipIfApiDown();

    let tool: QdeReferenceDataTool;

    beforeEach(() => {
      tool = new QdeReferenceDataTool(apiConfig);
    });

    test('should fetch companies', async () => {
      const result = await tool.execute({
        type: 'companies',
        getByPrimaryMarketer: false
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('"type": "companies"');
      
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    }, 10000);

    test('should fetch origin locations', async () => {
      const result = await tool.execute({
        type: 'origin-locations',
        showFiltered: false
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.type).toBe('origin-locations');
      expect(data.data).toBeDefined();
    }, 10000);

    test('should handle unknown type', async () => {
      const result = await tool.execute({
        type: 'unknown-type'
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toContain('Unknown reference data type');
    });
  });

  describe('Pricing Tool', () => {
    skipIfApiDown();

    let tool: QdePricingTool;

    beforeEach(() => {
      tool = new QdePricingTool(apiConfig);
    });

    test('should fetch price components', async () => {
      const result = await tool.execute({
        type: 'price-components',
        id: 123
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.type).toBe('price-components');
      expect(data.data).toBeDefined();
    }, 10000);

    test('should fetch OPIS price', async () => {
      const result = await tool.execute({
        type: 'opis-price',
        locationId: 100,
        productId: 5,
        fromDateString: '2024-01-15'
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.type).toBe('opis-price');
    }, 10000);

    test('should require parameters for OPIS price', async () => {
      const result = await tool.execute({
        type: 'opis-price'
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toContain('locationId, productId, and fromDateString are required');
    });
  });

  describe('Calculations Tool', () => {
    skipIfApiDown();

    let tool: QdeCalculationsTool;

    beforeEach(() => {
      tool = new QdeCalculationsTool(apiConfig);
    });

    test('should calculate location diff price', async () => {
      const result = await tool.execute({
        type: 'location-diff-price',
        locationId: 100,
        productId: 1,
        quantities: [1000, 2000]
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.type).toBe('location-diff-price');
      expect(data.data).toBeDefined();
    }, 10000);

    test('should get book from location', async () => {
      const result = await tool.execute({
        type: 'book-from-location',
        locationId: 100
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.type).toBe('book-from-location');
    }, 10000);
  });
});