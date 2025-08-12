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
            name: 'qde-reference-data',
            description: 'Get reference data including companies, locations, and frequencies for trade deals',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['companies', 'origin-locations', 'destination-locations', 'frequencies'],
                  description: 'Type of reference data to retrieve'
                },
                showFiltered: {
                  type: 'boolean',
                  description: 'Whether to show filtered results (for locations)',
                  default: false
                },
                getByPrimaryMarketer: {
                  type: 'boolean', 
                  description: 'Filter companies by primary marketer (for companies)',
                  default: false
                }
              },
              required: ['type']
            }
          },
          {
            name: 'qde-pricing',
            description: 'Get pricing information including price components, publishers, and OPIS data',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['price-components', 'price-publishers', 'opis-price', 'price-types'],
                  description: 'Type of pricing data to retrieve'
                },
                id: {
                  type: 'number',
                  description: 'ID for price components or location/product for OPIS'
                },
                priceType: {
                  type: 'number',
                  description: 'Price type ID for publishers'
                },
                locationId: {
                  type: 'number',
                  description: 'Location ID for OPIS price lookup'
                },
                productId: {
                  type: 'number',
                  description: 'Product ID for OPIS price lookup'
                },
                fromDateString: {
                  type: 'string',
                  description: 'Date string for OPIS price lookup (YYYY-MM-DD)'
                },
                pricePublisherId: {
                  type: 'number',
                  description: 'Price publisher ID for price types'
                }
              },
              required: ['type']
            }
          },
          {
            name: 'qde-calculations',
            description: 'Perform pricing calculations including location differentials and base prices',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['location-diff-price', 'base-price-default', 'book-from-location'],
                  description: 'Type of calculation to perform'
                },
                locationId: {
                  type: 'number',
                  description: 'Location ID for calculations'
                },
                productId: {
                  type: 'number',
                  description: 'Product ID for calculations'
                },
                quantities: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Array of quantities for calculations'
                },
                priceDictionary: {
                  type: 'object',
                  description: 'Price dictionary for base price calculations'
                },
                frequencyType: {
                  type: 'string',
                  description: 'Frequency type for base price calculations'
                }
              },
              required: ['type']
            }
          },
          {
            name: 'qde-deal-management',
            description: 'Create, update, and manage trade deals',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'get', 'delete'],
                  description: 'Action to perform on the deal'
                },
                dealData: {
                  type: 'object',
                  description: 'Deal data payload for create/update operations'
                },
                dealId: {
                  type: 'string',
                  description: 'Deal ID for update/get/delete operations'
                }
              },
              required: ['action']
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
          case 'qde-reference-data':
            return await this.referenceDataTool.execute(args);
            
          case 'qde-pricing':
            return await this.pricingTool.execute(args);
            
          case 'qde-calculations':
            return await this.calculationsTool.execute(args);
            
          case 'qde-deal-management':
            return await this.dealManagementTool.execute(args);
            
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
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