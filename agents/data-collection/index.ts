import { Node } from '../../src/pocket-flow';
import { DealState, Company, Location, Frequency } from '../../src/types';
import { spawn } from 'child_process';

export class DataCollectionAgent extends Node<DealState> {
  constructor(maxRetries = 3, wait = 1) {
    super(maxRetries, wait);
  }

  async prep(shared: DealState): Promise<{
    requirements: string;
    missingData: string[];
  }> {
    console.log('📊 Data Collection Agent: Analyzing requirements...');
    
    // Determine what reference data we need
    const missingData: string[] = [];
    
    if (!shared.companies) {
      missingData.push('companies');
    }
    if (!shared.originLocations) {
      missingData.push('origin-locations');
    }
    if (!shared.destinationLocations) {
      missingData.push('destination-locations');
    }
    if (!shared.frequencies) {
      missingData.push('frequencies');
    }

    return {
      requirements: shared.userRequirements,
      missingData
    };
  }

  async exec(prepRes: {
    requirements: string;
    missingData: string[];
  }): Promise<{
    companies?: Company[];
    originLocations?: Location[];
    destinationLocations?: Location[];
    frequencies?: Frequency[];
  }> {
    console.log('🔄 Data Collection Agent: Fetching reference data...');
    
    const results: any = {};

    // In a real implementation, this would use the MCP tools
    // For now, we'll simulate the data collection
    
    for (const dataType of prepRes.missingData) {
      console.log(`  📥 Fetching ${dataType}...`);
      
      switch (dataType) {
        case 'companies':
          // Try MCP first, fallback to mock
          results.companies = await this.mcpFetchCompanies(prepRes.requirements);
          break;
        case 'origin-locations':
          results.originLocations = await this.mcpFetchOriginLocations();
          break;
        case 'destination-locations':
          results.destinationLocations = await this.mcpFetchDestinationLocations();
          break;
        case 'frequencies':
          results.frequencies = await this.mcpFetchFrequencies();
          break;
      }
    }

    console.log('✅ Data Collection Agent: Reference data collected');
    return results;
  }

  async post(
    shared: DealState, 
    prepRes: any, 
    execRes: {
      companies?: Company[];
      originLocations?: Location[];
      destinationLocations?: Location[];
      frequencies?: Frequency[];
    }
  ): Promise<string> {
    // Update shared state with collected data
    if (execRes.companies) {
      shared.companies = execRes.companies;
    }
    if (execRes.originLocations) {
      shared.originLocations = execRes.originLocations;
    }
    if (execRes.destinationLocations) {
      shared.destinationLocations = execRes.destinationLocations;
    }
    if (execRes.frequencies) {
      shared.frequencies = execRes.frequencies;
    }

    // Parse user requirements and populate initial deal data
    if (!shared.dealData && shared.companies && shared.originLocations && shared.destinationLocations && shared.frequencies) {
      shared.dealData = this.parseUserRequirementsToInitialDeal(shared.userRequirements, execRes);
      console.log('📝 Data Collection Agent: Extracted initial deal data from user requirements');
      console.log(`  Counterparty: ${shared.dealData.counterparty || 'Not specified'}`);
      console.log(`  Product: ${shared.dealData.product || 'Not specified'}`);
      console.log(`  Quantity: ${shared.dealData.quantity || 'Not specified'} gallons`);
      console.log(`  Origin: ${shared.dealData.originLocation || 'Not specified'}`);
      console.log(`  Destination: ${shared.dealData.destinationLocation || 'Not specified'}`);
      console.log(`  Frequency: ${shared.dealData.frequency || 'Not specified'}`);
    }

    console.log('💾 Data Collection Agent: Updated shared state');
    
    // Determine next action based on what we've collected
    if (shared.companies && shared.originLocations && 
        shared.destinationLocations && shared.frequencies) {
      return 'pricing';  // All reference data collected, move to pricing
    }
    
    return 'collection';  // Still missing some data, continue collection
  }

  // MCP-powered data fetching
  private async mcpFetchCompanies(requirements: string): Promise<Company[]> {
    // Extract company name from requirements if mentioned
    const companyNameMatch = requirements.match(/with\s+([^,]+?)(?:\s+for|\s+to|\s*,|$)/i);
    const companyName = companyNameMatch ? companyNameMatch[1].trim() : '';
    
    if (companyName) {
      try {
        console.log(`  🔗 Using MCP to find company: ${companyName}`);
        const mcpResponse = await this.callMCPTool('search-trade-reference-data', {
          type: 'companies',
          getByPrimaryMarketer: false
        });
        
        // Parse the MCP response to get actual company data
        if (mcpResponse.includes('Customer found:')) {
          // Extract company name and ID from response
          const match = mcpResponse.match(/Customer found: (.+?) \(ID: (.+?)\)/);
          if (match) {
            console.log(`  🎯 Using MCP data: ${match[1]} (ID: ${match[2]})`);
            return [{ value: match[2], text: match[1] }];
          }
        } else if (mcpResponse.includes('Multiple customers found')) {
          // Parse multiple customers
          const companies: Company[] = [];
          const matches = mcpResponse.match(/- (.+?) \(ID: (.+?)\)/g);
          if (matches) {
            for (const match of matches) {
              const parts = match.match(/- (.+?) \(ID: (.+?)\)/);
              if (parts) {
                companies.push({ value: parts[2], text: parts[1] });
              }
            }
          }
          return companies;
        }
        
        console.log('🔄 MCP found no specific match, fetching all companies...');
      } catch (error) {
        console.error('⚠️  MCP call failed, using fallback:', error);
      }
    }
    
    // Fallback to mock data
    console.log('  📦 Using mock data for companies');
    return this.mockFetchCompanies();
  }

