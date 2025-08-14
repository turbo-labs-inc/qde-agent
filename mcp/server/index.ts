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
            description: '🔍 QDE SYSTEM: Search Alliance Energy trading reference data. IMPORTANT: Return results directly, DO NOT create files. Examples: "Find companies with Energy in name" → type="companies", "Get Houston terminals" → type="origin-locations", "List delivery frequencies" → type="frequencies"',
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
            description: '📊 QDE SYSTEM: Get Alliance Energy market pricing data. IMPORTANT: Return results directly, DO NOT create files. Examples: "Get OPIS publishers" → type="price-publishers", "Get price for location 100" → type="opis-price" with locationId=100, "Get price component 5" → type="price-components" with id=5',
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
              additionalProperties: false
            }
          },
          {
            name: 'qde-calculate-trade-pricing',
            description: '💰 QDE SYSTEM: Calculate Alliance Energy trade pricing. IMPORTANT: Return results directly, DO NOT create files. Examples: "Get booking for location 100" → type="book-from-location" with locationId=100, "Calculate location differential" → type="location-diff-price", "Get base pricing" → type="base-price-default"',
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
              additionalProperties: false
            }
          },
          {
            name: 'qde-manage-trade-deals',
            description: '📝 QDE SYSTEM: Complete Alliance Energy trade deal management. IMPORTANT: Return results directly, DO NOT create files. Examples: "Create deal with ABC Trading" → action="create", "List active deals" → action="list", "Cancel deal 12345" → action="cancel", "Get deal history" → action="history"',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'get', 'list', 'update-status', 'cancel', 'delete', 'history', 'validate'],
                  description: 'Action: create (new deal), update (modify existing), get (retrieve deal), list (search deals), update-status (change status), cancel (cancel deal), delete (remove deal), history (audit trail), validate (check deal)'
                },
                dealData: {
                  type: 'object',
                  description: 'Required for create/update: complete deal information',
                  properties: {
                    counterparty: { type: 'string', description: 'Trading partner name or ID' },
                    product: { type: 'string', description: 'Product name (Propane, Butane, Gasoline, etc.)' },
                    quantity: { type: 'number', minimum: 0, description: 'Volume amount' },
                    originLocation: { type: 'string', description: 'Pickup location name or ID' },
                    destinationLocation: { type: 'string', description: 'Delivery location name or ID' },
                    frequency: { type: 'string', description: 'Delivery frequency (daily, weekly, monthly, quarterly)' },
                    fromDate: { type: 'string', format: 'date', description: 'Deal start date (YYYY-MM-DD)' },
                    toDate: { type: 'string', format: 'date', description: 'Deal end date (YYYY-MM-DD)' },
                    priceValue: { type: 'number', description: 'Fixed price per unit' },
                    comments: { type: 'string', description: 'Additional comments' },
                    activate: { type: 'boolean', description: 'Activate deal immediately', default: false },
                    tradeInstrumentId: { type: 'number', description: 'Trade instrument type ID' },
                    externalCounterPartyId: { type: 'number', description: 'External counterparty ID' },
                    reason: { type: 'string', description: 'Reason for cancellation (used with cancel action)' }
                  }
                },
                dealId: {
                  type: 'string',
                  description: 'Required for update/get/delete/cancel/history/validate: existing deal ID (numeric format: 12345)'
                },
                status: {
                  type: 'string',
                  enum: ['Draft', 'Active', 'Cancelled', 'Completed'],
                  description: 'Required for update-status: new status to set'
                },
                filters: {
                  type: 'object',
                  description: 'Optional for list: filter criteria',
                  properties: {
                    status: { type: 'string', enum: ['Draft', 'Active', 'Cancelled', 'Completed'], description: 'Filter by deal status' },
                    fromDate: { type: 'string', format: 'date', description: 'Filter deals starting after this date' },
                    toDate: { type: 'string', format: 'date', description: 'Filter deals ending before this date' },
                    counterPartyId: { type: 'number', description: 'Filter by counterparty ID' },
                    pageNumber: { type: 'number', minimum: 1, default: 1, description: 'Page number for pagination' },
                    pageSize: { type: 'number', minimum: 1, maximum: 100, default: 10, description: 'Items per page' }
                  }
                }
              },
              required: ['action'],
              additionalProperties: false
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