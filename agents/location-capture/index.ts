import { Node } from '../../src/pocket-flow';
import { ConversationState, LocationInfo, LocationDetails } from '../../src/types/conversation';

interface LocationCaptureRequirements {
  userInput: string;
  currentLocations?: LocationInfo;
  availableLocations: any[];
  targetType: 'origin' | 'destination' | 'both';
}

interface LocationCaptureResults {
  locations: LocationInfo;
  needsClarification: boolean;
  clarificationMessage?: string;
  suggestions?: string[];
}

export class LocationCaptureAgent extends Node<ConversationState> {
  private readonly commonLocations = [
    { name: 'Houston Terminal', city: 'Houston', state: 'TX', type: 'terminal' },
    { name: 'Dallas Hub', city: 'Dallas', state: 'TX', type: 'hub' },
    { name: 'San Antonio Depot', city: 'San Antonio', state: 'TX', type: 'depot' },
    { name: 'Austin Facility', city: 'Austin', state: 'TX', type: 'facility' },
    { name: 'Oklahoma City Terminal', city: 'Oklahoma City', state: 'OK', type: 'terminal' },
    { name: 'Tulsa Distribution Center', city: 'Tulsa', state: 'OK', type: 'terminal' }
  ];

  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: ConversationState): Promise<LocationCaptureRequirements> {
    console.log('📍 Location Capture Agent: Analyzing location information...');
    
    const userInput = shared.lastUserInput;
    const currentLocations = shared.dealInfo.locations;
    const availableLocations = [...(shared.referenceData?.locations || []), ...this.commonLocations];
    
    // Check if this is a confirmation of a previous suggestion
    const isConfirmation = this.isConfirmationResponse(userInput);
    const hasPendingClarification = shared.clarificationRequests?.some(req => 
      req.field === 'origin_location' || req.field === 'destination_location'
    );
    
    // Determine what type of location we need
    let targetType: 'origin' | 'destination' | 'both';
    
    if (isConfirmation && hasPendingClarification) {
      // User is confirming a previous suggestion - don't change anything
      targetType = currentLocations?.origin ? 'destination' : 'origin';
    } else {
      targetType = this.determineLocationTarget(userInput, currentLocations);
    }
    
    console.log(`  👤 User input: "${userInput}"`);
    console.log(`  📍 Current locations: Origin: ${currentLocations?.origin?.name || 'none'}, Destination: ${currentLocations?.destination?.name || 'none'}`);
    console.log(`  🎯 Target type: ${targetType}`);
    console.log(`  ✅ Is confirmation: ${isConfirmation}`);
    console.log(`  ❓ Has pending clarification: ${hasPendingClarification}`);
    console.log(`  📊 Available locations: ${availableLocations.length}`);
    
    return {
      userInput,
      currentLocations,
      availableLocations,
      targetType
    };
  }

  async exec(prepRes: LocationCaptureRequirements): Promise<LocationCaptureResults> {
    console.log('🔍 Location Capture Agent: Processing location information...');
    
    try {
      // Check if user is confirming a previous suggestion
      const isConfirmation = this.isConfirmationResponse(prepRes.userInput);
      
      if (isConfirmation) {
        console.log('  ✅ User confirmed previous suggestion');
        // Accept the current locations as-is and mark as complete
        return {
          locations: prepRes.currentLocations || {},
          needsClarification: false
        };
      }
      
      const extractedLocations = this.extractLocations(prepRes.userInput);
      console.log(`  📝 Extracted locations: ${JSON.stringify(extractedLocations)}`);
      
      const currentLocations = prepRes.currentLocations || {};
      let updatedLocations = { ...currentLocations };
      let needsClarification = false;
      let clarificationMessage = '';
      let suggestions: string[] = [];

      // Process based on target type
      if (prepRes.targetType === 'both' && extractedLocations.origin && extractedLocations.destination) {
        // Both locations provided
        const originMatch = this.findBestLocationMatch(extractedLocations.origin, prepRes.availableLocations);
        const destMatch = this.findBestLocationMatch(extractedLocations.destination, prepRes.availableLocations);
        
        
        updatedLocations.origin = originMatch;
        updatedLocations.destination = destMatch;
        
        // Lower threshold for common cities to avoid unnecessary clarification
        if (originMatch.confidence < 0.5 || destMatch.confidence < 0.5) {
          needsClarification = true;
          clarificationMessage = this.generateLocationClarification(originMatch, destMatch);
          suggestions = this.getLocationSuggestions(prepRes.availableLocations);
        }
        
      } else if (prepRes.targetType === 'origin' || (!currentLocations.origin && extractedLocations.origin)) {
        // Processing origin location
        const searchTerm = extractedLocations.origin || extractedLocations.destination;
        console.log(`  🔍 Searching for origin location: "${searchTerm}"`);
        
        const originMatch = this.findBestLocationMatch(searchTerm, prepRes.availableLocations);
        console.log(`  📍 Best match found: "${originMatch.name}" (confidence: ${originMatch.confidence})`);
        
        updatedLocations.origin = originMatch;
        
        // Always ask for confirmation if confidence is not perfect
        if (originMatch.confidence < 1.0) {
          needsClarification = true;
          clarificationMessage = `I found "${originMatch.name}" as a potential origin location. Is this correct, or did you mean a different location?`;
          suggestions = this.getSimilarLocations(searchTerm, prepRes.availableLocations);
        }
        
      } else if (prepRes.targetType === 'destination' || (!currentLocations.destination && extractedLocations.destination)) {
        // Processing destination location
        const destMatch = this.findBestLocationMatch(extractedLocations.destination || extractedLocations.origin, prepRes.availableLocations);
        updatedLocations.destination = destMatch;
        
        if (destMatch.confidence < 0.7) {
          needsClarification = true;
          clarificationMessage = `I found "${destMatch.name}" as a potential destination. Is this correct?`;
          suggestions = this.getSimilarLocations(extractedLocations.destination || '', prepRes.availableLocations);
        }
        
      } else {
        // No locations extracted, ask for what's needed
        needsClarification = true;
        if (!currentLocations.origin) {
          clarificationMessage = 'Where should we pick up the fuel from?';
        } else if (!currentLocations.destination) {
          clarificationMessage = 'Where should we deliver the fuel to?';
        }
        suggestions = this.getPopularLocations(prepRes.availableLocations);
      }

      // Validate route if both locations are set
      if (updatedLocations.origin && updatedLocations.destination) {
        const routeValidation = this.validateRoute(updatedLocations.origin, updatedLocations.destination);
        if (!routeValidation.isValid) {
          needsClarification = true;
          clarificationMessage = routeValidation.message;
          suggestions = routeValidation.suggestions;
        } else {
          updatedLocations.route = `${updatedLocations.origin.name} → ${updatedLocations.destination.name}`;
        }
      }

      console.log('✅ Location Capture Agent: Location processing completed');
      
      return {
        locations: updatedLocations,
        needsClarification,
        clarificationMessage,
        suggestions
      };
      
    } catch (error) {
      console.error('❌ Location Capture Agent: Processing failed:', error);
      throw error;
    }
  }

  async post(
    shared: ConversationState,
    prepRes: LocationCaptureRequirements,
    execRes: LocationCaptureResults
  ): Promise<string> {
    // Update shared state with location information
    if (!shared.dealInfo) {
      shared.dealInfo = {};
    }
    shared.dealInfo.locations = execRes.locations;
    
    console.log('💾 Location Capture Agent: Updated location information');
    
    if (execRes.needsClarification) {
      console.log('❓ Location Capture Agent: Needs clarification');
      
      // Set the current topic to the field that needs clarification
      if (!execRes.locations.origin) {
        shared.currentTopic = 'origin_location';
      } else if (!execRes.locations.destination) {
        shared.currentTopic = 'destination_location';
      } else {
        // Both locations set but need clarification - likely validation issue
        shared.currentTopic = 'origin_location';
      }
      
      shared.confirmationNeeded = false;
      
      // Add clarification request with suggestions
      if (execRes.clarificationMessage) {
        shared.clarificationRequests = shared.clarificationRequests || [];
        shared.clarificationRequests.push({
          field: shared.currentTopic,
          question: execRes.clarificationMessage,
          suggestions: execRes.suggestions || [],
          reason: 'Location selection needed',
          priority: 'high'
        });
      }
      
      // Store the agent response for the user
      shared.lastAgentResponse = execRes.clarificationMessage + 
        (execRes.suggestions && execRes.suggestions.length > 0 
          ? '\n\n• ' + execRes.suggestions.join('\n• ') 
          : '');
      
      // Return empty to route back to conversation manager via .next() 
      return '';
      
    } else {
      console.log('✅ Location Capture Agent: Locations confirmed');
      
      // Remove completed location fields from missing fields
      const beforeFields = shared.missingFields.length;
      shared.missingFields = shared.missingFields.filter(field => 
        field !== 'origin_location' && field !== 'destination_location'
      );
      console.log(`  📊 Removed ${beforeFields - shared.missingFields.length} location fields from missing fields`);
      
      // Clear any location-related clarification requests
      const beforeClarifications = shared.clarificationRequests?.length || 0;
      shared.clarificationRequests = shared.clarificationRequests?.filter(req => 
        req.field !== 'origin_location' && req.field !== 'destination_location'
      ) || [];
      console.log(`  🧹 Cleared ${beforeClarifications - shared.clarificationRequests.length} location clarification requests`);
      
      // Set a success message for the user and check if deal is ready
      if (execRes.locations.origin && execRes.locations.destination) {
        shared.lastAgentResponse = `Perfect! I've got the route: ${execRes.locations.origin.name} → ${execRes.locations.destination.name}. What delivery frequency would you like?`;
      } else if (execRes.locations.origin) {
        shared.lastAgentResponse = `Great! Origin location set as ${execRes.locations.origin.name}. Where should we deliver the fuel to?`;
      } else if (execRes.locations.destination) {
        shared.lastAgentResponse = `Perfect! Destination set as ${execRes.locations.destination.name}. Where should we pick up the fuel from?`;
      }
      
      // Check if we have all required fields and set confirmation needed
      if (shared.missingFields.length === 0) {
        console.log('🎯 All fields complete! Setting confirmation needed...');
        shared.confirmationNeeded = true;
      }
      
      // Return empty to route back to conversation manager via .next()
      return '';
    }
  }

  private determineLocationTarget(userInput: string, currentLocations?: LocationInfo): 'origin' | 'destination' | 'both' {
    const input = userInput.toLowerCase();
    
    // Check for "from X to Y" pattern
    if (input.includes('from') && input.includes('to')) {
      return 'both';
    }
    
    // Check current state
    if (!currentLocations?.origin) {
      return 'origin';
    } else if (!currentLocations?.destination) {
      return 'destination';
    }
    
    return 'both';
  }

  private extractLocations(userInput: string): { origin?: string; destination?: string } {
    const locations: { origin?: string; destination?: string } = {};
    
    // Early return for generic requests that aren't about locations
    if (this.isGenericRequest(userInput)) {
      return locations;
    }
    
    // Pattern 1: "from X to Y" - Fixed to correctly extract origin and destination
    const fromToPattern = /from\s+(\w+(?:\s+\w+)*?)\s+to\s+(\w+(?:\s+\w+)*)/i;
    const fromToMatch = fromToPattern.exec(userInput);
    
    if (fromToMatch) {
      locations.origin = fromToMatch[1].trim();
      locations.destination = fromToMatch[2].trim();
      return locations;
    }
    
    // Pattern 2: "to X" (destination only)
    const toPattern = /to\s+([A-Za-z\s]+?)(?:\s*,|$)/i;
    const toMatch = toPattern.exec(userInput);
    
    if (toMatch && this.isLikelyLocation(toMatch[1].trim())) {
      locations.destination = toMatch[1].trim();
    }
    
    // Pattern 3: "from X" (origin only)
    const fromPattern = /from\s+([A-Za-z\s]+?)(?:\s*,|$)/i;
    const fromMatch = fromPattern.exec(userInput);
    
    if (fromMatch && this.isLikelyLocation(fromMatch[1].trim())) {
      locations.origin = fromMatch[1].trim();
    }
    
    // Pattern 4: City names (try to extract any city-like words) - ONLY if input seems location-focused
    if (!locations.origin && !locations.destination && this.inputMentionsLocation(userInput)) {
      const cityPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
      const cities: string[] = [];
      let match;
      
      while ((match = cityPattern.exec(userInput)) !== null) {
        const city = match[1];
        if (this.isLikelyLocation(city)) {
          cities.push(city);
        }
      }
      
      if (cities.length === 1) {
        locations.origin = cities[0]; // Assume single location is origin
      } else if (cities.length >= 2) {
        locations.origin = cities[0];
        locations.destination = cities[1];
      }
    }
    
    return locations;
  }

  private isConfirmationResponse(userInput: string): boolean {
    const confirmationPhrases = [
      'yes', 'correct', 'right', 'that is correct', 'that\'s correct',
      'that\'s right', 'that is right', 'confirm', 'confirmed', 'y'
    ];
    
    const input = userInput.toLowerCase().trim();
    return confirmationPhrases.some(phrase => input.includes(phrase));
  }

  private isGenericRequest(userInput: string): boolean {
    const genericPhrases = [
      'make a deal', 'create a deal', 'need fuel', 'want fuel',
      'help', 'hello', 'hi', 'start', 'begin', 'setup'
    ];
    
    const input = userInput.toLowerCase().trim();
    return genericPhrases.some(phrase => input.includes(phrase));
  }

  private inputMentionsLocation(userInput: string): boolean {
    const locationKeywords = [
      'terminal', 'hub', 'depot', 'facility', 'center', 'distribution',
      'pickup', 'delivery', 'location', 'where', 'place'
    ];
    
    const input = userInput.toLowerCase();
    return locationKeywords.some(keyword => input.includes(keyword));
  }

  private isLikelyLocation(text: string): boolean {
    if (!text || text.trim().length < 2) return false;
    
    const knownCities = [
      'Houston', 'Dallas', 'Austin', 'San Antonio', 'Oklahoma City', 'Tulsa',
      'Terminal', 'Hub', 'Depot', 'Facility', 'Center', 'Distribution'
    ];
    
    const input = text.toLowerCase().trim();
    
    // Exact matches or city names that start with the input
    return knownCities.some(city => {
      const cityLower = city.toLowerCase();
      return input === cityLower || 
             cityLower.startsWith(input) ||
             input.includes(cityLower);
    });
  }

  private findBestLocationMatch(locationName: string, availableLocations: any[]): LocationDetails {
    if (!locationName) {
      return { name: '', confidence: 0 };
    }
    
    let bestMatch: LocationDetails = {
      name: locationName,
      confidence: 0
    };
    
    const input = locationName.toLowerCase();
    
    // Check available locations
    for (const location of availableLocations) {
      const locName = location.name || location.text || '';
      const confidence = this.calculateLocationSimilarity(input, locName.toLowerCase());
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          name: locName,
          id: location.id || location.value,
          type: location.type,
          city: location.city,
          state: location.state,
          confidence
        };
      }
    }
    
    return bestMatch;
  }

  private calculateLocationSimilarity(input: string, locationName: string): number {
    // Exact match
    if (input === locationName) return 1.0;
    
    const inputWords = input.split(/\s+/);
    const locationWords = locationName.split(/\s+/);
    
    // City name matching: "Austin Hub" -> "Austin Facility" 
    // If first word matches (city), give high confidence regardless of second word
    if (inputWords.length >= 1 && locationWords.length >= 1 && 
        inputWords[0].toLowerCase() === locationWords[0].toLowerCase()) {
      return 0.95;
    }
    
    // Contains match
    if (input.includes(locationName) || locationName.includes(input)) return 0.9;
    
    // Word overlap
    const commonWords = inputWords.filter(word => 
      locationWords.some(locWord => locWord.toLowerCase() === word.toLowerCase())
    );
    
    if (commonWords.length > 0) {
      return (commonWords.length / Math.max(inputWords.length, locationWords.length)) * 0.8;
    }
    
    return 0;
  }

  private validateRoute(origin: LocationDetails, destination: LocationDetails): { isValid: boolean; message: string; suggestions: string[] } {
    // Same location check
    if (origin.name === destination.name) {
      return {
        isValid: false,
        message: 'Origin and destination cannot be the same location. Please choose different locations.',
        suggestions: ['Houston Terminal → Dallas Hub', 'Dallas Hub → Oklahoma City Terminal', 'Austin Facility → San Antonio Depot']
      };
    }
    
    // Valid route
    return {
      isValid: true,
      message: '',
      suggestions: []
    };
  }

  private generateLocationClarification(origin: LocationDetails, destination: LocationDetails): string {
    if (origin.confidence < 0.7 && destination.confidence < 0.7) {
      return `I found "${origin.name}" and "${destination.name}" as potential locations. Are these correct?`;
    } else if (origin.confidence < 0.7) {
      return `I found "${origin.name}" as the origin location. Is this correct?`;
    } else {
      return `I found "${destination.name}" as the destination. Is this correct?`;
    }
  }

  private getSimilarLocations(locationName: string, availableLocations: any[]): string[] {
    const input = locationName.toLowerCase();
    
    return availableLocations
      .map(loc => ({
        name: loc.name || loc.text,
        similarity: this.calculateLocationSimilarity(input, (loc.name || loc.text || '').toLowerCase())
      }))
      .filter(item => item.similarity > 0.3 && item.similarity < 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(item => item.name);
  }

  private getLocationSuggestions(availableLocations: any[]): string[] {
    return this.getPopularLocations(availableLocations);
  }

  private getPopularLocations(availableLocations: any[]): string[] {
    // Return common/popular locations
    return this.commonLocations.slice(0, 4).map(loc => loc.name);
  }

  async execFallback(prepRes: LocationCaptureRequirements, error: Error): Promise<LocationCaptureResults> {
    console.error('❌ Location Capture Agent: Fallback activated:', error.message);
    
    return {
      locations: prepRes.currentLocations || {},
      needsClarification: true,
      clarificationMessage: "I had trouble processing the location information. Where should we pick up and deliver the fuel?",
      suggestions: this.getPopularLocations(prepRes.availableLocations)
    };
  }
}