#!/usr/bin/env npx tsx

import * as readline from 'readline';

/**
 * Minimal Interactive Test - Emergency Fallback
 * 
 * This is a simplified version to test conversation without complex agent routing
 */

class SimpleConversationalInterface {
  private rl: readline.Interface;
  private isProcessing: boolean = false;
  private turnCount: number = 0;
  private dealData: any = {};

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '💬 You: '
    });
  }

  async start(): Promise<void> {
    console.log('\n🎬 Simple QDE Conversational Test');
    console.log('══════════════════════════════════');
    console.log('💡 Basic conversation flow without complex agents');
    console.log('💭 Type "quit" to exit\n');

    console.log('🤖 Agent: Hello! I\'ll help you create a fuel deal. What company is this for?');
    this.startConversationLoop();
  }

  private startConversationLoop(): void {
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      await this.handleInput(input);
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Forcing exit...');
      process.exit(0);
    });
  }

  private async handleInput(input: string): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Please wait...');
      this.rl.prompt();
      return;
    }

    const cleanInput = input.trim();
    if (!cleanInput) {
      this.rl.prompt();
      return;
    }

    if (cleanInput.toLowerCase() === 'quit') {
      process.exit(0);
    }

    // Emergency break
    if (this.turnCount > 10) {
      console.log('🛑 Too many turns, resetting...');
      this.turnCount = 0;
      this.dealData = {};
    }

    this.isProcessing = true;
    this.turnCount++;

    try {
      console.log(`🔄 Turn ${this.turnCount}: Processing "${cleanInput}"`);
      
      // Simple field collection
      if (!this.dealData.customer) {
        this.dealData.customer = cleanInput;
        console.log(`🤖 Agent: Got it! Customer: ${cleanInput}. What product do you need?`);
      } else if (!this.dealData.product) {
        this.dealData.product = cleanInput;
        console.log(`🤖 Agent: Perfect! Product: ${cleanInput}. How many gallons?`);
      } else if (!this.dealData.quantity) {
        this.dealData.quantity = cleanInput;
        console.log(`🤖 Agent: Great! Quantity: ${cleanInput}. All set! Deal would be created here.`);
        console.log('🎉 Conversation complete!');
        this.turnCount = 0;
        this.dealData = {};
        console.log('🤖 Agent: Ready for another deal. What company is this for?');
      }

    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      this.isProcessing = false;
      this.rl.prompt();
    }
  }
}

async function main() {
  const testInterface = new SimpleConversationalInterface();
  await testInterface.start();
}

main().catch(console.error);