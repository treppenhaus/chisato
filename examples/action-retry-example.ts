import { AgentLoop, ILLMProvider, Message, IAction, ParameterDefinition } from '../src/index';

/**
 * Action that always fails
 */
class FailingAction implements IAction {
    name = 'test_action';
    description = 'Test action';
    parameters: ParameterDefinition[] = [];

    async execute(params: Record<string, any>) {
        console.log(`    [Action] Executing...`);
        throw new Error('Action failed!');
    }
}

/**
 * Provider that only calls the action once
 */
class OneTimeProvider implements ILLMProvider {
    private called = false;

    async sendAgenticMessage(messages: Message[]): Promise<string> {
        if (!this.called) {
            this.called = true;
            return `{"action": "test_action", "parameters": {}}`;
        }
        // After first call, just return normal message to end the loop
        return 'Action completed.';
    }

    async sendMessage(messages: Message[]): Promise<string> {
        return 'OK';
    }
}

async function demo() {
    console.log('='.repeat(80));
    console.log(' Action Retry Tracking Demo');
    console.log('='.repeat(80));
    console.log('\nThis demonstrates automatic retry of failed actions with callbacks.\n');

    let retryCount = 0;
    let maxRetriesReached = false;

    const agent = new AgentLoop(new OneTimeProvider(), {
        maxSteps: 2, // Limit iterations
        maxActionRetries: 3, // Try each action up to 3 times
        
        onActionRetry: (actionName, attempt, error) => {
            retryCount++;
            console.log(`\n⚠️  [RETRY #${retryCount}]`);
            console.log(`   Action: ${actionName}`);
            console.log(`   Attempt: ${attempt} of 3`);
            console.log(`   Error: ${error}`);
        },

        onActionMaxRetries: (actionName, error) => {
            maxRetriesReached = true;
            console.log(`\n❌ [MAX RETRIES REACHED]`);
            console.log(`   Action: ${actionName}`);
            console.log(`   All ${retryCount + 1} attempts failed`);
            console.log(`   Final error: ${error}`);
        }
    });

    agent.registerAction(new FailingAction());

    console.log('Running action that will fail...\n');
    console.log('-'.repeat(80));

    await agent.run('test');

    console.log('\n' + '='.repeat(80));
    console.log(' Results');
    console.log('='.repeat(80));
    console.log(`Total retries: ${retryCount}`);
    console.log(`Max retries reached: ${maxRetriesReached}`);
    console.log('');
    console.log('How it works:');
    console.log('  1. Action executes and fails');
    console.log('  2. onActionRetry called (wait 300ms)');
    console.log('  3. Action retries and fails');
    console.log('  4. onActionRetry called (wait 600ms)');
    console.log('  5. Action retries final time and fails');
    console.log('  6. onActionMaxRetries called');
    console.log('');
}

demo().catch(console.error);
