import { Node } from '../../src/pocket-flow';
import { ConversationState, FrequencyInfo } from '../../src/types/conversation';

interface FrequencyCaptureRequirements {
  userInput: string;
  currentFrequency?: FrequencyInfo;
  availableFrequencies: any[];
}

interface FrequencyCaptureResults {
  frequency: FrequencyInfo;
  needsClarification: boolean;
  clarificationMessage?: string;
  suggestions?: string[];
}

export class FrequencyCaptureAgent extends Node<ConversationState> {
  private readonly supportedFrequencies = [
    { type: 'daily', keywords: ['daily', 'every day', 'each day'], duration: 'ongoing' },
    { type: 'weekly', keywords: ['weekly', 'every week', 'each week'], duration: 'ongoing' },
    { type: 'monthly', keywords: ['monthly', 'every month', 'each month'], duration: 'ongoing' },
    { type: 'quarterly', keywords: ['quarterly', 'every quarter', 'every 3 months'], duration: 'ongoing' },
    { type: 'one-time', keywords: ['once', 'one time', 'single', 'one delivery'], duration: 'single' }
  ];

  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: ConversationState): Promise<FrequencyCaptureRequirements> {
    console.log('📅 Frequency Capture Agent: Analyzing frequency information...');
    
    const userInput = shared.lastUserInput;
    const currentFrequency = shared.dealInfo.frequency;
    const availableFrequencies = shared.referenceData?.frequencies || this.supportedFrequencies;
    
    console.log(`  👤 User input: "${userInput}"`);
    console.log(`  📅 Current frequency: ${currentFrequency?.type || 'none'}`);
    console.log(`  📊 Available frequencies: ${availableFrequencies.length}`);
    
    return {
      userInput,
      currentFrequency,
      availableFrequencies
    };
  }

  async exec(prepRes: FrequencyCaptureRequirements): Promise<FrequencyCaptureResults> {
    console.log('🔍 Frequency Capture Agent: Processing frequency information...');
    
    try {
      const extractedFrequency = this.extractFrequency(prepRes.userInput);
      console.log(`  📝 Extracted frequency: ${JSON.stringify(extractedFrequency)}`);
      
      if (!extractedFrequency) {
        return {
          frequency: prepRes.currentFrequency || { type: 'monthly' },
          needsClarification: true,
          clarificationMessage: 'How often do you need this delivery - daily, weekly, monthly, or is this a one-time deal?',
          suggestions: this.getFrequencySuggestions()
        };
      }

      // Validate frequency
      const validation = this.validateFrequency(extractedFrequency);
      
      if (validation.isValid) {
        console.log(`  ✅ Valid frequency: ${extractedFrequency.type}`);
        return {
          frequency: extractedFrequency,
          needsClarification: false
        };
      } else {
        console.log(`  ⚠️ Frequency validation issues: ${validation.issues.join(', ')}`);
        return {
          frequency: extractedFrequency,
          needsClarification: true,
          clarificationMessage: `${validation.issues.join(' ')} Which frequency would you prefer?`,
          suggestions: validation.suggestions
        };
      }
      
    } catch (error) {
      console.error('❌ Frequency Capture Agent: Processing failed:', error);
      throw error;
    }
  }

  async post(
    shared: ConversationState,
    prepRes: FrequencyCaptureRequirements,
    execRes: FrequencyCaptureResults
  ): Promise<string> {
    // Update shared state with frequency information
    if (!shared.dealInfo) {
      shared.dealInfo = {};
    }
    shared.dealInfo.frequency = execRes.frequency;
    
    console.log('💾 Frequency Capture Agent: Updated frequency information');
    
    if (execRes.needsClarification) {
      console.log('❓ Frequency Capture Agent: Needs clarification');
      shared.currentTopic = 'frequency';
      shared.confirmationNeeded = false;
      
      // Add clarification request with suggestions
      if (execRes.clarificationMessage && execRes.suggestions) {
        shared.clarificationRequests = shared.clarificationRequests || [];
        shared.clarificationRequests.push({
          field: 'frequency',
          question: execRes.clarificationMessage,
          suggestions: execRes.suggestions,
          reason: 'Frequency selection needed',
          priority: 'high'
        });
      }
    } else {
      console.log('✅ Frequency Capture Agent: Frequency confirmed');
      shared.missingFields = shared.missingFields.filter(field => field !== 'frequency');
      
      // Clear any frequency-related clarification requests
      shared.clarificationRequests = shared.clarificationRequests?.filter(req => req.field !== 'frequency') || [];
    }
    
    // Return empty to let the orchestrator's .next() routing take over
    return '';
  }

  private extractFrequency(userInput: string): FrequencyInfo | null {
    const input = userInput.toLowerCase().trim();
    
    // Direct frequency selection - handle user responses to suggestions
    for (const freq of this.supportedFrequencies) {
      // Check if input exactly matches frequency type
      if (input === freq.type || input === `${freq.type} delivery`) {
        return {
          type: freq.type as any,
          duration: freq.duration
        };
      }
      
      // Check for keyword matches
      for (const keyword of freq.keywords) {
        if (input === keyword || input.includes(keyword)) {
          const result: FrequencyInfo = {
            type: freq.type as any,
            duration: freq.duration
          };
          
          // Try to extract date information
          const dateInfo = this.extractDateInfo(userInput, freq.type as any);
          if (dateInfo.startDate) result.startDate = dateInfo.startDate;
          if (dateInfo.endDate) result.endDate = dateInfo.endDate;
          
          return result;
        }
      }
    }
    
    // Pattern for custom frequencies (e.g., "every 2 weeks", "twice monthly")
    const customPattern = /every\s+(\d+)\s+(day|week|month)s?/i;
    const customMatch = customPattern.exec(userInput);
    
    if (customMatch) {
      const interval = parseInt(customMatch[1]);
      const unit = customMatch[2].toLowerCase();
      
      // Map to closest standard frequency
      if (unit === 'day' && interval === 1) return { type: 'daily' };
      if (unit === 'week' && interval === 1) return { type: 'weekly' };
      if (unit === 'month' && interval === 1) return { type: 'monthly' };
      if (unit === 'month' && interval === 3) return { type: 'quarterly' };
    }
    
    // Pattern for "twice" or "once"
    if (input.includes('twice')) {
      return { type: 'weekly' }; // Assume twice monthly ≈ weekly
    }
    if (input.includes('once') && !input.includes('once a')) {
      return { type: 'one-time' };
    }
    
    return null;
  }

  private extractDateInfo(userInput: string, frequencyType: string): { startDate?: string; endDate?: string } {
    const result: { startDate?: string; endDate?: string } = {};
    
    // Pattern for "starting X" or "from X"
    const startPattern = /(?:starting|from|begin)\s+([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i;
    const startMatch = startPattern.exec(userInput);
    
    if (startMatch) {
      try {
        const dateStr = startMatch[1];
        const parsedDate = this.parseDate(dateStr);
        if (parsedDate) {
          result.startDate = parsedDate;
        }
      } catch (error) {
        // Ignore date parsing errors
      }
    }
    
    // Pattern for "until X" or "through X"
    const endPattern = /(?:until|through|ending)\s+([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i;
    const endMatch = endPattern.exec(userInput);
    
    if (endMatch) {
      try {
        const dateStr = endMatch[1];
        const parsedDate = this.parseDate(dateStr);
        if (parsedDate) {
          result.endDate = parsedDate;
        }
      } catch (error) {
        // Ignore date parsing errors
      }
    }
    
    // Default start date if not specified (next business day)
    if (frequencyType !== 'one-time' && !result.startDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.startDate = tomorrow.toISOString().split('T')[0];
    }
    
    return result;
  }

  private parseDate(dateStr: string): string | null {
    try {
      // Simple date parsing - in production, use a proper date library
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return null;
  }

  private validateFrequency(frequency: FrequencyInfo): { isValid: boolean; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Business rules validation
    if (frequency.startDate && frequency.endDate) {
      const start = new Date(frequency.startDate);
      const end = new Date(frequency.endDate);
      
      if (start >= end) {
        issues.push('End date must be after start date.');
        suggestions.push('Please specify valid date range');
      }
    }
    
    // Frequency-specific validation
    if (frequency.type === 'daily' && frequency.endDate) {
      const start = new Date(frequency.startDate || new Date());
      const end = new Date(frequency.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 365) {
        issues.push('Daily deliveries for more than a year require special approval.');
        suggestions.push('Consider weekly or monthly frequency', 'Limit to 6 months initially');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions: suggestions.length > 0 ? suggestions : this.getFrequencySuggestions()
    };
  }

  private getFrequencySuggestions(): string[] {
    return [
      'Monthly delivery',
      'Weekly delivery', 
      'One-time delivery',
      'Quarterly delivery',
      'Daily delivery'
    ];
  }

  async execFallback(prepRes: FrequencyCaptureRequirements, error: Error): Promise<FrequencyCaptureResults> {
    console.error('❌ Frequency Capture Agent: Fallback activated:', error.message);
    
    return {
      frequency: { type: 'monthly' },
      needsClarification: true,
      clarificationMessage: "I had trouble processing the frequency. How often do you need this delivery?",
      suggestions: this.getFrequencySuggestions()
    };
  }
}