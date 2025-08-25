import { Node } from '../../src/pocket-flow';
import { DealState, PriceComponent, OpisPrice, PricingStructure } from '../../src/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface PricingRequirements {
  locationId?: string;
  productId?: string;
  quantity?: number;
  frequency?: string;
  dealData?: any;
}

interface PricingResults {
  priceComponents?: PriceComponent[];
  opisPrices?: OpisPrice[];
  locationDiffPrice?: number;
  basePriceDefault?: number;
  finalPricing?: PricingStructure;
}

export class PricingAgent extends Node<DealState> {
  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: DealState): Promise<PricingRequirements> {
    console.log('💰 Pricing Agent: Analyzing pricing requirements...');
    
    // Extract pricing requirements from deal data and user requirements
    const requirements: PricingRequirements = {};
    
    // Parse location and product from user requirements or deal data
    if (shared.dealData) {
      requirements.dealData = shared.dealData;
      
      // Try to extract quantity from user requirements
      const quantityMatch = shared.userRequirements.match(/(\d+(?:,\d{3})*)\s*gallons?/i);
      if (quantityMatch) {
        requirements.quantity = parseInt(quantityMatch[1].replace(/,/g, ''));
      }
      
      // Extract product info - default to common products
      if (shared.userRequirements.toLowerCase().includes('propane')) {
        requirements.productId = '1'; // Propane
      } else if (shared.userRequirements.toLowerCase().includes('gasoline')) {
        requirements.productId = '5'; // Gasoline
      } else {
        requirements.productId = '1'; // Default to propane
      }
      
      // Extract frequency
      if (shared.userRequirements.toLowerCase().includes('monthly')) {
        requirements.frequency = 'monthly';
      } else if (shared.userRequirements.toLowerCase().includes('weekly')) {
        requirements.frequency = 'weekly';
      } else if (shared.userRequirements.toLowerCase().includes('daily')) {
        requirements.frequency = 'daily';
      } else {
        requirements.frequency = 'monthly'; // Default
      }
    }
    
    // Use location IDs from reference data if available
    if (shared.originLocations && shared.originLocations.length > 0) {
      requirements.locationId = shared.originLocations[0].value;
    } else {
      requirements.locationId = '100'; // Default Houston Terminal
    }
    
    console.log(`  📊 Pricing requirements: Product ${requirements.productId}, Location ${requirements.locationId}, Quantity ${requirements.quantity}, Frequency ${requirements.frequency}`);
    
    return requirements;
  }

  async exec(prepRes: PricingRequirements): Promise<PricingResults> {
    console.log('🔄 Pricing Agent: Calculating pricing components...');
    
    const results: PricingResults = {};
    
    try {
      // 1. Get current market pricing data (OPIS prices)
      console.log('  📈 Fetching current OPIS pricing...');
      results.opisPrices = await this.mcpFetchOpisPrices(
        prepRes.locationId || '100',
        prepRes.productId || '1'
      );
      
      // 2. Get price components breakdown
      console.log('  🧮 Fetching price components...');
      results.priceComponents = await this.mcpFetchPriceComponents();
      
      // 3. Calculate location differential pricing
      if (prepRes.quantity) {
        console.log('  📍 Calculating location differentials...');
        results.locationDiffPrice = await this.mcpCalculateLocationDiffPrice(
          prepRes.locationId || '100',
          prepRes.productId || '1',
          [prepRes.quantity]
        );
      }
      
      // 4. Calculate base price defaults
      console.log('  💵 Calculating base price defaults...');
      results.basePriceDefault = await this.mcpCalculateBasePriceDefault(
        prepRes.frequency || 'monthly',
        prepRes.quantity || 1000
      );
      
      // 5. Combine all pricing into final structure
      results.finalPricing = this.combinePricingComponents(results, prepRes);
      
      console.log('✅ Pricing Agent: All pricing calculations completed');
      
    } catch (error) {
      console.error('⚠️  Pricing calculation failed, using fallback:', error);
      results.finalPricing = this.generateFallbackPricing(prepRes);
    }
    
    return results;
  }

  async post(
    shared: DealState,
    prepRes: PricingRequirements,
    execRes: PricingResults
  ): Promise<string> {
    // Update shared state with pricing results
    shared.priceComponents = execRes.priceComponents;
    shared.opisPrices = execRes.opisPrices;
    
    // Update deal data with final pricing
    if (!shared.dealData) {
      shared.dealData = {};
    }
    shared.dealData.pricing = execRes.finalPricing;
    
    // Set phase to validation
    shared.phase = 'pricing';
    
    console.log('💾 Pricing Agent: Updated shared state with pricing data');
    
    // Determine next action
    if (execRes.finalPricing && execRes.finalPricing.totalPrice > 0) {
      console.log(`  💰 Final pricing: $${execRes.finalPricing.totalPrice.toFixed(2)} total`);
      return 'validation';  // Move to validation
    }
    
    return 'pricing-error';  // Pricing failed, handle error
  }

  // MCP-powered OPIS price fetching
  private async mcpFetchOpisPrices(locationId: string, productId: string): Promise<OpisPrice[]> {
    try {
      console.log(`  🔗 Using MCP to fetch OPIS prices for location ${locationId}, product ${productId}`);
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const mcpResponse = await this.callMCPTool('qde-get-market-pricing-data', {
        type: 'opis-price',
        locationId: parseInt(locationId),
        productId: parseInt(productId),
        fromDateString: today
      });
      
      // Parse OPIS price response
      const priceMatch = mcpResponse.match(/OPIS price: \$?([\d.]+)/i);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        console.log(`  ✅ Retrieved OPIS price: $${price}`);
        return [{
          locationId,
          productId,
          date: today,
          price,
          priceType: 'OPIS Average',
          publisher: 'OPIS'
        }];
      }
      
    } catch (error) {
      console.error('⚠️  MCP OPIS price fetch failed:', error);
    }
    
    // Fallback to mock data
    console.log('  📦 Using mock OPIS pricing data');
    return this.mockFetchOpisPrices(locationId, productId);
  }

  // MCP-powered price components fetching
  private async mcpFetchPriceComponents(): Promise<PriceComponent[]> {
    try {
      console.log(`  🔗 Using MCP to fetch price components`);
      
      const mcpResponse = await this.callMCPTool('qde-get-market-pricing-data', {
        type: 'price-components',
        id: 123 // Example price ID
      });
      
      // Parse price components response
      if (mcpResponse.includes('Price components:')) {
        const components: PriceComponent[] = [];
        const matches = mcpResponse.match(/(\w+): \$?([\d.]+)/gi);
        if (matches) {
          for (const match of matches) {
            const parts = match.match(/(\w+): \$?([\d.]+)/i);
            if (parts) {
              components.push({
                name: parts[1],
                value: parseFloat(parts[2]),
                type: 'component'
              });
            }
          }
        }
        if (components.length > 0) {
          console.log(`  ✅ Retrieved ${components.length} price components`);
          return components;
        }
      }
      
    } catch (error) {
      console.error('⚠️  MCP price components fetch failed:', error);
    }
    
    // Fallback to mock data
    console.log('  📦 Using mock price components data');
    return this.mockFetchPriceComponents();
  }

  // MCP-powered location differential calculation
  private async mcpCalculateLocationDiffPrice(
    locationId: string, 
    productId: string, 
    quantities: number[]
  ): Promise<number> {
    try {
      console.log(`  🔗 Using MCP to calculate location differential for location ${locationId}`);
      
      const mcpResponse = await this.callMCPTool('qde-calculate-trade-pricing', {
        type: 'location-diff-price',
        locationId: parseInt(locationId),
        productId: parseInt(productId),
        quantities
      });
      
      // Parse location differential response
      const priceMatch = mcpResponse.match(/differential price: \$?([\d.-]+)/i);
      if (priceMatch) {
        const diffPrice = parseFloat(priceMatch[1]);
        console.log(`  ✅ Location differential: $${diffPrice}`);
        return diffPrice;
      }
      
    } catch (error) {
      console.error('⚠️  MCP location differential calculation failed:', error);
    }
    
    // Fallback calculation
    console.log('  📦 Using fallback location differential calculation');
    return 0.05; // Default $0.05 differential
  }

  // MCP-powered base price calculation
  private async mcpCalculateBasePriceDefault(
    frequency: string,
    quantity: number
  ): Promise<number> {
    try {
      console.log(`  🔗 Using MCP to calculate base price for ${frequency} frequency`);
      
      // Create a simple price dictionary for the calculation
      const priceDictionary = {
        "0": 2.85,  // Current month
        "1": 2.87,  // Next month
        "2": 2.89,  // Month after
        "3": 2.91   // Future months
      };
      
      const mcpResponse = await this.callMCPTool('qde-calculate-trade-pricing', {
        type: 'base-price-default',
        priceDictionary,
        frequencyType: frequency,
        quantities: [quantity]
      });
      
      // Parse base price response
      const priceMatch = mcpResponse.match(/base price: \$?([\d.]+)/i);
      if (priceMatch) {
        const basePrice = parseFloat(priceMatch[1]);
        console.log(`  ✅ Base price: $${basePrice}`);
        return basePrice;
      }
      
    } catch (error) {
      console.error('⚠️  MCP base price calculation failed:', error);
    }
    
    // Fallback calculation
    console.log('  📦 Using fallback base price calculation');
    return 2.85; // Default base price
  }

  // Combine all pricing components into final structure
  private combinePricingComponents(
    results: PricingResults,
    requirements: PricingRequirements
  ): PricingStructure {
    const basePrice = results.basePriceDefault || 2.85;
    const locationDiff = results.locationDiffPrice || 0.05;
    const quantity = requirements.quantity || 1000;
    
    // Calculate total price per gallon
    const pricePerGallon = basePrice + locationDiff;
    const totalPrice = pricePerGallon * quantity;
    
    return {
      basePrice,
      locationDifferential: locationDiff,
      pricePerGallon,
      quantity,
      totalPrice,
      components: results.priceComponents || [],
      opisReference: results.opisPrices?.[0]?.price || basePrice,
      currency: 'USD',
      calculatedAt: new Date().toISOString()
    };
  }

  // Generate fallback pricing when MCP fails
  private generateFallbackPricing(requirements: PricingRequirements): PricingStructure {
    const quantity = requirements.quantity || 1000;
    const basePrice = 2.85;
    const locationDiff = 0.05;
    const pricePerGallon = basePrice + locationDiff;
    const totalPrice = pricePerGallon * quantity;
    
    return {
      basePrice,
      locationDifferential: locationDiff,
      pricePerGallon,
      quantity,
      totalPrice,
      components: this.mockFetchPriceComponents(),
      opisReference: basePrice,
      currency: 'USD',
      calculatedAt: new Date().toISOString(),
      note: 'Fallback pricing - MCP unavailable'
    };
  }

  // Helper method to call MCP tools using proper MCP client
  private async callMCPTool(toolName: string, args: any): Promise<string> {
    const client = new Client(
      {
        name: "qde-pricing-agent",
        version: "1.0.0",
      },
      {
        capabilities: {}
      }
    );

    try {
      // Connect to MCP server via stdio
      const mcpPath = '/Users/nickbrooks/work/alliance/qde-agent/mcp/server/index.ts';
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['tsx', mcpPath]
      });

      await client.connect(transport);

      // Call the tool
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      await client.close();

      // Extract text from result
      if (result.content && result.content.length > 0) {
        return result.content[0].text || 'No content returned';
      }

      return 'Empty response from MCP tool';
    } catch (error) {
      console.error(`MCP client error for ${toolName}:`, error);
      throw new Error(`MCP call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Mock data methods for fallback
  private async mockFetchOpisPrices(locationId: string, productId: string): Promise<OpisPrice[]> {
    return [{
      locationId,
      productId,
      date: new Date().toISOString().split('T')[0],
      price: 2.85,
      priceType: 'OPIS Average',
      publisher: 'OPIS'
    }];
  }

  private mockFetchPriceComponents(): PriceComponent[] {
    return [
      { name: 'Base Price', value: 2.80, type: 'base' },
      { name: 'Location Differential', value: 0.05, type: 'differential' },
      { name: 'Fuel Surcharge', value: 0.02, type: 'surcharge' },
      { name: 'Transportation', value: 0.03, type: 'logistics' }
    ];
  }

  async execFallback(prepRes: PricingRequirements, error: Error): Promise<PricingResults> {
    console.error('❌ Pricing Agent: Failed to calculate pricing:', error.message);
    return {
      finalPricing: this.generateFallbackPricing(prepRes),
      error: 'Failed to calculate pricing',
      details: error.message,
      timestamp: new Date().toISOString()
    } as any;
  }
}