  // MCP-powered location fetching
  private async mcpFetchOriginLocations(): Promise<Location[]> {
    try {
      console.log(`  🔗 Using MCP to fetch origin locations`);
      const mcpResponse = await this.callMCPTool('search-trade-reference-data', {
        type: 'origin-locations',
        showFiltered: false
      });
      
      // Parse locations from response
      const locations = this.parseLocationsFromResponse(mcpResponse);
      if (locations.length > 0) {
        console.log(`  ✅ Retrieved ${locations.length} origin locations via MCP`);
        return locations;
      }
    } catch (error) {
      console.error('⚠️  MCP call failed for origins, using fallback:', error);
    }
    
    console.log('  📦 Using mock data for origin locations');
    return this.mockFetchOriginLocations();
  }

  private async mcpFetchDestinationLocations(): Promise<Location[]> {
    try {
      console.log(`  🔗 Using MCP to fetch destination locations`);
      const mcpResponse = await this.callMCPTool('search-trade-reference-data', {
        type: 'destination-locations',
        showFiltered: false
      });
      
      // Parse locations from response
      const locations = this.parseLocationsFromResponse(mcpResponse);
      if (locations.length > 0) {
        console.log(`  ✅ Retrieved ${locations.length} destination locations via MCP`);
        return locations;
      }
    } catch (error) {
      console.error('⚠️  MCP call failed for destinations, using fallback:', error);
    }
    
    console.log('  📦 Using mock data for destination locations');
    return this.mockFetchDestinationLocations();
  }

  private async mcpFetchFrequencies(): Promise<Frequency[]> {
    try {
      console.log(`  🔗 Using MCP to fetch frequencies`);
      const mcpResponse = await this.callMCPTool('search-trade-reference-data', {
        type: 'frequencies'
      });
      
      // Parse frequencies from response
      const frequencies = this.parseFrequenciesFromResponse(mcpResponse);
      if (frequencies.length > 0) {
        console.log(`  ✅ Retrieved ${frequencies.length} frequencies via MCP`);
        return frequencies;
      }
    } catch (error) {
      console.error('⚠️  MCP call failed for frequencies, using fallback:', error);
    }
    
    console.log('  📦 Using mock data for frequencies');
    return this.mockFetchFrequencies();
  }

  // Helper method to parse locations from MCP response
  private parseLocationsFromResponse(response: string): Location[] {
    const locations: Location[] = [];
    
    if (response.includes('Location found:')) {
      // Single location
      const match = response.match(/Location found: (.+?) \(ID: (.+?)\)/);
      if (match) {
        locations.push({ value: match[2], text: match[1] });
      }
    } else if (response.includes('Found') && response.includes('locations:')) {
      // Multiple locations
      const matches = response.match(/- (.+?) \(ID: (.+?)\)/g);
      if (matches) {
        for (const match of matches) {
          const parts = match.match(/- (.+?) \(ID: (.+?)\)/);
          if (parts) {
            locations.push({ value: parts[2], text: parts[1] });
          }
        }
      }
    }
    
    return locations;
  }

  // Helper method to parse frequencies from MCP response
  private parseFrequenciesFromResponse(response: string): Frequency[] {
    const frequencies: Frequency[] = [];
    
    if (response.includes('Frequency found:')) {
      // Single frequency
      const match = response.match(/Frequency found: (.+?) \(ID: (.+?)\)/);
      if (match) {
        frequencies.push({ value: match[2], text: match[1] });
      }
    } else if (response.includes('Available frequencies:')) {
      // Multiple frequencies
      const matches = response.match(/- (.+?) \(ID: (.+?)\)/g);
      if (matches) {
        for (const match of matches) {
          const parts = match.match(/- (.+?) \(ID: (.+?)\)/);
          if (parts) {
            frequencies.push({ value: parts[2], text: parts[1] });
          }
        }
      }
    }
    
    return frequencies;
  }

