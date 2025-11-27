import { Agent, ILLMProvider, IAction, Message } from '../src/index';

/**
 * Example: Simple mock LLM provider for demonstration
 */
class MockLLMProvider implements ILLMProvider {
    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        console.log('\n--- System Prompt ---');
        console.log(systemPrompt || '(none)');
        console.log('\n--- Messages ---');
        console.log(JSON.stringify(messages, null, 2));

        // Simulate LLM response with action call
        const lastMessage = messages[messages.length - 1];

        if (lastMessage.content.includes('calculate') || lastMessage.content.includes('15 * 23')) {
            return 'I will calculate that for you. {"action": "calculator", "parameters": {"expression": "15 * 23"}}';
        }

        if (lastMessage.role === 'user' && lastMessage.content.includes('Action results')) {
            return 'The calculation result is 345. Is there anything else I can help you with?';
        }

        return 'I can help you with calculations. Try asking me to calculate something!';
    }
}

/**
 * Example: Calculator action
 */
class CalculatorAction implements IAction {
    name = 'calculator';
    description = 'Perform mathematical calculations';
    parameters = [
        {
            name: 'expression',
            type: 'string' as const,
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "15 * 23")',
            required: true
        }
    ];

    async execute(params: Record<string, any>): Promise<any> {
        console.log(`\n🔧 Executing calculator action with expression: ${params.expression}`);

        try {
            // NOTE: Using eval for simplicity - use a proper math parser in production!
            const result = eval(params.expression);
            return { result, expression: params.expression };
        } catch (error) {
            throw new Error(`Failed to evaluate expression: ${error}`);
        }
    }
}

/**
 * Main example
 */
async function main() {
    console.log('🤖 Chisato Framework - Basic Usage Example\n');

    // 1. Create LLM provider
    const provider = new MockLLMProvider();

    // 2. Create agent
    const agent = new Agent(provider, {
        systemPromptPrefix: 'You are a helpful AI assistant with access to tools.',
        maxIterations: 5
    });

    // 3. Register actions
    agent.registerAction(new CalculatorAction());

    console.log('✅ Agent created and calculator action registered\n');

    // 4. Chat with the agent
    try {
        const response = await agent.chat('Can you calculate 15 * 23 for me?');
        console.log('\n📝 Final Response:');
        console.log(response);

        // Show conversation history
        console.log('\n📚 Conversation History:');
        console.log(JSON.stringify(agent.getHistory(), null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the example
main().catch(console.error);
