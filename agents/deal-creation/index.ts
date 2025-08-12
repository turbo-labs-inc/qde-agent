import { Node } from '../../src/pocket-flow';
import { DealState } from '../../src/types';

interface DealCreationPrepResult {
  dealPayload: any;
  isReady: boolean;
}

interface DealCreationExecResult {
  success: boolean;
  dealId?: string;
  confirmationDetails?: any;
  error?: string;
}

export class DealCreationAgent extends Node<DealState> {
  private dealCounter: number = 1000;

  constructor(maxRetries = 3, wait = 1) {
    super(maxRetries, wait);
  }

  async prep(shared: DealState): Promise<DealCreationPrepResult> {
    console.log('📝 Deal Creation Agent: Preparing deal payload...');
    
    const dealData = shared.dealData || {};
    const pricing = dealData.pricing || {};
    
    // Assemble the complete deal payload
    const dealPayload = {
      // Basic deal information
      dealType: 'SPOT',
      tradeDate: new Date().toISOString(),
      deliveryDate: this.calculateDeliveryDate(dealData.frequency),
      
      // Counterparty information
      counterparty: {
        id: this.getCounterpartyId(shared, dealData.counterparty),
        name: dealData.counterparty,
        type: 'EXTERNAL'
      },
      
      // Product and quantity
      product: {
        type: dealData.product || 'Gasoline Regular Unleaded',
        grade: 'Regular',
        specification: 'RBOB'
      },
      quantity: {
        value: dealData.quantity,
        unit: 'gallons',
        tolerance: 0.05 // 5% tolerance
      },
      
      // Locations
      logistics: {
        origin: {
          id: this.getLocationId(shared.originLocations, dealData.originLocation),
          name: dealData.originLocation,
          type: 'TERMINAL'
        },
        destination: {
          id: this.getLocationId(shared.destinationLocations, dealData.destinationLocation),
          name: dealData.destinationLocation,
          type: 'TERMINAL'
        },
        transportMode: 'TRUCK',
        frequency: dealData.frequency
      },
      
      // Pricing structure
      pricing: {
        priceType: 'FIXED',
        basePrice: pricing.basePrice,
        locationDifferential: pricing.locationDifferential,
        totalPrice: pricing.totalPrice,
        currency: pricing.currency || 'USD',
        unit: pricing.unit || 'gallon',
        totalValue: (pricing.totalPrice || 0) * (dealData.quantity || 0),
        paymentTerms: 'NET30'
      },
      
      // Metadata
      metadata: {
        createdBy: 'QDE_AGENT_SYSTEM',
        createdAt: new Date().toISOString(),
        source: 'NATURAL_LANGUAGE_INPUT',
        agentVersion: '1.0.0'
      }
    };

    console.log('📋 Deal Creation Agent: Payload assembled');
    console.log(`  Deal Type: ${dealPayload.dealType}`);
    console.log(`  Counterparty: ${dealPayload.counterparty.name}`);
    console.log(`  Product: ${dealPayload.product.type}`);
    console.log(`  Quantity: ${dealPayload.quantity.value} ${dealPayload.quantity.unit}`);
    console.log(`  Route: ${dealPayload.logistics.origin.name} → ${dealPayload.logistics.destination.name}`);
    console.log(`  Total Value: $${dealPayload.pricing.totalValue.toFixed(2)}`);

    return {
      dealPayload,
      isReady: true
    };
  }

