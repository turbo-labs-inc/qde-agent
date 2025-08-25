import { Flow } from './pocket-flow';
import { ConversationState, ConversationPhase, DealField } from './types/conversation';
import { ConversationManagerAgent } from '../agents/conversation-manager';
import { CustomerCaptureAgent } from '../agents/customer-capture';
import { ProductCaptureAgent } from '../agents/product-capture';
import { QuantityCaptureAgent } from '../agents/quantity-capture';
import { LocationCaptureAgent } from '../agents/location-capture';
import { FrequencyCaptureAgent } from '../agents/frequency-capture';
import { ConversationWaitNode } from './conversation-wait-node';

/**
 * Conversation Flow Orchestrator
 * 
 * This orchestrates the conversational deal creation process using the orchestrator pattern.
 * The ConversationManager decides "what do we need next" and routes to specialized capture agents.
 */
export class ConversationOrchestrator {
  private conversationManager: ConversationManagerAgent;
  private customerCapture: CustomerCaptureAgent;
  private productCapture: ProductCaptureAgent;
  private quantityCapture: QuantityCaptureAgent;
  private locationCapture: LocationCaptureAgent;
  private frequencyCapture: FrequencyCaptureAgent;
  private waitNode: ConversationWaitNode;
  private mainFlow: Flow<ConversationState>;
  private isFlowRunning: boolean = false;

  constructor() {
    // Initialize all agents
    this.conversationManager = new ConversationManagerAgent();
    this.customerCapture = new CustomerCaptureAgent();
    this.productCapture = new ProductCaptureAgent();
    this.quantityCapture = new QuantityCaptureAgent();
    this.locationCapture = new LocationCaptureAgent();
    this.frequencyCapture = new FrequencyCaptureAgent();
    this.waitNode = new ConversationWaitNode();
    
    this.setupConversationFlow();
  }

  private setupConversationFlow(): void {
    console.log('🔧 Setting up conversational flow with orchestrator pattern...');

    // The conversation manager is the central orchestrator
    // It decides what information is needed next and routes accordingly
    
    // Main conversation flow routing
    this.conversationManager
      .on('customer-capture', this.customerCapture)
      .on('product-capture', this.productCapture)
      .on('quantity-capture', this.quantityCapture)
      .on('location-capture', this.locationCapture)
      .on('frequency-capture', this.frequencyCapture)
      .on('continue-conversation', this.waitNode) // Stop and wait for next user input
      .on('complete', this.waitNode); // Also route complete to wait node

    // Capture agents always route back to conversation manager
    this.customerCapture.next(this.conversationManager);
    this.productCapture.next(this.conversationManager);
    this.quantityCapture.next(this.conversationManager);
    this.locationCapture.next(this.conversationManager);
    this.frequencyCapture.next(this.conversationManager);

    // Create the main flow starting with conversation manager
    this.mainFlow = new Flow(this.conversationManager);
    
    console.log('✅ Conversational flow configured with orchestrator pattern');
  }

  /**
   * Start a new conversation
   */
  async startConversation(initialInput?: string): Promise<ConversationState> {
    console.log('🎬 Starting new conversation...');
    
    const conversationState: ConversationState = this.createInitialConversationState(initialInput);
    
    console.log('👋 Conversation Orchestrator: Ready for conversational deal creation');
    console.log('💡 The system will intelligently gather deal information through natural conversation');
    
    return conversationState;
  }

  /**
   * Process a conversation turn
   */
  async processTurn(conversationState: ConversationState, userInput: string): Promise<ConversationState> {
    // Only log essential information to prevent flooding
    console.log(`\\n🔄 Turn ${conversationState.turnCount + 1}: "${userInput}"`);
    
    // Emergency break: prevent infinite loops
    if (conversationState.turnCount > 50) {
      console.log('🛑 Emergency break: Too many conversation turns, resetting...');
      conversationState.phase = 'error';
      conversationState.lastAgentResponse = 'I think we got stuck in a loop. Let\'s start fresh. What deal would you like to create?';
      return conversationState;
    }
    
    // Check for duplicate input (sign of feedback loop)
    const recentMessages = conversationState.conversationHistory.slice(-3);
    const duplicateCount = recentMessages.filter(msg => msg.content === userInput).length;
    if (duplicateCount > 1) {
      console.log('🛑 Duplicate input detected, preventing feedback loop');
      conversationState.lastAgentResponse = 'I think we\'re repeating ourselves. Let me ask you directly: Which company or customer is this deal for?';
      return conversationState;
    }
    
    // Update conversation state with user input
    conversationState.lastUserInput = userInput;
    conversationState.conversationHistory.push({
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
      topic: conversationState.currentTopic
    });

    try {
      // Prevent concurrent flow execution
      if (this.isFlowRunning) {
        console.log('🛑 Flow already running, skipping...');
        return conversationState;
      }
      
      this.isFlowRunning = true;
      
      // Run the conversation flow
      const result = await this.mainFlow.run(conversationState);
      
      console.log('✅ Conversation turn completed');
      // Note: Agent response is displayed by the interactive interface, not here
      
      // Display conversation status
      this.displayConversationStatus(conversationState);
      
      return conversationState;
      
    } catch (error) {
      console.error('❌ Conversation turn failed:', error);
      
      // Graceful error handling
      conversationState.phase = 'error';
      conversationState.lastAgentResponse = "I'm sorry, I encountered an issue. Could you please try again?";
      
      return conversationState;
    } finally {
      this.isFlowRunning = false;
    }
  }

