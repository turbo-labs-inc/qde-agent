import { BaseTool } from './base-tool';
import { McpToolResponse } from '../../src/types';

export class QdePricingTool extends BaseTool {
  async execute(args: Record<string, any>): Promise<McpToolResponse> {
    const { 
      type, 
      id, 
      priceType, 
      locationId, 
      productId, 
      fromDateString, 
      pricePublisherId 
    } = args;

    try {
      let data;
      
      switch (type) {
        case 'price-components':
          if (!id) {
            return this.createErrorResponse('id is required for price-components');
          }
          data = await this.getPriceComponents(id);
          break;
          
        case 'price-publishers':
          data = await this.getPricePublishers(priceType || 1);
          break;
          
        case 'opis-price':
          if (!locationId || !productId || !fromDateString) {
            return this.createErrorResponse(
              'locationId, productId, and fromDateString are required for opis-price'
            );
          }
          data = await this.getOpisPrice(locationId, productId, fromDateString);
          break;
          
        case 'price-types':
          data = await this.getPriceTypes(pricePublisherId || 1);
          break;
          
        default:
          return this.createErrorResponse(`Unknown pricing data type: ${type}`);
      }

      return this.createResponse({
        type,
        data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return this.createErrorResponse(
        `Failed to fetch ${type}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async getPriceComponents(id: number) {
    const path = `/api/fake/tradeentry/pricecomponents/${id}`;
    return await this.makeRequest(path);
  }

  private async getPricePublishers(priceType: number) {
    const path = `/api/fake/tradeentry/pricepublishers?priceType=${priceType}`;
    return await this.makeRequest(path);
  }

  private async getOpisPrice(locationId: number, productId: number, fromDateString: string) {
    const path = `/api/fake/tradeentry/previousaverageopisprice?locationId=${locationId}&productId=${productId}&fromDateString=${fromDateString}`;
    return await this.makeRequest(path);
  }

  private async getPriceTypes(pricePublisherId: number) {
    const path = `/api/fake/tradeentry/customindexpricetypes?pricePublisherId=${pricePublisherId}`;
    return await this.makeRequest(path);
  }
}