  async exec(prepRes: DealCreationPrepResult): Promise<DealCreationExecResult> {
    console.log('🚀 Deal Creation Agent: Submitting deal to system...');
    
    if (!prepRes.isReady) {
      return {
        success: false,
        error: 'Deal payload not ready for submission'
      };
    }

    try {
      // Simulate API call to create deal
      // In production, this would use the MCP deal-management tool
      await this.simulateApiCall(1000);
      
      // Generate a deal ID
      const dealId = this.generateDealId();
      
      console.log('✨ Deal Creation Agent: Deal created successfully!');
      console.log(`  Deal ID: ${dealId}`);
      
      // Create confirmation details
      const confirmationDetails = {
        dealId,
        status: 'CONFIRMED',
        confirmationTime: new Date().toISOString(),
        estimatedDelivery: prepRes.dealPayload.deliveryDate,
        nextSteps: [
          'Deal confirmation sent to counterparty',
          'Logistics team notified for scheduling',
          'Payment terms activated in system',
          'Deal will be visible in QDE dashboard'
        ],
        summary: {
          counterparty: prepRes.dealPayload.counterparty.name,
          product: prepRes.dealPayload.product.type,
          quantity: `${prepRes.dealPayload.quantity.value} ${prepRes.dealPayload.quantity.unit}`,
          route: `${prepRes.dealPayload.logistics.origin.name} → ${prepRes.dealPayload.logistics.destination.name}`,
          totalValue: `$${prepRes.dealPayload.pricing.totalValue.toFixed(2)}`,
          deliveryDate: prepRes.dealPayload.deliveryDate.split('T')[0]
        }
      };

      // Display confirmation
      console.log('\n📄 DEAL CONFIRMATION');
      console.log('═══════════════════════════════════════');
      console.log(`Deal ID: ${confirmationDetails.dealId}`);
      console.log(`Status: ${confirmationDetails.status}`);
      console.log('\nDeal Summary:');
      for (const [key, value] of Object.entries(confirmationDetails.summary)) {
        console.log(`  ${this.formatLabel(key)}: ${value}`);
      }
      console.log('\nNext Steps:');
      for (const step of confirmationDetails.nextSteps) {
        console.log(`  • ${step}`);
      }
      console.log('═══════════════════════════════════════');

      return {
        success: true,
        dealId,
        confirmationDetails
      };

    } catch (error: any) {
      console.error('❌ Deal Creation Agent: Failed to create deal:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async post(
    shared: DealState,
    prepRes: DealCreationPrepResult,
    execRes: DealCreationExecResult
  ): Promise<string> {
    if (execRes.success && execRes.dealId) {
      // Update shared state with deal ID and confirmation
      shared.dealId = execRes.dealId;
      shared.phase = 'complete';
      
      // Add success message to agent messages
      if (!shared.agentMessages) {
        shared.agentMessages = [];
      }
      shared.agentMessages.push({
        from: 'DealCreationAgent',
        to: 'Orchestrator',
        message: `Deal created successfully with ID: ${execRes.dealId}`,
        timestamp: new Date()
      });

      console.log('💾 Deal Creation Agent: Deal creation complete');
      console.log(`✅ Deal ${execRes.dealId} has been successfully created and confirmed`);
      
      return 'complete';
    } else {
      // Deal creation failed, may need to retry or get more information
      console.log('⚠️  Deal Creation Agent: Deal creation failed, returning to validation');
      shared.validationErrors = shared.validationErrors || [];
      shared.validationErrors.push(execRes.error || 'Unknown error during deal creation');
      
      return 'validation';
    }
  }

  private calculateDeliveryDate(frequency?: string): string {
    const today = new Date();
    let deliveryDate = new Date();
    
    switch (frequency) {
      case 'Daily':
        deliveryDate.setDate(today.getDate() + 1);
        break;
      case 'Weekly':
        deliveryDate.setDate(today.getDate() + 7);
        break;
      case 'Monthly':
        deliveryDate.setMonth(today.getMonth() + 1);
        break;
      case 'Quarterly':
        deliveryDate.setMonth(today.getMonth() + 3);
        break;
      default:
        deliveryDate.setDate(today.getDate() + 3); // Default 3 days
    }
    
    return deliveryDate.toISOString();
  }

  private getCounterpartyId(shared: DealState, counterpartyName?: string): string {
    const company = shared.companies?.find(c => c.text === counterpartyName);
    return company?.value || '1001';
  }

  private getLocationId(locations?: Array<{value: string; text: string}>, locationName?: string): string {
    const location = locations?.find(l => l.text === locationName);
    return location?.value || '100';
  }

  private generateDealId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.dealCounter++;
    return `QDE-${timestamp}-${random}-${this.dealCounter}`;
  }

  private simulateApiCall(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  async execFallback(prepRes: DealCreationPrepResult, error: Error): Promise<DealCreationExecResult> {
    console.error('❌ Deal Creation Agent: Critical failure:', error.message);
    
    return {
      success: false,
      error: `Failed to create deal: ${error.message}`
    };
  }
}