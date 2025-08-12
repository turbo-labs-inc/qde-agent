import { BaseTool } from './base-tool';
import { McpToolResponse } from '../../src/types';

export class QdeCalculationsTool extends BaseTool {
  async execute(args: Record<string, any>): Promise<McpToolResponse> {
    const { 
      type, 
      locationId, 
      productId, 
      quantities, 
      priceDictionary, 
      frequencyType 
    } = args;

    try {
      let data;
      
      switch (type) {
        case 'location-diff-price':
          if (!locationId || !productId) {
            return this.createErrorResponse(
              'locationId and productId are required for location-diff-price'
            );
          }
          data = await this.calculateLocationDiffPrice(locationId, productId, quantities);
          break;
          
        case 'base-price-default':
          if (!priceDictionary || !frequencyType) {
            return this.createErrorResponse(
              'priceDictionary and frequencyType are required for base-price-default'
            );
          }
          data = await this.calculateBasePriceDefault(priceDictionary, frequencyType, quantities);
          break;
          
        case 'book-from-location':
          if (!locationId) {
            return this.createErrorResponse('locationId is required for book-from-location');
          }
          data = await this.getBookFromLocation(locationId);
          break;
          
        default:
          return this.createErrorResponse(`Unknown calculation type: ${type}`);
      }

      return this.createResponse({
        type,
        data,
        calculatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      return this.createErrorResponse(
        `Failed to calculate ${type}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async calculateLocationDiffPrice(locationId: number, productId: number, quantities?: number[]) {
    const path = '/api/fake/tradeentry/locationdiffpricedefault';
    return await this.makeRequest(path, {
      method: 'POST',
      data: {
        locationId,
        productId,
        quantities: quantities || [1000, 2000, 3000]
      }
    });
  }

  private async calculateBasePriceDefault(
    priceDictionary: Record<string, number>, 
    frequencyType: string, 
    quantities?: number[]
  ) {
    const path = '/api/fake/tradeentry/basepricedefault';
    return await this.makeRequest(path, {
      method: 'POST',
      data: {
        priceDictionary,
        frequencyType,
        quantities: quantities || [1000, 2000, 3000]
      }
    });
  }

  private async getBookFromLocation(locationId: number) {
    const path = `/api/fake/tradeentry/bookfromlocation/${locationId}`;
    return await this.makeRequest(path);
  }
}