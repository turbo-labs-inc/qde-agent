#!/usr/bin/env npx tsx

import * as readline from 'readline';
import { ConversationOrchestrator } from './src/conversation-orchestrator';
import { ConversationState } from './src/types/conversation';
import { DealState } from './src/types';

// Import existing infrastructure for final deal creation
import { setupEnhancedInfrastructure } from './src/setup-enhanced-infrastructure';
import { globalWorkflowOrchestrator } from './src/infrastructure/workflow-orchestrator';

/**
 * Paste-Safe Conversational Interactive Test Interface
 * 
 * This version properly handles copy-paste operations without going "crazy"
 */

class PasteSafeConversationalInterface {
  private orchestrator: ConversationOrchestrator;
  private rl: readline.Interface;
  private currentConversation: ConversationState | null = null;
  private isProcessing: boolean = false;
  private lastProcessedInput: string = '';
  private sameInputCount: number = 0;
  private lastInputTime: number = 0;
  private rapidInputCount: number = 0;
  private inputDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.orchestrator = new ConversationOrchestrator();
    
    // Create readline interface with standard configuration
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '💬 You: '
    });
  }

  async start(): Promise<void> {
    console.log('\n🎬 QDE Conversational Agent System - Paste-Safe Version');
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 Build fuel deals through natural conversation!');
    console.log('📋 Standard input: Press Enter to send your message');
    console.log('💭 Type "help", "examples", or "quit" for options.\n');

    // Initialize infrastructure for final deal creation
    console.log('🚀 Setting up infrastructure...');
    await setupEnhancedInfrastructure();
    console.log('✅ Infrastructure ready!');

    this.displayWelcomeMessage();
    this.startConversationLoop();
  }

  private displayWelcomeMessage(): void {
    console.log('🤖 Agent: Let\'s make a deal! 🤝');
    console.log('         \n📋 To create your fuel deal, I\'ll need these 6 key details:');
    console.log('         🏢 Customer/Company');
    console.log('         ⛽ Product (gasoline, diesel, propane, etc.)');
    console.log('         📊 Quantity (gallons)');
    console.log('         📍 Origin Location (pickup point)');
    console.log('         📍 Destination Location (delivery point)');
    console.log('         📅 Frequency (weekly, monthly, quarterly, etc.)');
    console.log('         \n🏢 Let\'s start with the Customer/Company!');
    console.log('         \n💡 You can type naturally like:');
    console.log('         • "Houston Energy Trading"');
    console.log('         • "ABC Trading Company"');
    console.log('         • "XYZ Energy Solutions"');
    console.log('         \n📋 Just type the company name and press Enter!\n');
  }

  private startConversationLoop(): void {
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      await this.handleInput(input);
    });

    this.rl.on('close', () => {
      this.shutdown();
    });

    // Better Ctrl+C handling
    process.on('SIGINT', () => {
      if (this.isProcessing) {
        console.log('\n⏳ Processing... Press Ctrl+C again to force quit');
        setTimeout(() => {
          if (this.isProcessing) {
            console.log('\n🛑 Force quitting...');
            process.exit(0);
          }
        }, 3000);
      } else {
        this.shutdown();
      }
    });
  }

  private async handleInput(input: string): Promise<void> {
    // Skip if already processing
    if (this.isProcessing) {
      console.log('⏳ Still processing, please wait...');
      this.rl.prompt();
      return;
    }

    // Clean and validate input
    const cleanInput = this.cleanInput(input);
    
    if (!cleanInput) {
      this.rl.prompt();
      return;
    }

    // Emergency break: prevent processing console output as input
    if (cleanInput.includes('💬') || 
        cleanInput.includes('🤖') || 
        cleanInput.includes('✅') ||
        cleanInput.includes('🔍') ||
        cleanInput.includes('🏢') ||
        cleanInput.includes('⛽') ||
        cleanInput.includes('📊') ||
        cleanInput.includes('📍') ||
        cleanInput.includes('📅') ||
        cleanInput.includes('💾') ||
        cleanInput.includes('Processing:') ||
        cleanInput.includes('Agent:') ||
        cleanInput.includes('Analyzing') ||
        cleanInput.includes('Updated') ||
        cleanInput.includes('Extracted') ||
        cleanInput.includes('Turn ') ||
        cleanInput.includes('Status:')) {
      console.log('🛑 Ignoring console output as input');
      this.rl.prompt();
      return;
    }

    // Additional protection: reject overly long inputs (likely console spam)
    if (cleanInput.length > 200) {
      console.log('🛑 Input too long, likely console spam - ignoring');
      this.rl.prompt();
      return;
    }

    // Detect infinite loop - same input being processed repeatedly
    if (cleanInput === this.lastProcessedInput) {
      this.sameInputCount++;
      if (this.sameInputCount > 2) {
        console.log('🛑 INFINITE LOOP DETECTED - FORCE STOPPING');
        console.log('🔄 Resetting conversation...');
        this.currentConversation = null;
        this.sameInputCount = 0;
        this.lastProcessedInput = '';
        console.log('🤖 Agent: Let\'s start fresh. What can I help you with?');
        this.rl.prompt();
        return;
      }
    } else {
      this.sameInputCount = 0;
    }
    this.lastProcessedInput = cleanInput;

    // Set processing flag
    this.isProcessing = true;

    try {
      // Handle special commands
      if (await this.handleSpecialCommands(cleanInput)) {
        return;
      }

      await this.processUserInput(cleanInput);

    } catch (error) {
      console.error('❌ Error processing input:', error);
      console.log('🤖 Agent: I had trouble with that. Please try again.\n');
    } finally {
      this.isProcessing = false;
      // Small delay to prevent rapid re-processing
      setTimeout(() => {
        this.rl.prompt();
      }, 100);
    }
  }

  private cleanInput(input: string): string {
    if (!input) return '';

    return input
      .replace(/\\r\\n/g, ' ')      // Handle escaped Windows line endings
      .replace(/\\n/g, ' ')        // Handle escaped Unix line endings
      .replace(/\\r/g, ' ')        // Handle escaped Mac line endings
      .replace(/\r\n/g, ' ')       // Handle real Windows line endings
      .replace(/\n/g, ' ')         // Handle real Unix line endings
      .replace(/\r/g, ' ')         // Handle real Mac line endings
      .replace(/\t/g, ' ')         // Replace tabs with spaces
      .replace(/\s+/g, ' ')        // Collapse multiple spaces
      .trim();                     // Remove leading/trailing whitespace
  }

  private async handleSpecialCommands(input: string): Promise<boolean> {
    const command = input.toLowerCase();

    switch (command) {
      case 'help':
        this.displayHelp();
        return true;

      case 'examples':
        this.displayExamples();
        return true;

      case 'status':
        this.displayConversationStatus();
        return true;

      case 'reset':
      case 'restart':
        await this.resetConversation();
        return true;

      case 'quit':
      case 'exit':
        this.shutdown();
        return true;

      default:
        return false;
    }
  }

  private async processUserInput(input: string): Promise<void> {
    console.log(); // Add spacing

    try {
      if (!this.currentConversation) {
        console.log('🎬 Starting new conversation...');
        this.currentConversation = await this.orchestrator.startConversation(input);
      }

      this.currentConversation = await this.orchestrator.processTurn(this.currentConversation, input);
      
      // Display agent response (but don't let it become input)
      if (this.currentConversation.lastAgentResponse) {
        console.log(`🤖 Agent: ${this.currentConversation.lastAgentResponse}`);
      }
      
      if (this.orchestrator.isReadyForDealCreation(this.currentConversation)) {
        console.log('\n🎯 All information gathered! Creating deal...');
        await this.createFinalDeal(this.currentConversation);
      }

    } catch (error) {
      console.error('❌ Conversation processing failed:', error);
      console.log('🤖 Agent: I had trouble processing that. Could you try rephrasing?');
    }

    console.log(); // Add spacing before next prompt
  }

  private async createFinalDeal(conversationState: ConversationState): Promise<void> {
    try {
      console.log('🔄 Converting conversation to deal format...');
      const dealState = this.convertConversationToDealState(conversationState);
      
      console.log('⚙️ Executing deal creation pipeline...');
      
      const result = await globalWorkflowOrchestrator.executeWorkflow('standard-deal-creation', dealState);
      
      if (result.success) {
        console.log('\n🎉 SUCCESS! Deal created successfully!');
        console.log(`📋 Deal ID: ${result.finalState.dealId || 'Generated'}`);
        console.log('✅ The deal has been submitted to Alliance Energy.');
        
        this.currentConversation = null;
        console.log('\n💡 Ready for your next deal! What would you like to create?');
      } else {
        console.log('\n⚠️ Deal creation encountered issues. Let\'s fix them.');
        if (dealState.validationErrors?.length) {
          dealState.validationErrors.forEach(error => console.log(`   • ${error}`));
        }
      }
      
    } catch (error) {
      console.error('❌ Deal creation failed:', error);
      console.log('🤖 Agent: I had trouble creating the deal. Would you like to try again?');
    }
  }

  private convertConversationToDealState(conversationState: ConversationState): DealState {
    const dealInfo = conversationState.dealInfo;
    const userRequirements = this.generateUserRequirements(dealInfo);
    
    return {
      userRequirements,
      dealData: {
        counterparty: dealInfo.customer?.name,
        product: dealInfo.product?.name,
        quantity: dealInfo.quantity?.amount,
        originLocation: dealInfo.locations?.origin?.name,
        destinationLocation: dealInfo.locations?.destination?.name,
        frequency: dealInfo.frequency?.type
      },
      phase: 'collection',
      missingFields: [],
      validationErrors: []
    };
  }

  private generateUserRequirements(dealInfo: any): string {
    const parts: string[] = ['Create a deal'];
    
    if (dealInfo.customer?.name) parts.push(`with ${dealInfo.customer.name}`);
    if (dealInfo.quantity?.amount && dealInfo.product?.name) {
      parts.push(`for ${dealInfo.quantity.amount} gallons of ${dealInfo.product.name.toLowerCase()}`);
    }
    if (dealInfo.locations?.origin?.name && dealInfo.locations?.destination?.name) {
      parts.push(`from ${dealInfo.locations.origin.name} to ${dealInfo.locations.destination.name}`);
    }
    if (dealInfo.frequency?.type) parts.push(`${dealInfo.frequency.type} delivery`);
    
    return parts.join(' ');
  }

  private displayHelp(): void {
    console.log('\n📚 QDE Conversational Agent Help');
    console.log('═══════════════════════════════════');
    console.log('💭 Commands: help, examples, status, reset, quit');
    console.log('');
    console.log('📋 Input Features:');
    console.log('   • Type messages naturally');
    console.log('   • Paste text then press Enter to send');
    console.log('   • Text is automatically cleaned and formatted');
    console.log('');
    console.log('💡 Try pasting this:');
    console.log('   "Create a monthly deal with ABC Trading for 5000 gallons of propane from Houston Terminal to Dallas Hub"');
  }

  private displayExamples(): void {
    console.log('\n💡 Example Deal Requests');
    console.log('═══════════════════════════════════');
    console.log('📋 Type or paste any of these (then press Enter):');
    console.log('');
    console.log('✅ Complete Requests:');
    console.log('Create a deal with ABC Trading for 5000 gallons of propane from Houston Terminal to Dallas Hub, monthly delivery');
    console.log('Set up a weekly deal with Energy Solutions LLC for 10000 gallons of gasoline from San Antonio Depot to Oklahoma City Terminal');
    console.log('I need a quarterly delivery of 25000 gallons of diesel with XYZ Logistics from Austin Facility to Tulsa Distribution Center');
    console.log('');
    console.log('✅ Partial Requests:');
    console.log('I need fuel for ABC Trading');
    console.log('5000 gallons of propane');
    console.log('Monthly delivery from Houston');
  }

  private displayConversationStatus(): void {
    if (!this.currentConversation) {
      console.log('\n📊 No active conversation. Start by telling me what you need!');
      return;
    }

    const summary = this.orchestrator.getConversationSummary(this.currentConversation);
    console.log('\n📊 Current Conversation Status');
    console.log('═══════════════════════════════════');
    console.log(`📈 Progress: ${summary.progress.completionPercent}% complete`);
    
    const dealInfo = this.currentConversation.dealInfo;
    if (dealInfo.customer?.name) console.log(`✅ Customer: ${dealInfo.customer.name}`);
    if (dealInfo.product?.name) console.log(`✅ Product: ${dealInfo.product.name}`);
    if (dealInfo.quantity?.amount) console.log(`✅ Quantity: ${dealInfo.quantity.amount} ${dealInfo.quantity.unit}`);
    if (dealInfo.locations?.origin?.name) console.log(`✅ Origin: ${dealInfo.locations.origin.name}`);
    if (dealInfo.locations?.destination?.name) console.log(`✅ Destination: ${dealInfo.locations.destination.name}`);
    if (dealInfo.frequency?.type) console.log(`✅ Frequency: ${dealInfo.frequency.type}`);
    
    if (summary.progress.missingFields.length > 0) {
      console.log(`❓ Still need: ${summary.progress.missingFields.join(', ')}`);
    }
  }

  private async resetConversation(): Promise<void> {
    this.currentConversation = null;
    console.log('\n🔄 Starting fresh! What deal would you like to create?');
  }

  private shutdown(): void {
    console.log('\n👋 Thanks for using the QDE Conversational Agent System!');
    console.log('🛢️ Pipeline shutdown complete. All deals sealed! ⚡');
    process.exit(0);
  }
}

// Main execution
async function main() {
  console.log('🚀 Initializing Paste-Safe QDE Conversational System...');
  
  try {
    const testInterface = new PasteSafeConversationalInterface();
    await testInterface.start();
  } catch (error) {
    console.error('❌ Failed to start conversational system:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});