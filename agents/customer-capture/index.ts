import { Node } from '../../src/pocket-flow';
import { ConversationState, CustomerInfo, DealData } from '../../src/types/conversation';
import axios from 'axios';

interface CustomerCaptureRequirements {
  userInput: string;
  currentCustomer?: CustomerInfo;
  availableCompanies: any[];
}

interface CustomerCaptureResults {
  customer: CustomerInfo;
  suggestions?: string[];
  needsClarification: boolean;
  clarificationMessage?: string;
}

export class CustomerCaptureAgent extends Node<ConversationState> {
  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: ConversationState): Promise<CustomerCaptureRequirements> {
    // console.log('🏢 Customer Capture Agent: Analyzing customer information...');
    
    const userInput = shared.lastUserInput;
    const currentCustomer = shared.dealInfo.customer;
    const availableCompanies = shared.referenceData?.companies || [];
    
    console.log(`  👤 User input: "${userInput}"`);
    console.log(`  🏢 Current customer: ${currentCustomer?.name || 'none'}`);
    console.log(`  📊 Available companies: ${availableCompanies.length}`);
    
    return {
      userInput,
      currentCustomer,
      availableCompanies
    };
  }

  async exec(prepRes: CustomerCaptureRequirements): Promise<CustomerCaptureResults> {
    // console.log('🔍 Customer Capture Agent: Processing customer information...');
    
    try {
      // Extract potential customer names from user input
      const extractedCustomers = this.extractCustomerNames(prepRes.userInput);
      console.log(`  📝 Extracted customers: ${extractedCustomers.join(', ')}`);
      
      if (extractedCustomers.length === 0) {
        // No customer mentioned, ask for clarification
        return {
          customer: prepRes.currentCustomer || { name: '', confidence: 0 },
          needsClarification: true,
          clarificationMessage: 'I need to know the customer name. Which company is this deal for?',
          suggestions: this.getPopularCustomers(prepRes.availableCompanies)
        };
      }
      
      // Get companies to search in - either available companies or search for the exact name
      let companiesToSearch = prepRes.availableCompanies;
      
      if (companiesToSearch.length === 0) {
        // No companies available, need to search
        const isCompleteCompanyName = extractedCustomers[0].match(/^[A-Z][a-zA-Z\s&.,\-']*(?:Trading|Energy|Corp|LLC|Inc|Company|Solutions|Group|Partners)$/i);
        
        if (isCompleteCompanyName) {
          // User gave complete company name, search for the full name
          console.log(`  🔍 Searching for exact company: "${extractedCustomers[0]}"`);
          try {
            const searchResults = await this.searchCompanies(extractedCustomers[0]);
            companiesToSearch = searchResults;
            console.log(`  📊 Found ${searchResults.length} companies for "${extractedCustomers[0]}"`);
          } catch (error) {
            console.log(`  ⚠️ Company search failed`);
          }
        } else {
          // Extract search term for partial search
          const searchTerm = this.extractSearchTerm(prepRes.userInput);
          if (searchTerm) {
            console.log(`  🔍 Searching for companies with: "${searchTerm}"`);
            try {
              const searchResults = await this.searchCompanies(searchTerm);
              companiesToSearch = searchResults;
              console.log(`  📊 Found ${searchResults.length} companies matching "${searchTerm}"`);
            } catch (error) {
              console.log(`  ⚠️ Company search failed`);
            }
          }
        }
      }
      
      // Now try to find exact match in the companies we have
      if (companiesToSearch.length > 0) {
        const bestMatch = this.findBestCustomerMatch(extractedCustomers[0], companiesToSearch);
        
        if (bestMatch.confidence >= 0.9) {
          console.log(`  ✅ Found exact match: ${bestMatch.name} (confidence: ${bestMatch.confidence})`);
          return {
            customer: bestMatch,
            needsClarification: false
          };
        } else if (bestMatch.confidence >= 0.7) {
          console.log(`  ✅ Found good match: ${bestMatch.name} (confidence: ${bestMatch.confidence})`);
          return {
            customer: bestMatch,
            needsClarification: false
          };
        } else if (bestMatch.confidence > 0.3) {
          console.log(`  ❓ Found potential match: ${bestMatch.name} (confidence: ${bestMatch.confidence})`);
          return {
            customer: bestMatch,
            needsClarification: true,
            clarificationMessage: `Did you mean "${bestMatch.name}"?`,
            suggestions: companiesToSearch.slice(0, 5).map(c => c.Text || c.text || c.name)
          };
        } else {
          // Show search results as options
          console.log(`  📋 Showing search results`);
          return {
            customer: { name: extractedCustomers[0], confidence: 0.3, type: 'new' },
            needsClarification: true,
            clarificationMessage: `I found ${companiesToSearch.length} companies. Here are some options:`,
            suggestions: companiesToSearch.slice(0, 5).map(c => c.Text || c.text || c.name)
          };
        }
      }
      
      // Default case - no good match found
      console.log(`  ❌ No good match found for: ${extractedCustomers[0]}`);
      return {
        customer: { 
          name: extractedCustomers[0], 
          type: 'new',
          confidence: 0.5 
        },
        needsClarification: true,
        clarificationMessage: `I don't recognize "${extractedCustomers[0]}" in our system. Is this a new customer or did you mean something else?`,
        suggestions: this.getPopularCustomers(prepRes.availableCompanies)
      };
      
    } catch (error) {
      console.error('❌ Customer Capture Agent: Processing failed:', error);
      throw error;
    }
  }

  async post(
    shared: ConversationState,
    prepRes: CustomerCaptureRequirements,
    execRes: CustomerCaptureResults
  ): Promise<string> {
    // Update shared state with customer information
    if (!shared.dealInfo) {
      shared.dealInfo = {};
    }
    shared.dealInfo.customer = execRes.customer;
    
    console.log('💾 Customer Capture Agent: Updated customer information');
    
    if (execRes.needsClarification) {
      console.log('❓ Customer Capture Agent: Needs clarification');
      // Update conversation state to ask for clarification
      shared.currentTopic = 'customer';
      shared.confirmationNeeded = false;
      
      // Add clarification request with suggestions
      if (execRes.clarificationMessage && execRes.suggestions) {
        shared.clarificationRequests = shared.clarificationRequests || [];
        shared.clarificationRequests.push({
          field: 'customer',
          question: execRes.clarificationMessage,
          suggestions: execRes.suggestions,
          reason: 'Customer selection needed',
          priority: 'high'
        });
      }
    } else {
      console.log('✅ Customer Capture Agent: Customer confirmed');
      // Customer captured successfully, remove from missing fields
      shared.missingFields = shared.missingFields.filter(field => field !== 'customer');
      
      // Clear any customer-related clarification requests
      shared.clarificationRequests = shared.clarificationRequests?.filter(req => req.field !== 'customer') || [];
    }
    
    // Return empty to let the orchestrator's .next() routing take over
    return '';
  }

  private extractCustomerNames(userInput: string): string[] {
    const input = userInput.trim();
    
    // Direct company name match - handle user selections from suggestions
    if (input.match(/^[A-Z][a-zA-Z\s&.,\-']*(?:Trading|Energy|Corp|LLC|Inc|Company|Solutions|Group|Partners|Hub)$/i)) {
      return [input];
    }
    
    // Handle simple user responses like "Houston Energy Trading" (direct selection)
    if (input.match(/^[A-Z][a-zA-Z\s&.,\-']*$/i) && input.length > 3) {
      return [input];
    }
    
    // Action phrases "use X", "choose X", "go with X"
    const actionPattern = /(?:use|choose|select|pick|go\s+with)\s+(.+)/i;
    const actionMatch = actionPattern.exec(input);
    if (actionMatch) {
      return [actionMatch[1].trim()];
    }
    
    // "with [Company]" or "for [Company]" patterns
    const withPattern = /(?:with|for)\s+(.+)/i;
    const withMatch = withPattern.exec(input);
    if (withMatch) {
      return [withMatch[1].trim()];
    }
    
    return [];
  }

  private findBestCustomerMatch(customerName: string, availableCompanies: any[]): CustomerInfo {
    if (!availableCompanies || availableCompanies.length === 0) {
      return {
        name: customerName,
        type: 'new',
        confidence: 0.1
      };
    }
    
    const searchName = customerName.toLowerCase().trim();
    
    for (const company of availableCompanies) {
      const companyName = company.Text || company.text || company.name || '';
      if (!companyName) continue;
      
      const companyNameLower = companyName.toLowerCase().trim();
      
      // Exact match gets perfect score
      if (companyNameLower === searchName) {
        console.log(`  ✅ Exact match found: "${companyName}"`);
        return {
          name: companyName,
          id: company.Value || company.value || company.id,
          type: 'existing',
          confidence: 1.0
        };
      }
    }
    
    // If no exact match, find best partial match
    let bestMatch = { name: customerName, confidence: 0, type: 'new' as const };
    
    for (const company of availableCompanies) {
      const companyName = company.Text || company.text || company.name || '';
      if (!companyName) continue;
      
      const confidence = this.calculateSimilarity(searchName, companyName.toLowerCase());
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          name: companyName,
          id: company.Value || company.value || company.id,
          type: 'existing',
          confidence
        };
      }
    }
    
    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    // Exact match
    if (str1 === str2) return 1.0;
    
    // One contains the other
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;
    
    // Check word overlap
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    
    if (intersection.length > 0) {
      return (intersection.length / Math.max(words1.length, words2.length)) * 0.7;
    }
    
    // Levenshtein distance for character-level similarity
    return this.levenshteinSimilarity(str1, str2);
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private getSimilarCustomers(customerName: string, availableCompanies: any[]): string[] {
    return availableCompanies
      .map(company => ({
        name: company.text || company.name,
        similarity: this.calculateSimilarity(customerName.toLowerCase(), (company.text || company.name || '').toLowerCase())
      }))
      .filter(item => item.similarity > 0.2 && item.similarity < 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(item => item.name);
  }

  private getPopularCustomers(availableCompanies: any[]): string[] {
    // Return top 3 companies (in a real system, these might be most frequently used)
    return availableCompanies
      .slice(0, 3)
      .map(company => company.text || company.name)
      .filter(name => name);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'Create', 'Deal', 'With', 'For', 'From', 'To', 'The', 'And', 'Or',
      'Gallons', 'Barrels', 'Daily', 'Weekly', 'Monthly', 'Delivery'
    ];
    return commonWords.includes(word);
  }

  /**
   * Extract search terms from user input (e.g., "Something with Energy" -> "Energy")
   */
  private extractSearchTerm(userInput: string): string | null {
    const input = userInput.toLowerCase();
    
    // Pattern: "something with [TERM]" or "company with [TERM]" 
    const withPattern = /(?:something|company|customer|business)\s+with\s+([a-zA-Z]+)/i;
    const withMatch = withPattern.exec(userInput);
    if (withMatch) {
      return withMatch[1];
    }
    
    // Pattern: "[TERM] company" or "[TERM] energy" etc.
    const termPattern = /\b([a-zA-Z]{4,})\s+(?:company|energy|corp|inc|llc|solutions|trading|group)\b/i;
    const termMatch = termPattern.exec(userInput);
    if (termMatch && !this.isCommonWord(termMatch[1])) {
      return termMatch[1];
    }
    
    return null;
  }

  /**
   * Search for companies using API call with fallback to mock data
   */
  private async searchCompanies(searchTerm: string): Promise<any[]> {
    try {
      console.log(`  🌐 Calling Alliance Energy API for companies...`);
      
      // Try direct call to Alliance Energy API first
      const response = await axios.get('http://localhost:5000/api/custom/tradeentry/externalcompanies', {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          getByPrimaryMarketer: false
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`  📡 API returned ${response.data.length} total companies`);
        
        // Filter companies that contain the search term
        const companies = response.data.filter((company: any) => {
          const name = company.Text || company.text || company.name || '';
          return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
        
        console.log(`  🎯 Found ${companies.length} companies matching "${searchTerm}"`);
        return companies;
      }
      
      return [];
    } catch (error: any) {
      console.log(`  ⚠️ API call failed (${error.message}), using mock data...`);
      
      // Fallback to mock company data for demonstration
      return this.getMockCompanies(searchTerm);
    }
  }

  /**
   * Mock company data for testing when API is not accessible
   */
  private getMockCompanies(searchTerm: string): any[] {
    const mockCompanies = [
      { Value: "1001", Text: "Houston Energy Trading" },
      { Value: "1002", Text: "Texas Energy Solutions" },
      { Value: "1003", Text: "Alliance Energy Partners" },
      { Value: "1004", Text: "Gulf Coast Energy LLC" },
      { Value: "1005", Text: "Southwest Energy Corp" },
      { Value: "1006", Text: "ABC Trading Company" },
      { Value: "1007", Text: "ABC Energy Solutions" },
      { Value: "1008", Text: "ABC Logistics LLC" },
      { Value: "1009", Text: "XYZ Energy Corp" },
      { Value: "1010", Text: "Dallas Energy Hub" },
      { Value: "1011", Text: "Austin Energy Trading" },
      { Value: "1012", Text: "San Antonio Energy Solutions" },
      { Value: "1013", Text: "Energy First LLC" },
      { Value: "1014", Text: "Prime Energy Trading" },
      { Value: "1015", Text: "Elite Energy Partners" }
    ];

    // Filter companies that contain the search term
    const filteredCompanies = mockCompanies.filter((company: any) => {
      return company.Text.toLowerCase().includes(searchTerm.toLowerCase());
    });

    console.log(`  🎭 Using mock data: Found ${filteredCompanies.length} companies matching "${searchTerm}"`);
    return filteredCompanies;
  }


  async execFallback(prepRes: CustomerCaptureRequirements, error: Error): Promise<CustomerCaptureResults> {
    console.error('❌ Customer Capture Agent: Fallback activated:', error.message);
    
    return {
      customer: { name: '', confidence: 0 },
      needsClarification: true,
      clarificationMessage: "I had trouble processing the customer information. Could you please tell me the customer's name?"
    };
  }
}