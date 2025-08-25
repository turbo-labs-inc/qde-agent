import { Node } from '../../src/pocket-flow';
import { ConversationState, QuantityInfo } from '../../src/types/conversation';

interface QuantityCaptureRequirements {
  userInput: string;
  currentQuantity?: QuantityInfo;
}

interface QuantityCaptureResults {
  quantity: QuantityInfo;
  needsClarification: boolean;
  clarificationMessage?: string;
  suggestions?: string[];
}

export class QuantityCaptureAgent extends Node<ConversationState> {
  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: ConversationState): Promise<QuantityCaptureRequirements> {
    console.log('📊 Quantity Capture Agent: Analyzing quantity information...');
    
    const userInput = shared.lastUserInput;
    const currentQuantity = shared.dealInfo.quantity;
    
    console.log(`  👤 User input: "${userInput}"`);
    console.log(`  📊 Current quantity: ${currentQuantity?.amount || 'none'} ${currentQuantity?.unit || ''}`);
    
    return {
      userInput,
      currentQuantity
    };
  }

  async exec(prepRes: QuantityCaptureRequirements): Promise<QuantityCaptureResults> {
    console.log('🔍 Quantity Capture Agent: Processing quantity information...');
    
    try {
      // Extract quantity from user input
      const extractedQuantity = this.extractQuantity(prepRes.userInput);
      
      if (!extractedQuantity) {
        return {
          quantity: prepRes.currentQuantity || { amount: 0, unit: 'gallons' },
          needsClarification: true,
          clarificationMessage: 'How many gallons do you need for this deal?',
          suggestions: ['1,000 gallons', '5,000 gallons', '10,000 gallons', '25,000 gallons']
        };
      }

      // Validate quantity ranges
      const validation = this.validateQuantity(extractedQuantity);
      
      if (validation.isValid) {
        console.log(`  ✅ Valid quantity: ${extractedQuantity.amount} ${extractedQuantity.unit}`);
        return {
          quantity: extractedQuantity,
          needsClarification: false
        };
      } else {
        console.log(`  ⚠️ Quantity validation issues: ${validation.issues.join(', ')}`);
        return {
          quantity: extractedQuantity,
          needsClarification: true,
          clarificationMessage: `${validation.issues.join(' ')} Would you like to adjust the quantity?`,
          suggestions: validation.suggestions
        };
      }
      
    } catch (error) {
      console.error('❌ Quantity Capture Agent: Processing failed:', error);
      throw error;
    }
  }

  async post(
    shared: ConversationState,
    prepRes: QuantityCaptureRequirements,
    execRes: QuantityCaptureResults
  ): Promise<string> {
    // Update shared state with quantity information
    if (!shared.dealInfo) {
      shared.dealInfo = {};
    }
    shared.dealInfo.quantity = execRes.quantity;
    
    console.log('💾 Quantity Capture Agent: Updated quantity information');
    
    if (execRes.needsClarification) {
      console.log('❓ Quantity Capture Agent: Needs clarification');
      shared.currentTopic = 'quantity';
      shared.confirmationNeeded = false;
      
      // Add clarification request with suggestions
      if (execRes.clarificationMessage && execRes.suggestions) {
        shared.clarificationRequests = shared.clarificationRequests || [];
        shared.clarificationRequests.push({
          field: 'quantity',
          question: execRes.clarificationMessage,
          suggestions: execRes.suggestions,
          reason: 'Quantity validation needed',
          priority: 'high'
        });
      }
    } else {
      console.log('✅ Quantity Capture Agent: Quantity confirmed');
      shared.missingFields = shared.missingFields.filter(field => field !== 'quantity');
      
      // Clear any quantity-related clarification requests
      shared.clarificationRequests = shared.clarificationRequests?.filter(req => req.field !== 'quantity') || [];
    }
    
    // Return empty to let the orchestrator's .next() routing take over
    return '';
  }

  private extractQuantity(userInput: string): QuantityInfo | null {
    const input = userInput.toLowerCase();
    
    // Pattern 1: Number with gallons/barrels
    const quantityPattern = /(\d+(?:,\d{3})*)\s*(gallons?|barrels?|gal|bbl)/i;
    const match = quantityPattern.exec(userInput);
    
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      const unitText = match[2].toLowerCase();
      const unit = unitText.includes('gallon') || unitText.includes('gal') ? 'gallons' as const : 'barrels' as const;
      
      return {
        amount,
        unit,
        flexibility: this.determineFlexibility(userInput)
      };
    }

    // Pattern 2: Just numbers (assume gallons)
    const numberPattern = /(\d+(?:,\d{3})*)/;
    const numberMatch = numberPattern.exec(userInput);
    
    if (numberMatch) {
      const amount = parseInt(numberMatch[1].replace(/,/g, ''));
      // Only accept if it's a reasonable fuel quantity
      if (amount >= 100 && amount <= 200000) {
        return {
          amount,
          unit: 'gallons',
          flexibility: this.determineFlexibility(userInput)
        };
      }
    }

    return null;
  }

  private determineFlexibility(userInput: string): 'exact' | 'approximate' | 'minimum' {
    const input = userInput.toLowerCase();
    
    if (input.includes('exact') || input.includes('precisely') || input.includes('must be')) {
      return 'exact';
    } else if (input.includes('about') || input.includes('around') || input.includes('approximately') || input.includes('roughly')) {
      return 'approximate';
    } else if (input.includes('at least') || input.includes('minimum') || input.includes('or more')) {
      return 'minimum';
    }
    
    return 'exact'; // Default
  }

  private validateQuantity(quantity: QuantityInfo): { isValid: boolean; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Business rules validation
    if (quantity.amount < 1000) {
      issues.push('Minimum quantity is 1,000 gallons.');
      suggestions.push('1,000 gallons', '2,500 gallons', '5,000 gallons');
    } else if (quantity.amount > 100000) {
      issues.push('Maximum quantity is 100,000 gallons.');
      suggestions.push('50,000 gallons', '75,000 gallons', '100,000 gallons');
    }

    // Unit validation
    if (quantity.unit !== 'gallons' && quantity.unit !== 'barrels') {
      issues.push('We only handle gallons or barrels.');
      suggestions.push(`${quantity.amount} gallons`, `${Math.round(quantity.amount / 42)} barrels`);
    }

    // Reasonable quantity ranges
    if (quantity.amount % 500 !== 0 && quantity.amount > 1000) {
      const rounded = Math.round(quantity.amount / 500) * 500;
      suggestions.push(`${rounded} gallons (rounded to nearest 500)`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions: suggestions.length > 0 ? suggestions : [
        `${quantity.amount} gallons`,
        `${quantity.amount + 1000} gallons`,
        `${Math.max(1000, quantity.amount - 1000)} gallons`
      ]
    };
  }

  async execFallback(prepRes: QuantityCaptureRequirements, error: Error): Promise<QuantityCaptureResults> {
    console.error('❌ Quantity Capture Agent: Fallback activated:', error.message);
    
    return {
      quantity: { amount: 0, unit: 'gallons' },
      needsClarification: true,
      clarificationMessage: "I had trouble processing the quantity. How many gallons do you need?",
      suggestions: ['1,000 gallons', '5,000 gallons', '10,000 gallons']
    };
  }
}