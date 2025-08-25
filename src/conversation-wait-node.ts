import { Node } from './pocket-flow';
import { ConversationState } from './types/conversation';

/**
 * A special node that simply stops the flow and waits for the next user input.
 * This prevents infinite loops in conversational flows.
 */
export class ConversationWaitNode extends Node<ConversationState> {
  async prep(shared: ConversationState): Promise<void> {
    console.log('⏸️  Conversation Wait: Flow paused, waiting for next user input...');
    return;
  }

  async exec(prepRes: void): Promise<void> {
    // Do nothing - just wait
    return;
  }

  async post(shared: ConversationState, prepRes: void, execRes: void): Promise<string> {
    console.log('🔄 Conversation Wait: Ready for next user input');
    // Return no action - this stops the flow
    return '';
  }
}