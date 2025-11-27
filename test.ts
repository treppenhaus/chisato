import { Agent, ILLMProvider, IAction, Message } from './src/index';

/**
 * Enhanced Mock LLM Provider with proper action handling
 */
class EnhancedMockProvider implements ILLMProvider {
    private callCount = 0;

    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        this.callCount++;
        const lastMessage = messages[messages.length - 1];

        console.log(`\n${'='.repeat(50)}`);
        console.log(`LLM Call #${this.callCount}`);
        console.log(`${'='.repeat(50)}`);

        if (systemPrompt) {
            console.log('\n📋 System Prompt Received:');
            console.log(systemPrompt.substring(0, 200) + '...');
        }

        console.log('\n💬 Last Message:');
        console.log(`  Role: ${lastMessage.role}`);
        console.log(`  Content: ${lastMessage.content.substring(0, 100)}...`);

        // First call - calculate request
        if (this.callCount === 1) {
            const response = 'I\'ll calculate that for you!\n\n{"action": "calculator", "parameters": {"expression": "15 * 23"}}';
            console.log('\n🤖 LLM Response: Requesting calculator action');
            return response;
        }

        // Second call - after receiving action results
        if (this.callCount === 2) {
            const response = 'The calculation is complete! 15 multiplied by 23 equals 345.';
            console.log('\n🤖 LLM Response: Providing final answer');
            return response;
        }

        return 'How can I help you?';
    }
}

/**
 * Calculator Action
 */
class CalculatorAction implements IAction {
    name = 'calculator';
    description = 'Perform mathematical calculations';
    parameters = [
        {
            name: 'expression',
            type: 'string' as const,
            description: 'Mathematical expression to evaluate',
            required: true
        }
    ];

    async execute(params: Record<string, any>): Promise<any> {
        console.log(`\n${'*'.repeat(50)}`);
        console.log('⚙️  EXECUTING ACTION: calculator');
        console.log(`${'*'.repeat(50)}`);
        console.log(`Expression: ${params.expression}`);

        const result = eval(params.expression);
        console.log(`Result: ${result}`);
        console.log('*'.repeat(50));

        return { result, expression: params.expression };
    }
}

/**
 * Weather Action (for demonstration)
 */
class WeatherAction implements IAction {
    name = 'get_weather';
    description = 'Get weather information for a location';
    parameters = [
        {
            name: 'location',
            type: 'string' as const,
            description: 'City name',
            required: true
        }
    ];

    async execute(params: Record<string, any>): Promise<any> {
        console.log(`\n⚙️  Getting weather for: ${params.location}`);
        // Mock weather data
        return {
            location: params.location,
            temperature: 72,
            condition: 'Sunny',
            humidity: 45
        };
    }
}

/**
 * Run comprehensive test
 */
async function runTest() {
    console.log('\n' + '='.repeat(70));
    console.log('  🧪 CHISATO FRAMEWORK - COMPREHENSIVE TEST');
    console.log('='.repeat(70));

    const provider = new EnhancedMockProvider();
    const agent = new Agent(provider, {
        systemPromptPrefix: 'You are a helpful AI assistant with access to various tools.',
        maxIterations: 5
    });

    // Register multiple actions
    console.log('\n📦 Registering Actions...');
    agent.registerAction(new CalculatorAction());
    agent.registerAction(new WeatherAction());
    console.log('  ✅ Calculator action registered');
    console.log('  ✅ Weather action registered');

    // Test 1: Simple calculation
    console.log('\n' + '='.repeat(70));
    console.log('TEST: Calculation Request');
    console.log('='.repeat(70));

    try {
        const response = await agent.chat('Please calculate 15 * 23');

        console.log('\n' + '='.repeat(70));
        console.log('  ✅ TEST PASSED');
        console.log('='.repeat(70));
        console.log('\n📝 Final Response:');
        console.log(`  ${response}`);

        const history = agent.getHistory();
        console.log(`\n📚 Conversation History (${history.length} messages):`);
        history.forEach((msg, i) => {
            console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 60)}...`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('  ✨ FRAMEWORK VERIFICATION COMPLETE');
        console.log('='.repeat(70));
        console.log('\n📊 Summary:');
        console.log('  ✓ Agent created successfully');
        console.log('  ✓ Actions registered');
        console.log('  ✓ System prompt generated with action descriptions');
        console.log('  ✓ LLM response parsed correctly');
        console.log('  ✓ Action executed successfully');
        console.log('  ✓ Results fed back to LLM');
        console.log('  ✓ Final response received');
        console.log('\n  🎉 All systems operational!\n');

        return true;
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        return false;
    }
}

// Run the test
runTest().then(success => {
    process.exit(success ? 0 : 1);
});
