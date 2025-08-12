import { BaseTool } from './base-tool';
import { McpToolResponse } from '../../src/types';

export class QdeReferenceDataTool extends BaseTool {
  async execute(args: Record<string, any>): Promise<McpToolResponse> {
    const { type, showFiltered = false, getByPrimaryMarketer = false } = args;

    try {
      let data;
      
      switch (type) {
        case 'companies':
          data = await this.getCompanies(getByPrimaryMarketer);
          break;
          
        case 'origin-locations':
          data = await this.getOriginLocations(showFiltered);
          break;
          
        case 'destination-locations':
          data = await this.getDestinationLocations(showFiltered);
          break;
          
        case 'frequencies':
          data = await this.getFrequencies();
          break;
          
        default:
          return this.createErrorResponse(`Unknown reference data type: ${type}`);
      }

      return this.createResponse({
        type,
        data,
        count: Array.isArray(data) ? data.length : 1
      });
      
    } catch (error: any) {
      const context = {
        requestedType: type,
        showFiltered,
        getByPrimaryMarketer,
        ...(error.context || {})
      };
      
      return this.createErrorResponse(
        `Failed to fetch ${type} data: ${error instanceof Error ? error.message : String(error)}`,
        context
      );
    }
  }

  private async getCompanies(getByPrimaryMarketer: boolean) {
    const path = `/api/fake/tradeentry/externalcompanies?getByPrimaryMarketer=${getByPrimaryMarketer}`;
    return await this.makeRequest(path);
  }

  private async getOriginLocations(showFiltered: boolean) {
    const path = `/api/fake/tradeentry/customoriginlocations?showFiltered=${showFiltered}`;
    return await this.makeRequest(path);
  }

  private async getDestinationLocations(showFiltered: boolean) {
    const path = `/api/fake/tradeentry/customdestinationlocations?showFiltered=${showFiltered}`;
    return await this.makeRequest(path);
  }

  private async getFrequencies() {
    const path = '/api/fake/tradeentry/customfrequencyvalues';
    return await this.makeRequest(path);
  }
}