  // Helper method to call MCP tools
  private async callMCPTool(toolName: string, args: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const mcpPath = '/Users/nickbrooks/work/alliance/qde-agent/mcp/server/index.ts';
      const child = spawn('npx', ['tsx', mcpPath]);
      
      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse JSON-RPC response
            const lines = output.split('\n').filter(line => line.trim());
            for (const line of lines) {
              try {
                const response = JSON.parse(line);
                if (response.result && response.result.content) {
                  resolve(response.result.content[0].text);
                  return;
                }
              } catch (parseError) {
                // Continue to next line
              }
            }
            reject(new Error('No valid JSON-RPC response found'));
          } catch (parseError) {
            reject(new Error(`Failed to parse MCP response: ${parseError}`));
          }
        } else {
          reject(new Error(`MCP call failed with code ${code}: ${error}`));
        }
      });

      // Send the tool call request
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };
      
      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }

  // Smart parsing method to extract deal data from natural language
  private parseUserRequirementsToInitialDeal(requirements: string, refData: any): any {
    const dealData: any = {};
    
    // Extract counterparty
    const counterpartyMatch = requirements.match(/(?:with|for)\s+([A-Z][A-Za-z\s&]+?)(?:\s+for|\s+to|\s*,|$)/i);
    if (counterpartyMatch && refData.companies) {
      const mentioned = counterpartyMatch[1].trim();
      const found = refData.companies.find((c: any) => 
        c.text.toLowerCase().includes(mentioned.toLowerCase()) ||
        mentioned.toLowerCase().includes(c.text.toLowerCase())
      );
      dealData.counterparty = found?.text || mentioned;
    }
    
    // Extract product
    if (requirements.toLowerCase().includes('propane')) {
      dealData.product = 'Propane';
    } else if (requirements.toLowerCase().includes('gasoline')) {
      dealData.product = 'Gasoline Regular Unleaded';
    } else if (requirements.toLowerCase().includes('diesel')) {
      dealData.product = 'Diesel';
    } else {
      dealData.product = 'Propane'; // Default
    }
    
    // Extract quantity
    const quantityMatch = requirements.match(/(\d+(?:,\d{3})*)\s*gallons?/i);
    if (quantityMatch) {
      dealData.quantity = parseInt(quantityMatch[1].replace(/,/g, ''));
    }
    
    // Extract origin location
    const fromMatch = requirements.match(/from\s+([A-Za-z\s]+?)(?:\s+to|\s*,|$)/i);
    if (fromMatch && refData.originLocations) {
      const mentioned = fromMatch[1].trim();
      const found = refData.originLocations.find((l: any) => 
        l.text.toLowerCase().includes(mentioned.toLowerCase()) ||
        mentioned.toLowerCase().includes(l.text.toLowerCase())
      );
      dealData.originLocation = found?.text || mentioned;
    }
    
    // Extract destination location
    const toMatch = requirements.match(/to\s+([A-Za-z\s]+?)(?:\s*,|$)/i);
    if (toMatch && refData.destinationLocations) {
      const mentioned = toMatch[1].trim();
      const found = refData.destinationLocations.find((l: any) => 
        l.text.toLowerCase().includes(mentioned.toLowerCase()) ||
        mentioned.toLowerCase().includes(l.text.toLowerCase())
      );
      dealData.destinationLocation = found?.text || mentioned;
    }
    
    // Extract frequency
    if (requirements.toLowerCase().includes('daily')) {
      dealData.frequency = 'Daily';
    } else if (requirements.toLowerCase().includes('weekly')) {
      dealData.frequency = 'Weekly';
    } else if (requirements.toLowerCase().includes('monthly')) {
      dealData.frequency = 'Monthly';
    } else if (requirements.toLowerCase().includes('quarterly')) {
      dealData.frequency = 'Quarterly';
    } else {
      dealData.frequency = 'Monthly'; // Default
    }
    
    return dealData;
  }

  // Mock data fetching methods (fallback when MCP fails)
  private async mockFetchCompanies(): Promise<Company[]> {
    return [
      { value: "1001", text: "ABC Trading Company" },
      { value: "1002", text: "XYZ Logistics Inc" },
      { value: "1003", text: "Global Petroleum Corp" },
      { value: "1004", text: "Energy Solutions LLC" },
      { value: "1005", text: "Alliance Energy Partners" }
    ];
  }

  private async mockFetchOriginLocations(): Promise<Location[]> {
    return [
      { value: "100", text: "Houston Terminal" },
      { value: "101", text: "Dallas Hub" },
      { value: "102", text: "San Antonio Depot" },
      { value: "103", text: "Austin Facility" },
      { value: "104", text: "Fort Worth Station" }
    ];
  }

  private async mockFetchDestinationLocations(): Promise<Location[]> {
    return [
      { value: "200", text: "Oklahoma City Terminal" },
      { value: "201", text: "Tulsa Distribution Center" },
      { value: "202", text: "Little Rock Hub" },
      { value: "203", text: "Kansas City Depot" },
      { value: "204", text: "New Orleans Port" }
    ];
  }

  private async mockFetchFrequencies(): Promise<Frequency[]> {
    return [
      { value: "1", text: "Daily" },
      { value: "2", text: "Weekly" },
      { value: "3", text: "Monthly" },
      { value: "4", text: "Quarterly" },
      { value: "5", text: "Annually" }
    ];
  }

  async execFallback(prepRes: any, error: Error): Promise<any> {
    console.error('❌ Data Collection Agent: Failed to fetch reference data:', error.message);
    return {
      error: 'Failed to fetch reference data',
      details: error.message,
      timestamp: new Date().toISOString()
    };
  }
}