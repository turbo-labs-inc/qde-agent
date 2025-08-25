import { Node } from '../../src/pocket-flow';
import { 
  ConversationState, 
  ConversationPhase, 
  ConversationTopic, 
  DealField,
  UserIntent,
  AgentResponse,
  ConversationMessage,
  DealData
} from '../../src/types/conversation';

interface ConversationRequirements {
  userInput: string;
  currentState: ConversationState;
  availableAgents: string[];
}

interface ConversationResults {
  response: AgentResponse;
  nextAgent?: string;
  updatedState: Partial<ConversationState>;
  shouldContinue: boolean;
}

export class ConversationManagerAgent extends Node<ConversationState> {
  private intentRecognizer: IntentRecognizer;
  private responseGenerator: ResponseGenerator;
  private flowManager: ConversationFlowManager;

  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
    this.intentRecognizer = new IntentRecognizer();
    this.responseGenerator = new ResponseGenerator();
    this.flowManager = new ConversationFlowManager();
  }

  async prep(shared: ConversationState): Promise<ConversationRequirements> {
    // Get the latest user input (not agent response)
    const lastUserMessage = shared.conversationHistory
      .filter(msg => msg.role === 'user')
      .pop();
    const userInput = lastUserMessage?.content || shared.lastUserInput || '';
    
    // console.log(`💬 Processing: "${userInput}"`);
    
    return {
      userInput,
      currentState: shared,
      availableAgents: ['customer-capture', 'product-capture', 'quantity-capture', 'location-capture', 'frequency-capture']
    };
  }

  async exec(prepRes: ConversationRequirements): Promise<ConversationResults> {
    
    const { userInput, currentState } = prepRes;
    
    try {
      // 1. Understand user intent
      console.log('  🔍 Analyzing user intent...');
      const intent = await this.intentRecognizer.analyze(userInput, currentState);
      console.log(`  💡 Detected intent: ${intent.type} about ${intent.topic} (confidence: ${intent.confidence})`);
      
      // 2. Determine conversation flow
      console.log('  🗺️  Determining next steps...');
      const flowDecision = this.flowManager.determineNextStep(currentState, intent);
      console.log(`  📍 Flow decision: ${flowDecision.nextTopic}, needs agent: ${flowDecision.nextAgent}`);
      
      // 3. Generate appropriate response
      console.log('  💭 Generating response...');
      const response = await this.responseGenerator.createResponse(
        currentState, 
        intent, 
        flowDecision
      );
      
      // 4. Update conversation state
      const updatedState = this.updateConversationState(
        currentState, 
        userInput, 
        intent, 
        response,
        flowDecision.nextAgent !== null
      );
      
      
      return {
        response,
        nextAgent: flowDecision.nextAgent,
        updatedState,
        shouldContinue: !this.isConversationComplete(updatedState)
      };
      
    } catch (error) {
      console.error('❌ Conversation Manager: Failed to process turn:', error);
      throw error;
    }
  }

  async post(
    shared: ConversationState,
    prepRes: ConversationRequirements,
    execRes: ConversationResults
  ): Promise<string> {
    // Update shared state with conversation results
    Object.assign(shared, execRes.updatedState);
    
    // Add conversation message to history
    const conversationMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'agent',
      content: execRes.response.message,
      timestamp: new Date().toISOString(),
      topic: execRes.response.nextTopic,
      capturedData: execRes.response.capturedData
    };
    
    shared.conversationHistory.push(conversationMessage);
    shared.lastAgentResponse = execRes.response.message;
    shared.turnCount += 1;
    shared.lastUpdated = new Date().toISOString();
    
    // console.log('💾 State updated');
    
    // Determine next action based on conversation state
    if (execRes.response.readyToConfirm) {
      return 'confirm-deal';
    } else if (execRes.nextAgent) {
      return execRes.nextAgent;
    } else if (execRes.shouldContinue) {
      return 'continue-conversation';
    } else {
      return 'complete';
    }
  }

  // Update conversation state with new information
  private updateConversationState(
    currentState: ConversationState,
    userInput: string,
    intent: UserIntent,
    response: AgentResponse,
    willCallAgent: boolean = false
  ): Partial<ConversationState> {
    const updates: Partial<ConversationState> = {
      lastUserInput: userInput,
      currentTopic: response.nextTopic,
      phase: this.determinePhase(currentState, intent, response),
    };

    // Only merge data if no agent will process it, or if we have agent response data
    if (!willCallAgent && intent.extractedData) {
      // Use raw intent data when no agent is processing
      updates.dealInfo = {
        ...currentState.dealInfo,
        ...intent.extractedData
      };
    } else if (response.capturedData) {
      // Use agent-processed data when available
      updates.dealInfo = {
        ...currentState.dealInfo,
        ...response.capturedData
      };
    }

    // Update missing fields based on what we now have
    updates.missingFields = this.calculateMissingFields(
      updates.dealInfo || currentState.dealInfo
    );

    // Update confirmation status
    updates.confirmationNeeded = response.readyToConfirm || false;
    updates.readyForCreation = updates.missingFields?.length === 0 && updates.confirmationNeeded;

    return updates;
  }

  private determinePhase(
    currentState: ConversationState,
    intent: UserIntent,
    response: AgentResponse
  ): ConversationPhase {
    if (response.readyToConfirm) return 'confirmation';
    if (response.needsClarification) return 'clarification';
    if (currentState.missingFields.length > 0) return 'information_gathering';
    return 'information_gathering';
  }

  private calculateMissingFields(dealInfo: Partial<DealData>): DealField[] {
    const requiredFields: DealField[] = [
      'customer', 'product', 'quantity', 
      'origin_location', 'destination_location', 'frequency'
    ];

    return requiredFields.filter(field => {
      switch (field) {
        case 'customer': return !dealInfo.customer?.name;
        case 'product': return !dealInfo.product?.name;
        case 'quantity': return !dealInfo.quantity?.amount;
        case 'origin_location': return !dealInfo.locations?.origin?.name;
        case 'destination_location': return !dealInfo.locations?.destination?.name;
        case 'frequency': return !dealInfo.frequency?.type;
        default: return true;
      }
    });
  }

  private isConversationComplete(updatedState: Partial<ConversationState>): boolean {
    return updatedState.phase === 'complete' || 
           updatedState.phase === 'creation' ||
           (updatedState.missingFields?.length === 0 && updatedState.confirmationNeeded);
  }

  async execFallback(prepRes: ConversationRequirements, error: Error): Promise<ConversationResults> {
    console.error('❌ Conversation Manager: Fallback mode activated:', error.message);
    
    return {
      response: {
        message: "I'm sorry, I encountered an issue processing your request. Could you please try rephrasing that?",
        nextTopic: 'general',
        needsClarification: true
      },
      shouldContinue: true,
      updatedState: {
        phase: 'error'
      }
    };
  }
}

