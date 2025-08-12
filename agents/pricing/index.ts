import { Node } from '../../src/pocket-flow';
import { DealState, PriceComponent, OpisPrice, PricingStructure } from '../../src/types';
import axios from 'axios';

interface PricingPrepResult {
  dealData: any;
  needsPricing: boolean;
  locationId?: number;
  productId?: number;
  quantity?: number;
  frequency?: string;
}

interface PricingExecResult {
  priceComponents?: PriceComponent[];
  opisPrices?: OpisPrice[];
  pricingCalculations?: any[];
  calculatedPricing?: PricingStructure;
}

export class PricingAgent extends Node<DealState> {
  private apiBaseUrl: string;

  constructor(maxRetries = 3, wait = 1) {
    super(maxRetries, wait);
    this.apiBaseUrl = process.env.QDE_API_BASE_URL || 'http://localhost:8000';
  }

  async prep(shared: DealState): Promise<PricingPrepResult> {
    console.log('💰 Pricing Agent: Analyzing pricing requirements...');
    
    const dealData = shared.dealData || {};
    
    // Extract location and product IDs from selected values
    const originLocation = shared.originLocations?.find(
      loc => loc.text === dealData.originLocation
    );
    const locationId = originLocation ? parseInt(originLocation.value) : 100;
    
    // Default product ID (in real system would be derived from product selection)
    const productId = 5; // Gasoline Regular Unleaded
    const quantity = dealData.quantity || 5000;
    const frequency = dealData.frequency || 'Monthly';

    return {
      dealData,
      needsPricing: true,
      locationId,
      productId,
      quantity,
      frequency
    };
  }

  async exec(prepRes: PricingPrepResult): Promise<PricingExecResult> {
    console.log('🔄 Pricing Agent: Fetching pricing data...');
    
    const results: PricingExecResult = {};

    try {
      // 1. Fetch OPIS historical price
      console.log('  📊 Fetching OPIS price data...');
      const opisResponse = await axios.get(
        `${this.apiBaseUrl}/api/fake/tradeentry/previousaverageopisprice`,
        {
          params: {
            locationId: prepRes.locationId,
            productId: prepRes.productId,
            fromDateString: new Date().toISOString().split('T')[0]
          }
        }
      );
      results.opisPrices = [opisResponse.data];
      console.log(`    ✓ OPIS average price: $${opisResponse.data.averagePrice}/gallon`);

      // 2. Calculate location differential pricing
      console.log('  📍 Calculating location differentials...');
      const locationDiffResponse = await axios.post(
        `${this.apiBaseUrl}/api/fake/tradeentry/locationdiffpricedefault`,
        {
          locationId: prepRes.locationId,
          productId: prepRes.productId,
          quantities: [prepRes.quantity]
        }
      );
      const locationDiff = locationDiffResponse.data.calculations[0];
      console.log(`    ✓ Location differential: $${locationDiff.differential}/gallon`);

      // 3. Calculate base price defaults
      console.log('  💵 Computing base price...');
      const basePriceResponse = await axios.post(
        `${this.apiBaseUrl}/api/fake/tradeentry/basepricedefault`,
        {
          priceDictionary: {
            base: opisResponse.data.averagePrice,
            premium: 0.05
          },
          frequencyType: prepRes.frequency,
          quantities: [prepRes.quantity]
        }
      );
      const basePricing = basePriceResponse.data.pricingBreakdown[0];
      console.log(`    ✓ Final price: $${basePricing.finalPrice}/gallon`);

      // 4. Fetch price components for additional details
      console.log('  📋 Getting price component details...');
      const componentResponse = await axios.get(
        `${this.apiBaseUrl}/api/fake/tradeentry/pricecomponents/123`
      );
      
      // Create comprehensive price component
      const priceComponent: PriceComponent = {
        basePrice: basePricing.finalPrice,
        locationDifferential: locationDiff.differential,
        transportCost: 0.15, // From component data
        fuelSurcharge: 0.08,
        totalPrice: basePricing.finalPrice + locationDiff.differential,
        currency: 'USD',
        unit: 'gallon',
        effectiveDate: new Date().toISOString()
      };
      
      results.priceComponents = [priceComponent];
      results.pricingCalculations = [
        locationDiffResponse.data,
        basePriceResponse.data
      ];
      
      // Create final pricing structure
      results.calculatedPricing = {
        basePrice: basePricing.finalPrice,
        locationDifferential: locationDiff.differential,
        totalPrice: priceComponent.totalPrice,
        currency: 'USD',
        unit: 'gallon'
      };

      console.log('✅ Pricing Agent: All pricing data collected successfully');
      console.log(`  📊 Total price: $${priceComponent.totalPrice.toFixed(3)}/gallon`);
      console.log(`  📦 For ${prepRes.quantity} gallons = $${(priceComponent.totalPrice * (prepRes.quantity || 0)).toFixed(2)}`);

    } catch (error: any) {
      console.error('❌ Pricing Agent: Error fetching pricing data:', error.response?.data || error.message);
      // Use fallback pricing if API fails
      return await this.execFallback(prepRes, error);
    }

    return results;
  }

  async post(
    shared: DealState,
    prepRes: PricingPrepResult,
    execRes: PricingExecResult
  ): Promise<string> {
    // Update shared state with pricing data
    if (execRes.priceComponents) {
      shared.priceComponents = execRes.priceComponents;
    }
    if (execRes.opisPrices) {
      shared.opisPrices = execRes.opisPrices;
    }
    if (execRes.pricingCalculations) {
      shared.pricingCalculations = execRes.pricingCalculations;
    }
    
    // Update deal data with calculated pricing
    if (execRes.calculatedPricing && shared.dealData) {
      shared.dealData.pricing = execRes.calculatedPricing;
    }

    console.log('💾 Pricing Agent: Updated shared state with pricing information');
    
    // Move to validation phase
    shared.phase = 'validation';
    return 'validation';
  }

  async execFallback(prepRes: PricingPrepResult, error: Error): Promise<PricingExecResult> {
    console.error('❌ Pricing Agent: Failed to calculate pricing:', error.message);
    
    // Return default pricing as fallback
    const defaultPricing: PricingStructure = {
      basePrice: 2.85,
      locationDifferential: 0.05,
      totalPrice: 2.90,
      currency: 'USD',
      unit: 'gallon'
    };

    return {
      calculatedPricing: defaultPricing,
      priceComponents: [{
        basePrice: 2.85,
        locationDifferential: 0.05,
        transportCost: 0.15,
        fuelSurcharge: 0.08,
        totalPrice: 2.90,
        currency: 'USD',
        unit: 'gallon',
        effectiveDate: new Date().toISOString()
      }]
    };
  }
}