import { BaseTool } from './base-tool';
import { McpToolResponse } from '../../src/types';

export class QdeDealManagementTool extends BaseTool {
  async execute(args: Record<string, any>): Promise<McpToolResponse> {
    const { action, dealData, dealId, status, filters } = args;

    try {
      let data;
      
      switch (action) {
        case 'create':
          if (!dealData) {
            return this.createErrorResponse('dealData is required for create action');
          }
          data = await this.createDeal(dealData);
          break;
          
        case 'update':
          if (!dealId || !dealData) {
            return this.createErrorResponse('dealId and dealData are required for update action');
          }
          data = await this.updateDeal(dealId, dealData);
          break;
          
        case 'get':
          if (!dealId) {
            return this.createErrorResponse('dealId is required for get action');
          }
          data = await this.getDeal(dealId);
          break;
          
        case 'list':
          data = await this.listDeals(filters || {});
          break;
          
        case 'update-status':
          if (!dealId || !status) {
            return this.createErrorResponse('dealId and status are required for update-status action');
          }
          data = await this.updateDealStatus(dealId, status);
          break;
          
        case 'cancel':
          if (!dealId) {
            return this.createErrorResponse('dealId is required for cancel action');
          }
          data = await this.cancelDeal(dealId, dealData?.reason);
          break;
          
        case 'delete':
          if (!dealId) {
            return this.createErrorResponse('dealId is required for delete action');
          }
          data = await this.deleteDeal(dealId);
          break;
          
        case 'history':
          if (!dealId) {
            return this.createErrorResponse('dealId is required for history action');
          }
          data = await this.getDealHistory(dealId);
          break;
          
        case 'validate':
          if (!dealId) {
            return this.createErrorResponse('dealId is required for validate action');
          }
          data = await this.validateDeal(dealId);
          break;
          
        default:
          return this.createErrorResponse(`Unknown action: ${action}. Available actions: create, update, get, list, update-status, cancel, delete, history, validate`);
      }

      return this.createResponse({
        action,
        data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return this.createErrorResponse(
        `Failed to ${action} deal: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async createDeal(dealData: any) {
    // Transform dealData to Alliance Energy API format
    const createDealRequest = this.transformToAllianceFormat(dealData);
    
    const path = '/api/fake/tradeentry/createdeal';
    return await this.makeRequest(path, {
      method: 'POST',
      data: createDealRequest
    });
  }

  private async updateDeal(dealId: string, dealData: any) {
    // For updates, include the TradeEntryId in the request
    const updateDealRequest = {
      ...this.transformToAllianceFormat(dealData),
      TradeEntryId: parseInt(dealId)
    };
    
    const path = '/api/fake/tradeentry/createdeal';
    return await this.makeRequest(path, {
      method: 'POST',
      data: updateDealRequest
    });
  }

  private async getDeal(dealId: string) {
    const path = `/api/fake/deals/${dealId}`;
    return await this.makeRequest(path);
  }

  private async listDeals(filters: any) {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
    if (filters.toDate) queryParams.append('toDate', filters.toDate);
    if (filters.counterPartyId) queryParams.append('counterPartyId', filters.counterPartyId.toString());
    if (filters.pageNumber) queryParams.append('pageNumber', filters.pageNumber.toString());
    if (filters.pageSize) queryParams.append('pageSize', filters.pageSize.toString());
    
    const path = `/api/fake/deals/list?${queryParams.toString()}`;
    return await this.makeRequest(path);
  }

  private async updateDealStatus(dealId: string, newStatus: string) {
    const path = `/api/fake/deals/${dealId}/status`;
    return await this.makeRequest(path, {
      method: 'PUT',
      data: {
        newStatus,
        reason: 'Status updated via QDE Agent'
      }
    });
  }

  private async cancelDeal(dealId: string, reason?: string) {
    const path = `/api/fake/deals/${dealId}`;
    return await this.makeRequest(path, {
      method: 'DELETE',
      data: {
        reason: reason || 'Cancelled via QDE Agent',
        cancelledBy: 'QDE Agent System'
      }
    });
  }

  private async deleteDeal(dealId: string) {
    // For now, delete maps to cancel since that's what the API provides
    return await this.cancelDeal(dealId, 'Deleted via QDE Agent');
  }

  private async getDealHistory(dealId: string) {
    const path = `/api/fake/deals/${dealId}/history`;
    return await this.makeRequest(path);
  }

  private async validateDeal(dealId: string) {
    const path = `/api/fake/deals/${dealId}/validation`;
    return await this.makeRequest(path);
  }

  private transformToAllianceFormat(dealData: any): any {
    // Transform simplified deal data to Alliance Energy API format
    const now = new Date();
    const fromDate = dealData.fromDate ? new Date(dealData.fromDate) : now;
    const toDate = dealData.toDate ? new Date(dealData.toDate) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
    
    return {
      TradeInstrumentId: dealData.tradeInstrumentId || 1, // Default to Physical Fixed Price
      InternalCounterPartyId: dealData.internalCounterPartyId || 100,
      InternalColleagueId: dealData.internalColleagueId || 50,
      ExternalCounterPartyId: dealData.externalCounterPartyId || this.parseCounterpartyId(dealData.counterparty),
      ExternalColleagueId: dealData.externalColleagueId,
      MovementTypeCvId: dealData.movementTypeCvId || 1, // Default to Truck
      IsLegalContractOurs: dealData.isLegalContractOurs ?? true,
      TradeEntryDateTime: now.toISOString(),
      FromDateTime: fromDate.toISOString(),
      ToDateTime: toDate.toISOString(),
      Comments: dealData.comments || `Deal created via QDE Agent: ${dealData.counterparty || 'Unknown counterparty'}`,
      Description: dealData.description || `${dealData.product || 'Product'} delivery from ${dealData.originLocation || 'Origin'} to ${dealData.destinationLocation || 'Destination'}`,
      Activate: dealData.activate || false,
      SuppressEmail: dealData.suppressEmail || false,
      TradeEntryDetails: this.buildTradeEntryDetails(dealData)
    };
  }

  private parseCounterpartyId(counterparty: string): number {
    // Try to extract ID from counterparty string, or return default
    const match = counterparty?.match(/\d+/);
    return match ? parseInt(match[0]) : 200; // Default external counterparty ID
  }

  private buildTradeEntryDetails(dealData: any): any[] {
    const details = [];
    const now = new Date();
    const fromDate = dealData.fromDate ? new Date(dealData.fromDate) : now;
    const toDate = dealData.toDate ? new Date(dealData.toDate) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    // Generate quantities based on frequency
    const quantities = this.generateQuantities(dealData.quantity || 1000, dealData.frequency || 'monthly', fromDate, toDate);
    
    const detail = {
      LocationId: dealData.destinationLocationId || this.parseLocationId(dealData.destinationLocation) || 150,
      OriginLocationId: dealData.originLocationId || this.parseLocationId(dealData.originLocation),
      ProductId: dealData.productId || this.parseProductId(dealData.product) || 1,
      PayOrReceiveCvId: dealData.payOrReceiveCvId || 1, // Default to Pay
      FrequencyCvId: dealData.frequencyCvId || this.parseFrequencyId(dealData.frequency) || 3, // Default to Monthly
      UnitOfMeasureId: dealData.unitOfMeasureId || 10, // Default to Gallons
      FromDateTime: fromDate.toISOString(),
      ToDateTime: toDate.toISOString(),
      Quantities: quantities,
      Prices: dealData.prices || [{
        TradePriceTypeId: 1, // Fixed price
        CurrencyId: 1, // USD
        UnitOfMeasureId: 10, // $/Gallon
        PriceValue: dealData.priceValue || 2.50
      }]
    };
    
    details.push(detail);
    return details;
  }

  private parseLocationId(location: string): number | undefined {
    if (!location) return undefined;
    const match = location.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }

  private parseProductId(product: string): number {
    if (!product) return 1;
    const productLower = product.toLowerCase();
    if (productLower.includes('propane')) return 1;
    if (productLower.includes('butane')) return 2;
    if (productLower.includes('isobutane')) return 3;
    if (productLower.includes('natural gasoline')) return 4;
    if (productLower.includes('ethane')) return 5;
    if (productLower.includes('crude')) return 6;
    if (productLower.includes('diesel')) return 7;
    if (productLower.includes('gasoline')) return 8;
    return 1; // Default to Propane
  }

  private parseFrequencyId(frequency: string): number {
    if (!frequency) return 3;
    const freqLower = frequency.toLowerCase();
    if (freqLower.includes('daily')) return 1;
    if (freqLower.includes('weekly')) return 2;
    if (freqLower.includes('monthly')) return 3;
    if (freqLower.includes('quarterly')) return 4;
    return 3; // Default to Monthly
  }

  private generateQuantities(totalQuantity: number, frequency: string, fromDate: Date, toDate: Date): any[] {
    const quantities = [];
    const freqLower = frequency.toLowerCase();
    
    if (freqLower.includes('monthly')) {
      const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
      
      while (current <= end) {
        quantities.push({
          DateTime: current.toISOString(),
          Quantity: totalQuantity,
          PeriodName: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (freqLower.includes('weekly')) {
      // Generate weekly quantities
      const current = new Date(fromDate);
      while (current <= toDate) {
        quantities.push({
          DateTime: current.toISOString(),
          Quantity: totalQuantity,
          PeriodName: `Week of ${current.toLocaleDateString()}`
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Default: single quantity for the entire period
      quantities.push({
        DateTime: fromDate.toISOString(),
        Quantity: totalQuantity,
        PeriodName: `${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`
      });
    }
    
    return quantities;
  }
}