// Supporting classes for conversation management
class IntentRecognizer {
  async analyze(userInput: string, currentState: ConversationState): Promise<UserIntent> {
    // Simplified intent recognition - in production, this would be more sophisticated
    const input = userInput.toLowerCase();
    
    // Detect intent type
    let intentType: UserIntent['type'] = 'provide_info';
    if (input.includes('yes') || input.includes('correct') || input.includes('confirm') || input.includes('right')) {
      intentType = 'confirm';
    } else if (input.includes('no') || input.includes('nope') || input.includes('wrong') || input.includes('change') || 
               input.includes('different') || input.includes('not') || input === 'n') {
      intentType = 'change_info';
    } else if (input.includes('?') || input.includes('what') || input.includes('how') || input.includes('where')) {
      intentType = 'ask_question';
    }

    // Detect topic - prioritize based on what we can actually extract
    let topic: ConversationTopic = currentState.currentTopic || 'general';
    let extractedData: Partial<DealData> = {};
    
    // Try extractions in priority order and use the first successful one
    const productData = this.extractDataFromInput(input, 'product');
    const customerData = this.extractDataFromInput(input, 'customer');
    const quantityData = this.extractDataFromInput(input, 'quantity');
    const frequencyData = this.extractDataFromInput(input, 'frequency');
    
    if (productData.product) {
      topic = 'product';
      extractedData = productData;
    } else if (customerData.customer) {
      topic = 'customer';
      extractedData = customerData;
    } else if (quantityData.quantity) {
      topic = 'quantity';
      extractedData = quantityData;
    } else if (frequencyData.frequency) {
      topic = 'frequency';
      extractedData = frequencyData;
    } else if (this.containsLocationTerms(input)) {
      // Smart location topic detection based on context
      const hasOrigin = currentState.dealInfo?.locations?.origin?.name;
      const hasDestination = currentState.dealInfo?.locations?.destination?.name;
      
      if (!hasOrigin) {
        topic = 'origin_location';
        extractedData = this.extractDataFromInput(input, 'origin_location');
      } else if (!hasDestination) {
        topic = 'destination_location';
        extractedData = this.extractDataFromInput(input, 'destination_location');
      } else {
        // Both locations already set - could be a correction
        topic = 'origin_location'; // Default to origin for corrections
        extractedData = this.extractDataFromInput(input, 'origin_location');
      }
    }

    return {
      type: intentType,
      topic,
      confidence: 0.8, // Simplified confidence
      extractedData
    };
  }

