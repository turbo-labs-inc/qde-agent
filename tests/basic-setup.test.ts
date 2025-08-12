import { Node, Flow } from '../src/pocket-flow';
import { DataCollectionAgent } from '../agents/data-collection';
import { DealState } from '../src/types';

describe('QDE Agent Basic Setup', () => {
  test('PocketFlow Node should work correctly', async () => {
    interface TestState {
      input?: string;
      output?: string;
    }

    class TestNode extends Node<TestState> {
      async prep(shared: TestState): Promise<string> {
        return shared.input || 'test input';
      }

      async exec(input: string): Promise<string> {
        return `processed: ${input}`;
      }

      async post(shared: TestState, prepRes: string, execRes: string): Promise<string | undefined> {
        shared.output = execRes;
        return undefined;
      }
    }

    const state: TestState = { input: 'hello world' };
    const node = new TestNode();
    const action = await node.run(state);

    expect(action).toBeUndefined();
    expect(state.output).toBe('processed: hello world');
  });

  test('Data Collection Agent should collect reference data', async () => {
    const state: DealState = {
      userRequirements: 'Test deal requirements',
      phase: 'collection'
    };

    const agent = new DataCollectionAgent();
    const action = await agent.run(state);

    expect(action).toBe('pricing');
    expect(state.companies).toBeDefined();
    expect(state.companies?.length).toBeGreaterThan(0);
    expect(state.originLocations).toBeDefined();
    expect(state.destinationLocations).toBeDefined();
    expect(state.frequencies).toBeDefined();
  });

  test('Flow should orchestrate nodes correctly', async () => {
    interface FlowState {
      step?: number;
      completed?: boolean;
    }

    class StepNode extends Node<FlowState> {
      private stepNumber: number;

      constructor(stepNumber: number) {
        super();
        this.stepNumber = stepNumber;
      }

      async prep(shared: FlowState): Promise<number> {
        return this.stepNumber;
      }

      async exec(step: number): Promise<string> {
        return `Step ${step} executed`;
      }

      async post(shared: FlowState, prepRes: number, execRes: string): Promise<string | undefined> {
        shared.step = prepRes;
        if (prepRes === 2) {
          shared.completed = true;
          return undefined;
        }
        return 'next';
      }
    }

    const step1 = new StepNode(1);
    const step2 = new StepNode(2);
    
    step1.on('next', step2);
    
    const flow = new Flow(step1);
    const state: FlowState = {};
    
    await flow.run(state);

    expect(state.step).toBe(2);
    expect(state.completed).toBe(true);
  });

  test('Should handle errors gracefully', async () => {
    interface ErrorState {
      error?: string;
    }

    class ErrorNode extends Node<ErrorState> {
      async prep(shared: ErrorState): Promise<string> {
        return 'test';
      }

      async exec(input: string): Promise<string> {
        throw new Error('Test error');
      }

      async execFallback(prepRes: string, error: Error): Promise<string> {
        return `Fallback: ${error.message}`;
      }

      async post(shared: ErrorState, prepRes: string, execRes: string): Promise<string | undefined> {
        if (execRes.startsWith('Fallback:')) {
          shared.error = execRes;
        }
        return undefined;
      }
    }

    const state: ErrorState = {};
    const node = new ErrorNode();
    await node.run(state);

    expect(state.error).toBe('Fallback: Test error');
  });
});

describe('Type System', () => {
  test('DealState should have correct structure', () => {
    const state: DealState = {
      userRequirements: 'Test requirements',
      phase: 'parsing'
    };

    expect(state.userRequirements).toBe('Test requirements');
    expect(state.phase).toBe('parsing');
    expect(state.companies).toBeUndefined();
    expect(state.dealData).toBeUndefined();
  });
});