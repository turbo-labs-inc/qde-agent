// Core domain types
export interface Company {
  value: string;
  text: string;
}

export interface Location {
  value: string;
  text: string;
}

export interface Frequency {
  value: string;
  text: string;
}

export interface PriceComponent {
  basePrice: number;
  locationDifferential: number;
  transportCost: number;
  fuelSurcharge: number;
  totalPrice: number;
  currency: string;
  unit: string;
  effectiveDate: string;
}

export interface PricePublisher {
  value: string;
  text: string;
}

export interface OpisPrice {
  locationId: number;
  productId: number;
  fromDate: string;
  averagePrice: number;
  highPrice: number;
  lowPrice: number;
  volumeTraded: number;
  currency: string;
  unit: string;
  lastUpdated: string;
}

export interface PricingStructure {
  basePrice?: number;
  locationDifferential?: number;
  totalPrice?: number;
  currency?: string;
  unit?: string;
}

// Agent workflow types
export interface DealData {
  counterparty?: string;
  originLocation?: string;
  destinationLocation?: string;
  product?: string;
  quantity?: number;
  frequency?: string;
  pricing?: PricingStructure;
}

export interface DealState {
  // User input
  userRequirements: string;
  
  // Reference data
  companies?: Company[];
  originLocations?: Location[];
  destinationLocations?: Location[];
  frequencies?: Frequency[];
  
  // Pricing data
  priceComponents?: PriceComponent[];
  pricingCalculations?: any[];
  opisPrices?: OpisPrice[];
  
  // Deal structure
  dealData?: DealData;
  
  // Workflow state
  phase: 'parsing' | 'collection' | 'pricing' | 'validation' | 'creation' | 'complete';
  missingFields?: string[];
  validationErrors?: string[];
  dealId?: string;
  
  // Agent communication
  agentMessages?: Array<{
    from: string;
    to: string;
    message: string;
    timestamp: Date;
  }>;
}

// MCP tool request/response types
export interface McpToolRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface McpToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// API request/response types
export interface LocationDiffPriceRequest {
  locationId: number;
  productId: number;
  quantities: number[];
}

export interface BasePriceDefaultRequest {
  priceDictionary: Record<string, number>;
  frequencyType: string;
  quantities: number[];
}

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}