  private containsCompanyTerms(input: string): boolean {
    const companyTerms = ['company', 'customer', 'client', 'trading', 'corp', 'inc', 'llc'];
    return companyTerms.some(term => input.includes(term));
  }

  private containsProductTerms(input: string): boolean {
    const productTerms = ['propane', 'gasoline', 'diesel', 'fuel', 'gas'];
    return productTerms.some(term => input.includes(term));
  }

  private containsQuantityTerms(input: string): boolean {
    return /\d+.*gallons?/.test(input) || /\d+.*barrels?/.test(input);
  }

  private containsLocationTerms(input: string): boolean {
    const locationTerms = ['from', 'to', 'terminal', 'depot', 'hub', 'houston', 'dallas'];
    return locationTerms.some(term => input.includes(term));
  }

  private containsFrequencyTerms(input: string): boolean {
    const frequencyTerms = ['daily', 'weekly', 'monthly', 'quarterly', 'once'];
    return frequencyTerms.some(term => input.includes(term));
  }

  private extractDataFromInput(input: string, topic: ConversationTopic): Partial<DealData> {
    const data: Partial<DealData> = {};

    switch (topic) {
      case 'customer':
        // Handle vague references like "Houston company" differently
        if (input.match(/\b(houston|dallas|austin|texas)\s+company\b/i)) {
          // Don't extract vague geographic references as company names
          break;
        }
        
        // Extract company names - look for patterns like "customer is X" or just "X LLC"
        let customerMatch = input.match(/(?:customer is|company is|client is)\s+([a-zA-Z][a-zA-Z\s&.,\-']*(?:llc|inc|corp|ltd|co|company|solutions|energy|trading|group))/i);
        
        if (!customerMatch) {
          // Look for "pick/choose/select X Company" patterns
          customerMatch = input.match(/(?:pick|choose|select|use|go with)\s+([a-zA-Z][a-zA-Z\s&.,\-']*(?:llc|inc|corp|ltd|co|company|solutions|energy|trading|group))/i);
        }
        
        if (!customerMatch) {
          // Try to match direct company names with suffixes anywhere in the input
          customerMatch = input.match(/([a-zA-Z][a-zA-Z\s&.,\-']*(?:llc|inc|corp|ltd|co|company|solutions|energy|trading|group))/i);
        }
        
        if (customerMatch) {
          // Capitalize properly: "energy solutions llc" -> "Energy Solutions LLC"  
          const companyName = customerMatch[1].trim()
            .split(' ')
            .map(word => {
              const lower = word.toLowerCase();
              if (lower === 'llc' || lower === 'inc' || lower === 'corp' || lower === 'ltd') {
                return word.toUpperCase();
              }
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
          
          data.customer = { 
            name: companyName, 
            confidence: 0.8 
          };
        }
        break;

      case 'product':
        if (input.includes('propane')) data.product = { name: 'Propane', category: 'propane' };
        else if (input.includes('gasoline')) data.product = { name: 'Gasoline', category: 'gasoline' };
        else if (input.includes('diesel')) data.product = { name: 'Diesel', category: 'diesel' };
        break;

      case 'quantity':
        const quantityMatch = input.match(/(\d+(?:,\d{3})*)\s*(gallons?|barrels?)/i);
        if (quantityMatch) {
          data.quantity = {
            amount: parseInt(quantityMatch[1].replace(/,/g, '')),
            unit: quantityMatch[2].toLowerCase().includes('gallon') ? 'gallons' : 'barrels'
          };
        }
        break;

      case 'frequency':
        if (input.includes('daily')) data.frequency = { type: 'daily' };
        else if (input.includes('weekly')) data.frequency = { type: 'weekly' };
        else if (input.includes('monthly')) data.frequency = { type: 'monthly' };
        else if (input.includes('quarterly')) data.frequency = { type: 'quarterly' };
        break;

      case 'origin_location':
      case 'destination_location':
        // Skip extraction - let the location capture agent handle everything
        break;
    }

    return data;
  }

  private isLikelyLocation(text: string): boolean {
    const knownCities = [
      'Houston', 'Dallas', 'Austin', 'San Antonio', 'Oklahoma City', 'Tulsa',
      'Terminal', 'Hub', 'Depot', 'Facility', 'Center', 'Distribution'
    ];
    
    return knownCities.some(city => 
      text.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(text.toLowerCase())
    );
  }
}

class ResponseGenerator {
  async createResponse(
    state: ConversationState,
    intent: UserIntent,
    flowDecision: any
  ): Promise<AgentResponse> {
    // Check if there are any clarification requests that need to be addressed
    const pendingClarifications = state.clarificationRequests || [];
    const highPriorityClarification = pendingClarifications.find(req => req.priority === 'high');
    
    if (highPriorityClarification) {
      // Use the clarification request from the capture agent
      const suggestions = highPriorityClarification.suggestions || [];
      let message = highPriorityClarification.question;
      
      if (suggestions.length > 0) {
        message += '\n';
        suggestions.slice(0, 5).forEach((suggestion, index) => {
          message += `\n• ${suggestion}`;
        });
      }
      
      return {
        message,
        nextTopic: highPriorityClarification.field as ConversationTopic,
        needsClarification: true,
        readyToConfirm: false,
        capturedData: intent.extractedData
      };
    }
    
    // Generate contextual responses based on intent and flow
    let message = '';
    let nextTopic = flowDecision.nextTopic;
    let needsClarification = false;
    let readyToConfirm = false;

    if (intent.type === 'provide_info' && intent.extractedData) {
      // Acknowledge the provided information
      message = this.generateAcknowledgment(intent.topic, intent.extractedData);
      
      // Ask for next needed information
      const nextField = state.missingFields[0];
      if (nextField) {
        message += ' ' + this.generateNextQuestion(nextField, state);
        nextTopic = nextField as ConversationTopic;
      } else {
        message += ' Let me confirm all the details...';
        readyToConfirm = true;
        nextTopic = 'confirmation';
      }
    } else if (intent.type === 'ask_question') {
      message = this.generateHelpResponse(intent.topic, state);
      needsClarification = true;
    } else {
      message = this.generateGenericResponse(state);
    }

    return {
      message,
      nextTopic,
      needsClarification,
      readyToConfirm,
      capturedData: intent.extractedData
    };
  }

  private generateAcknowledgment(topic: ConversationTopic, data: Partial<DealData>): string {
    switch (topic) {
      case 'customer':
        if (data.customer?.name) {
          return `Great! I've got ${data.customer.name} as the customer.`;
        } else {
          return `I understand you want to set up a deal, but I need a specific company name.`;
        }
      case 'product':
        if (data.product?.name) {
          return `Perfect! ${data.product.name} it is.`;
        } else {
          return `I see you mentioned fuel, but I need to know the specific type.`;
        }
      case 'quantity':
        if (data.quantity?.amount) {
          return `Got it - ${data.quantity.amount} ${data.quantity.unit}.`;
        } else {
          return `I understand you need a specific amount.`;
        }
      case 'frequency':
        if (data.frequency?.type) {
          return `Understood - ${data.frequency.type} delivery.`;
        } else {
          return `Got it, I need to know how often you need delivery.`;
        }
      default:
        return 'Thanks for that information.';
    }
  }

  private generateNextQuestion(field: DealField, state: ConversationState): string {
    switch (field) {
      case 'customer':
        return 'Which company or customer is this deal for?';
      case 'product':
        return 'What type of fuel do you need? I can handle propane, gasoline, or diesel.';
      case 'quantity':
        return 'How many gallons are we talking about?';
      case 'origin_location':
        return 'Where would you like us to pick up the fuel from?';
      case 'destination_location':
        return 'And where should we deliver it to?';
      case 'frequency':
        return 'How often do you need delivery? Daily, weekly, monthly, or just a one-time deal?';
      default:
        return 'What else can you tell me about this deal?';
    }
  }

  private generateHelpResponse(topic: ConversationTopic, state: ConversationState): string {
    if (state.missingFields.length > 0) {
      // Focus on the next field needed
      const nextField = state.missingFields[0];
      return `Sure thing! Let's start with the ${this.formatFieldNames([nextField])[0]}. ${this.generateNextQuestion(nextField, state)}`;
    }
    return `I have all the information I need! Ready to create your fuel deal?`;
  }

  private generateGenericResponse(state: ConversationState): string {
    if (state.missingFields.length > 0) {
      // Ask for just the NEXT field, not all fields
      const nextField = state.missingFields[0];
      return this.generateNextQuestion(nextField, state);
    }
    return 'What can I help you with for your fuel deal?';
  }
  
  private formatFieldNames(fields: DealField[]): string[] {
    const fieldMap: Record<DealField, string> = {
      'customer': 'customer name',
      'product': 'fuel type',
      'quantity': 'gallons needed',
      'origin_location': 'pickup location',
      'destination_location': 'delivery location',
      'frequency': 'delivery schedule'
    };
    
    return fields.map(field => fieldMap[field] || field);
  }
}

class ConversationFlowManager {
  determineNextStep(state: ConversationState, intent: UserIntent): any {
    let nextAgent = null;
    let nextTopic = intent.topic;

    // Special handling for confirmations
    if (intent.type === 'confirm') {
      // If there's a pending clarification request, handle the confirmation
      if (state.clarificationRequests && state.clarificationRequests.length > 0) {
        const pendingRequest = state.clarificationRequests[state.clarificationRequests.length - 1];
        
        // User is confirming a location suggestion
        if (pendingRequest.field === 'origin_location' || pendingRequest.field === 'destination_location') {
          nextAgent = 'location-capture';
          nextTopic = pendingRequest.field;
          return { nextAgent, nextTopic, shouldRoute: true, isConfirmation: true };
        }
      }
    }
    
    // Special handling for location corrections (when user provides a different location)
    if (intent.type === 'provide_info' && (intent.topic === 'origin_location' || intent.topic === 'destination_location')) {
      // If there's a pending location clarification, route to location-capture for correction
      const hasPendingLocationClarification = state.clarificationRequests?.some(req => 
        req.field === 'origin_location' || req.field === 'destination_location'
      );
      
      if (hasPendingLocationClarification) {
        nextAgent = 'location-capture';
        nextTopic = intent.topic;
        return { nextAgent, nextTopic, shouldRoute: true, isCorrection: true };
      }
    }

    // Regular flow: If user provides info about a missing field, route to its agent
    if (intent.type === 'provide_info') {
      // Customer - route if missing OR if there's a pending clarification
      const needsCustomer = state.missingFields.includes('customer') || 
                           state.clarificationRequests?.some(req => req.field === 'customer');
      if (intent.topic === 'customer' && needsCustomer) {
        // Route to agent if we have extracted data OR user mentions a company name
        if (intent.extractedData?.customer || state.lastUserInput.match(/[A-Z][a-zA-Z\s&.,\-']*(Trading|Energy|Corp|LLC|Inc|Company|Solutions|Group|Partners)/i)) {
          nextAgent = 'customer-capture';
        }
      }
      // Product
      else if (intent.topic === 'product' && state.missingFields.includes('product')) {
        nextAgent = 'product-capture';
      }
      // Quantity
      else if (intent.topic === 'quantity' && state.missingFields.includes('quantity')) {
        nextAgent = 'quantity-capture';
      }
      // Locations - route if either origin or destination is missing (and no pending clarifications)
      else if ((intent.topic === 'origin_location' || intent.topic === 'destination_location')) {
        const needsLocations = state.missingFields.includes('origin_location') || 
                              state.missingFields.includes('destination_location');
        const noPendingClarifications = !state.clarificationRequests?.some(req => 
          req.field === 'origin_location' || req.field === 'destination_location'
        );
        
        if (needsLocations && noPendingClarifications) {
          nextAgent = 'location-capture';
        }
      }
      // Frequency
      else if (intent.topic === 'frequency' && state.missingFields.includes('frequency')) {
        nextAgent = 'frequency-capture';
      }
    }

    return {
      nextAgent,
      nextTopic,
      shouldRoute: nextAgent !== null
    };
  }
}