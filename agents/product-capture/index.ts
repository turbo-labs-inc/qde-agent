import { Node } from '../../src/pocket-flow';
import { ConversationState, ProductInfo } from '../../src/types/conversation';

interface ProductCaptureRequirements {
  userInput: string;
  currentProduct?: ProductInfo;
  availableProducts: any[];
}

interface ProductCaptureResults {
  product: ProductInfo;
  suggestions?: string[];
  needsClarification: boolean;
  clarificationMessage?: string;
}

export class ProductCaptureAgent extends Node<ConversationState> {
  private readonly supportedProducts = [
    { name: 'Propane', category: 'propane', keywords: ['propane', 'lpg', 'liquid propane'] },
    { name: 'Gasoline Regular Unleaded', category: 'gasoline', keywords: ['gasoline', 'gas', 'unleaded', 'regular'] },
    { name: 'Diesel', category: 'diesel', keywords: ['diesel', 'fuel oil', 'distillate'] },
    { name: 'Natural Gas', category: 'gas', keywords: ['natural gas', 'ng', 'pipeline gas'] }
  ];

  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: ConversationState): Promise<ProductCaptureRequirements> {
    console.log('⛽ Product Capture Agent: Analyzing product information...');
    
    const userInput = shared.lastUserInput;
    const currentProduct = shared.dealInfo.product;
    const availableProducts = shared.referenceData?.products || this.supportedProducts;
    
    console.log(`  👤 User input: "${userInput}"`);
    console.log(`  ⛽ Current product: ${currentProduct?.name || 'none'}`);
    console.log(`  📊 Available products: ${availableProducts.length}`);
    
    return {
      userInput,
      currentProduct,
      availableProducts
    };
  }

  async exec(prepRes: ProductCaptureRequirements): Promise<ProductCaptureResults> {
    console.log('🔍 Product Capture Agent: Processing product information...');
    
    try {
      // Extract potential products from user input
      const extractedProducts = this.extractProductNames(prepRes.userInput);
      console.log(`  📝 Extracted products: ${extractedProducts.join(', ')}`);
      
      if (extractedProducts.length === 0) {
        // No product mentioned, ask for clarification
        return {
          product: prepRes.currentProduct || { name: '', confidence: 0 },
          needsClarification: true,
          clarificationMessage: 'What type of fuel do you need for this deal?',
          suggestions: this.getAvailableProducts(prepRes.availableProducts)
        };
      }
      
      // Find best match among available products
      const bestMatch = this.findBestProductMatch(
        extractedProducts[0], 
        prepRes.availableProducts
      );
      
      // Accept matches with good confidence
      if (bestMatch.confidence >= 0.8) {
        console.log(`  ✅ Found good match: ${bestMatch.name} (confidence: ${bestMatch.confidence})`);
        return {
          product: bestMatch,
          needsClarification: false
        };
      } else if (bestMatch.confidence > 0.3) {
        console.log(`  ❓ Found potential match: ${bestMatch.name} (confidence: ${bestMatch.confidence})`);
        return {
          product: bestMatch,
          needsClarification: true,
          clarificationMessage: `Did you mean "${bestMatch.name}"?`,
          suggestions: this.getAvailableProducts(prepRes.availableProducts)
        };
      } else {
        console.log(`  ❌ No good match found for: ${extractedProducts[0]}`);
        return {
          product: { 
            name: extractedProducts[0], 
            confidence: 0.3 
          },
          needsClarification: true,
          clarificationMessage: `I'm not sure about "${extractedProducts[0]}". What type of fuel do you need?`,
          suggestions: this.getAvailableProducts(prepRes.availableProducts)
        };
      }
      
    } catch (error) {
      console.error('❌ Product Capture Agent: Processing failed:', error);
      throw error;
    }
  }

  async post(
    shared: ConversationState,
    prepRes: ProductCaptureRequirements,
    execRes: ProductCaptureResults
  ): Promise<string> {
    // Update shared state with product information
    if (!shared.dealInfo) {
      shared.dealInfo = {};
    }
    shared.dealInfo.product = execRes.product;
    
    console.log('💾 Product Capture Agent: Updated product information');
    
    if (execRes.needsClarification) {
      console.log('❓ Product Capture Agent: Needs clarification');
      shared.currentTopic = 'product';
      shared.confirmationNeeded = false;
    } else {
      console.log('✅ Product Capture Agent: Product confirmed');
      // Product captured successfully, remove from missing fields
      shared.missingFields = shared.missingFields.filter(field => field !== 'product');
    }
    
    // Return empty to let the orchestrator's .next() routing take over
    return '';
  }

  private extractProductNames(userInput: string): string[] {
    const input = userInput.trim();
    
    // Direct product selection - handle user responses to suggestions
    for (const product of this.supportedProducts) {
      if (input.toLowerCase() === product.name.toLowerCase()) {
        return [product.name];
      }
      
      // Check if any keywords match exactly
      for (const keyword of product.keywords) {
        if (input.toLowerCase() === keyword.toLowerCase()) {
          return [product.name];
        }
      }
    }
    
    // Check for keyword presence in user input
    for (const product of this.supportedProducts) {
      for (const keyword of product.keywords) {
        if (input.toLowerCase().includes(keyword.toLowerCase())) {
          return [product.name];
        }
      }
    }
    
    return [];
  }

  private findBestProductMatch(productName: string, availableProducts: any[]): ProductInfo {
    let bestMatch: ProductInfo = {
      name: productName,
      confidence: 0
    };
    
    const input = productName.toLowerCase();
    
    // Check supported products first
    for (const product of this.supportedProducts) {
      let confidence = 0;
      
      // Exact name match
      if (input === product.name.toLowerCase()) {
        confidence = 1.0;
      }
      // Keyword match
      else if (product.keywords.some(keyword => 
        input.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(input)
      )) {
        confidence = 0.9;
      }
      // Partial name match
      else if (product.name.toLowerCase().includes(input) || input.includes(product.name.toLowerCase())) {
        confidence = 0.8;
      }
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          name: product.name,
          category: product.category as any,
          confidence
        };
      }
    }
    
    // Check available products from reference data
    if (availableProducts && availableProducts.length > 0) {
      for (const product of availableProducts) {
        const productName = product.text || product.name || '';
        const similarity = this.calculateProductSimilarity(input, productName.toLowerCase());
        
        if (similarity > bestMatch.confidence) {
          bestMatch = {
            name: productName,
            id: product.value || product.id,
            confidence: similarity
          };
        }
      }
    }
    
    return bestMatch;
  }

  private calculateProductSimilarity(input: string, productName: string): number {
    // Exact match
    if (input === productName) return 1.0;
    
    // One contains the other
    if (input.includes(productName) || productName.includes(input)) return 0.8;
    
    // Word overlap
    const inputWords = input.split(/\s+/);
    const productWords = productName.split(/\s+/);
    const commonWords = inputWords.filter(word => productWords.includes(word));
    
    if (commonWords.length > 0) {
      return (commonWords.length / Math.max(inputWords.length, productWords.length)) * 0.7;
    }
    
    return 0;
  }

  private getSimilarProducts(productName: string, availableProducts: any[]): string[] {
    const input = productName.toLowerCase();
    
    return this.supportedProducts
      .filter(product => {
        const similarity = this.calculateProductSimilarity(input, product.name.toLowerCase());
        return similarity > 0.2 && similarity < 0.7;
      })
      .map(product => product.name)
      .slice(0, 3);
  }

  private getAvailableProducts(availableProducts: any[]): string[] {
    // Return supported products as suggestions
    return this.supportedProducts.map(product => product.name);
  }

  async execFallback(prepRes: ProductCaptureRequirements, error: Error): Promise<ProductCaptureResults> {
    console.error('❌ Product Capture Agent: Fallback activated:', error.message);
    
    return {
      product: { name: '', confidence: 0 },
      needsClarification: true,
      clarificationMessage: "I had trouble processing the product information. What type of fuel do you need?",
      suggestions: this.getAvailableProducts(prepRes.availableProducts)
    };
  }
}