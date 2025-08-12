#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';

import { QdeReferenceDataTool } from '../tools/reference-data';
import { QdePricingTool } from '../tools/pricing';
import { QdeCalculationsTool } from '../tools/calculations';
import { QdeDealManagementTool } from '../tools/deal-management';

class QdeMcpServer {
  private server: Server;
  private referenceDataTool: QdeReferenceDataTool;
  private pricingTool: QdePricingTool;
  private calculationsTool: QdeCalculationsTool;
  private dealManagementTool: QdeDealManagementTool;

  constructor() {
    this.server = new Server(
      {
        name: 'qde-agent-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tools
    const apiConfig = {
      baseUrl: process.env.QDE_API_BASE_URL || 'http://localhost:5000',
      apiKey: process.env.QDE_API_KEY,
      timeout: 30000
    };

    this.referenceDataTool = new QdeReferenceDataTool(apiConfig);
    this.pricingTool = new QdePricingTool(apiConfig);
    this.calculationsTool = new QdeCalculationsTool(apiConfig);
    this.dealManagementTool = new QdeDealManagementTool(apiConfig);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'qde-search-trade-reference-data',
            description: '🔍 QDE SYSTEM: Search Alliance Energy trading reference data. Examples: "Find companies with Energy in name" → type="companies", "Get Houston terminals" → type="origin-locations", "List delivery frequencies" → type="frequencies"',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['companies', 'origin-locations', 'destination-locations', 'frequencies'],
                  description: 'Type of reference data: companies (search trading partners), origin-locations (pickup points), destination-locations (delivery points), frequencies (monthly, weekly, etc.)'
                },
                showFiltered: {
                  type: 'boolean',
                  description: 'For locations only: include filtered/inactive locations in results',
                  default: false
                },
                getByPrimaryMarketer: {
                  type: 'boolean', 
                  description: 'For companies only: filter to show only primary marketer companies',
                  default: false
                }
              },
              required: ['type'],
              additionalProperties: false
            }
          },
          {
            name: 'qde-get-market-pricing-data',
            description: '📊 QDE SYSTEM: Get Alliance Energy market pricing data. Examples: "Get OPIS publishers" → type="price-publishers", "Get price for location 100" → type="opis-price" with locationId=100, "Get price component 5" → type="price-components" with id=5',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['price-components', 'price-publishers', 'opis-price', 'price-types'],
                  description: 'Type of pricing data: price-components (product pricing details), price-publishers (OPIS, Platts, etc.), opis-price (historical market prices), price-types (available pricing methods)'
                },
                id: {
                  type: 'number',
                  description: 'Required for price-components: the price component ID to retrieve'
                },
                priceType: {
                  type: 'number',
                  description: 'Optional for price-publishers: filter by specific price type ID'
                },
                locationId: {
                  type: 'number',
                  description: 'Required for opis-price: location ID where price applies'
                },
                productId: {
                  type: 'number',
                  description: 'Required for opis-price: product ID for price lookup'
                },
                fromDateString: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                  description: 'Required for opis-price: start date for price history (YYYY-MM-DD format)'
                },
                pricePublisherId: {
                  type: 'number',
                  description: 'Required for price-types: publisher ID to get available price types'
                }
              },
              required: ['type'],
              additionalProperties: false,
              allOf: [
                {
                  if: { properties: { type: { const: 'price-components' } } },
                  then: { required: ['type', 'id'] }
                },
                {
                  if: { properties: { type: { const: 'opis-price' } } },
                  then: { required: ['type', 'locationId', 'productId', 'fromDateString'] }
                },
                {
                  if: { properties: { type: { const: 'price-types' } } },
                  then: { required: ['type', 'pricePublisherId'] }
                }
              ]
            }
          },
          {
            name: 'qde-calculate-trade-pricing',
            description: '💰 QDE SYSTEM: Calculate Alliance Energy trade pricing. Examples: "Get booking for location 100" → type="book-from-location" with locationId=100, "Calculate location differential" → type="location-diff-price", "Get base pricing" → type="base-price-default"',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['location-diff-price', 'base-price-default', 'book-from-location'],
                  description: 'Calculation type: location-diff-price (price difference between locations), base-price-default (standard base pricing), book-from-location (booking details for location)'
                },
                locationId: {
                  type: 'number',
                  description: 'Required for all types: location ID for price calculations'
                },
                productId: {
                  type: 'number',
                  description: 'Required for location-diff-price and base-price-default: product ID'
                },
                quantities: {
                  type: 'array',
                  items: { type: 'number', minimum: 0 },
                  description: 'Required for location-diff-price: array of quantity values to calculate prices for',
                  minItems: 1
                },
                priceDictionary: {
                  type: 'object',
                  description: 'Required for base-price-default: pricing data dictionary with market values'
                },
                frequencyType: {
                  type: 'string',
                  description: 'Required for base-price-default: delivery frequency (monthly, weekly, daily, etc.)'
                }
              },
              required: ['type', 'locationId'],
              additionalProperties: false,
              allOf: [
                {
                  if: { properties: { type: { const: 'location-diff-price' } } },
                  then: { required: ['type', 'locationId', 'productId', 'quantities'] }
                },
                {
                  if: { properties: { type: { const: 'base-price-default' } } },
                  then: { required: ['type', 'locationId', 'productId', 'priceDictionary', 'frequencyType'] }
                }
              ]
            }
          },
          {
            name: 'qde-manage-trade-deals',
            description: '📝 QDE SYSTEM: Manage Alliance Energy trade deals. Examples: "Create deal with ABC Trading" → action="create" with dealData, "Get deal QDE-12345" → action="get" with dealId="QDE-12345", "Delete old deal" → action="delete"',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'get', 'delete'],
                  description: 'Action to perform: create (new deal), update (modify existing), get (retrieve deal info), delete (remove deal)'
                },
                dealData: {
                  type: 'object',
                  description: 'Required for create/update: complete deal information including counterparty, product, quantities, locations, and pricing',
                  properties: {
                    counterparty: { type: 'string' },
                    product: { type: 'string' },
                    quantity: { type: 'number', minimum: 0 },
                    originLocation: { type: 'string' },
                    destinationLocation: { type: 'string' },
                    frequency: { type: 'string' },
                    pricing: { type: 'object' }
                  }
                },
                dealId: {
                  type: 'string',
                  pattern: '^[A-Z0-9-]+$',
                  description: 'Required for update/get/delete: existing deal ID (format: QDE-XXXXX-YYYY-ZZZZ)'
                }
              },
              required: ['action'],
              additionalProperties: false,
              allOf: [
                {
                  if: { properties: { action: { enum: ['create', 'update'] } } },
                  then: { required: ['action', 'dealData'] }
                },
                {
                  if: { properties: { action: { enum: ['get', 'delete', 'update'] } } },
                  then: { required: ['action', 'dealId'] }
                }
              ]
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'qde-search-trade-reference-data':
            return await this.referenceDataTool.execute(args);
            
          case 'qde-get-market-pricing-data':
            return await this.pricingTool.execute(args);
            
          case 'qde-calculate-trade-pricing':
            return await this.calculationsTool.execute(args);
            
          case 'qde-manage-trade-deals':
            return await this.dealManagementTool.execute(args);
            
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}. Available QDE tools: qde-search-trade-reference-data, qde-get-market-pricing-data, qde-calculate-trade-pricing, qde-manage-trade-deals`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('QDE MCP server running on stdio');
  }
}

// Start the server
const server = new QdeMcpServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});