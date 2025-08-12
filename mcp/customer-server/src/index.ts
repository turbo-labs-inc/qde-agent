#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

const QDE_API_BASE = "http://localhost:5000";

// Create server instance
const server = new McpServer({
  name: "qde-customer",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for QDE API requests
async function makeQDERequest<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await axios.get(`${QDE_API_BASE}${endpoint}`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.data as T;
  } catch (error: any) {
    console.error("Error making QDE request:", error.message);
    return null;
  }
}

// Data interfaces
interface Company {
  value: string;
  text: string;
}

interface Location {
  value: string;
  text: string;
}

interface Frequency {
  value: string;
  text: string;
}

// Register customer data tool
server.tool(
  "get_customer_data",
  "Get customer company information by company name",
  {
    companyName: z.string().describe("Name of the company to search for"),
    exactMatch: z.boolean().optional().describe("Whether to require exact name match (default: false)")
  },
  async ({ companyName, exactMatch = false }) => {
    console.error(`Fetching customer data for: ${companyName}`);
    
    const companiesData = await makeQDERequest<Company[]>('/api/fake/tradeentry/externalcompanies?getByPrimaryMarketer=false');

    if (!companiesData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve customer data from QDE API",
          },
        ],
      };
    }

    // Filter companies based on name match
    let matchingCompanies: Company[];
    
    if (exactMatch) {
      matchingCompanies = companiesData.filter(
        company => company.text.toLowerCase() === companyName.toLowerCase()
      );
    } else {
      matchingCompanies = companiesData.filter(
        company => company.text.toLowerCase().includes(companyName.toLowerCase())
      );
    }

    if (matchingCompanies.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No customer found matching "${companyName}". Available companies: ${companiesData.map(c => c.text).join(', ')}`,
          },
        ],
      };
    }

    // Format response
    const resultText = matchingCompanies.length === 1
      ? `Customer found: ${matchingCompanies[0].text} (ID: ${matchingCompanies[0].value})`
      : `Multiple customers found matching "${companyName}":\n${matchingCompanies.map(c => `- ${c.text} (ID: ${c.value})`).join('\n')}`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }
);

// Register location data tool
server.tool(
  "get_location_data",
  "Get location information (origins and destinations)",
  {
    locationType: z.enum(["origin", "destination", "both"]).describe("Type of locations to retrieve"),
    locationName: z.string().optional().describe("Specific location name to search for")
  },
  async ({ locationType, locationName }) => {
    console.error(`Fetching location data for: ${locationType}${locationName ? ` matching "${locationName}"` : ''}`);
    
    let endpoints: string[] = [];
    let locationData: Location[] = [];
    
    // Determine which endpoints to call
    if (locationType === "origin" || locationType === "both") {
      endpoints.push('/api/fake/tradeentry/customoriginlocations?showFiltered=false');
    }
    if (locationType === "destination" || locationType === "both") {
      endpoints.push('/api/fake/tradeentry/customdestinationlocations?showFiltered=false');
    }
    
    // Fetch data from all required endpoints
    for (const endpoint of endpoints) {
      const data = await makeQDERequest<Location[]>(endpoint);
      if (data) {
        locationData.push(...data);
      }
    }

    if (locationData.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve location data from QDE API",
          },
        ],
      };
    }

    // Filter by location name if specified
    if (locationName) {
      const matchingLocations = locationData.filter(
        location => location.text.toLowerCase().includes(locationName.toLowerCase())
      );
      
      if (matchingLocations.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No locations found matching "${locationName}". Available locations: ${locationData.slice(0, 5).map(l => l.text).join(', ')}${locationData.length > 5 ? '...' : ''}`,
            },
          ],
        };
      }
      
      locationData = matchingLocations;
    }

    // Format response
    const resultText = locationData.length === 1
      ? `Location found: ${locationData[0].text} (ID: ${locationData[0].value})`
      : `Found ${locationData.length} locations:\n${locationData.map(l => `- ${l.text} (ID: ${l.value})`).join('\n')}`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }
);

// Register frequency data tool
server.tool(
  "get_frequency_data",
  "Get delivery frequency options",
  {
    frequencyName: z.string().optional().describe("Specific frequency to search for (e.g., 'monthly', 'weekly')")
  },
  async ({ frequencyName }) => {
    console.error(`Fetching frequency data${frequencyName ? ` for "${frequencyName}"` : ''}`);
    
    const frequencyData = await makeQDERequest<Frequency[]>('/api/fake/tradeentry/customfrequencyvalues');

    if (!frequencyData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve frequency data from QDE API",
          },
        ],
      };
    }

    // Filter by frequency name if specified
    let frequencies = frequencyData;
    if (frequencyName) {
      frequencies = frequencyData.filter(
        freq => freq.text.toLowerCase().includes(frequencyName.toLowerCase())
      );
      
      if (frequencies.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No frequency found matching "${frequencyName}". Available frequencies: ${frequencyData.map(f => f.text).join(', ')}`,
            },
          ],
        };
      }
    }

    // Format response
    const resultText = frequencies.length === 1
      ? `Frequency found: ${frequencies[0].text} (ID: ${frequencies[0].value})`
      : `Available frequencies:\n${frequencies.map(f => `- ${f.text} (ID: ${f.value})`).join('\n')}`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QDE Customer MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});