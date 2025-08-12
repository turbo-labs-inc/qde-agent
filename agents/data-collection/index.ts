import { Node } from '../../src/pocket-flow';
import { DealState, Company, Location, Frequency } from '../../src/types';

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
          results.companies = await this.mockFetchCompanies();
          break;
        case 'origin-locations':
          results.originLocations = await this.mockFetchOriginLocations();
          break;
        case 'destination-locations':
          results.destinationLocations = await this.mockFetchDestinationLocations();
          break;
        case 'frequencies':
          results.frequencies = await this.mockFetchFrequencies();
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

    console.log('💾 Data Collection Agent: Updated shared state');
    
    // Determine next action based on what we've collected
    if (shared.companies && shared.originLocations && 
        shared.destinationLocations && shared.frequencies) {
      return 'pricing';  // All reference data collected, move to pricing
    }
    
    return 'collection';  // Still missing some data, continue collection
  }

  // Mock data fetching methods (in real implementation, these would use MCP tools)
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