  /**
   * Check if conversation is complete and ready for deal creation
   */
  isReadyForDealCreation(conversationState: ConversationState): boolean {
    return conversationState.missingFields.length === 0 && 
           conversationState.confirmationNeeded;
  }

  /**
   * Create initial conversation state
   */
  private createInitialConversationState(initialInput?: string): ConversationState {
    const conversationId = `conv_${Date.now()}`;
    
    const state: ConversationState = {
      // Deal Information
      dealInfo: {},
      
      // Conversation Management  
      conversationId,
      currentTopic: 'general',
      missingFields: this.getRequiredFields(),
      
      // User Interaction
      conversationHistory: [],
      lastUserInput: initialInput || '',
      lastAgentResponse: '',
      
      // Flow Control
      phase: 'greeting',
      confirmationNeeded: false,
      clarificationRequests: [],
      
      // Context & Memory
      userPreferences: {
        preferredUnits: 'gallons',
        communicationStyle: 'casual',
        confirmationLevel: 'standard'
      },
      referenceData: {
        companies: [],
        locations: [],
        products: [],
        frequencies: [],
        lastUpdated: new Date().toISOString()
      },
      
      // Validation & Status
      validationStatus: this.initializeValidationStatus(),
      readyForCreation: false,
      
      // Metadata
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      turnCount: 0
    };

    // If initial input provided, add it to history
    if (initialInput) {
      state.conversationHistory.push({
        id: `msg_${Date.now()}_initial`,
        role: 'user',
        content: initialInput,
        timestamp: new Date().toISOString(),
        topic: 'general'
      });
      state.phase = 'information_gathering';
    }

    return state;
  }

  private getRequiredFields(): DealField[] {
    return [
      'customer',
      'product', 
      'quantity',
      'origin_location',
      'destination_location',
      'frequency'
    ];
  }

  private initializeValidationStatus() {
    const status: any = {};
    const requiredFields = this.getRequiredFields();
    
    for (const field of requiredFields) {
      status[field] = {
        status: 'missing',
        confidence: 0,
        lastValidated: new Date().toISOString(),
        issues: []
      };
    }
    
    return status;
  }

  private displayConversationStatus(state: ConversationState): void {
    // Simplified status display to prevent console feedback loops
    const completionPercent = Math.round(
      ((this.getRequiredFields().length - state.missingFields.length) / this.getRequiredFields().length) * 100
    );
    
    console.log(`\\n📊 Status: ${completionPercent}% complete - ${state.missingFields.length} fields remaining`);
    
    if (state.readyForCreation) {
      console.log('🎯 Ready for deal creation!');
    }
  }

  /**
   * Handle deal confirmation phase
   */
  private async handleDealConfirmation(state: ConversationState): Promise<string> {
    console.log('✅ Conversation Orchestrator: Entering deal confirmation phase');
    
    // Generate deal summary
    const summary = this.generateDealSummary(state.dealInfo);
    state.lastAgentResponse = `Perfect! Let me confirm your deal details:\\n\\n${summary}\\n\\nShould I create this deal?`;
    state.phase = 'confirmation';
    state.currentTopic = 'confirmation';
    
    return 'awaiting-confirmation';
  }

  /**
   * Handle conversation completion
   */
  private async handleCompletion(state: ConversationState): Promise<string> {
    console.log('🏁 Conversation Orchestrator: Conversation completed');
    
    state.phase = 'complete';
    state.lastAgentResponse = 'Great! The conversation is complete and ready for deal creation.';
    
    return 'complete';
  }

  /**
   * Generate deal summary for confirmation
   */
  private generateDealSummary(dealInfo: any): string {
    const lines = [];
    
    if (dealInfo.customer?.name) {
      lines.push(`Customer: ${dealInfo.customer.name}`);
    }
    if (dealInfo.product?.name) {
      lines.push(`Product: ${dealInfo.product.name}`);
    }
    if (dealInfo.quantity?.amount) {
      lines.push(`Quantity: ${dealInfo.quantity.amount} ${dealInfo.quantity.unit}`);
    }
    if (dealInfo.locations?.origin?.name && dealInfo.locations?.destination?.name) {
      lines.push(`Route: ${dealInfo.locations.origin.name} → ${dealInfo.locations.destination.name}`);
    }
    if (dealInfo.frequency?.type) {
      lines.push(`Frequency: ${dealInfo.frequency.type}`);
    }
    
    return lines.join('\\n');
  }

  /**
   * Get conversation summary for debugging/monitoring
   */
  getConversationSummary(state: ConversationState): any {
    return {
      id: state.conversationId,
      phase: state.phase,
      turnCount: state.turnCount,
      progress: {
        totalFields: this.getRequiredFields().length,
        capturedFields: this.getRequiredFields().length - state.missingFields.length,
        missingFields: state.missingFields,
        completionPercent: Math.round(
          ((this.getRequiredFields().length - state.missingFields.length) / this.getRequiredFields().length) * 100
        )
      },
      dealInfo: state.dealInfo,
      readyForCreation: state.readyForCreation
    };
  }
}