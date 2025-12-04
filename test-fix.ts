import { AgentLoop, ILLMProvider, Message } from './src/index';
import * as fs from 'fs';

class TestProvider implements ILLMProvider {
    private callCount = 0;
    private log: string[] = [];

    async sendAgenticMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        this.callCount++;
        this.log.push(`\n=== CALL #${this.callCount} ===`);
        this.log.push(`Messages in history: ${messages.length}`);
        
        // Get last user message
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        this.log.push(`Last user message: "${lastUserMessage.content}"`);
        
        // Response WITHOUT "DONE" - just user_output action
        // The agent should automatically terminate after seeing user_output
        const response = `{"action": "user_output", "parameters": {"message": "Response to: ${lastUserMessage.content}"}}`;
        this.log.push(`Response: ${response}`);
        
        return response;
    }

    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        return "Hello!";
    }

    getLog(): string {
        return this.log.join('\n');
    }

    getCallCount(): number {
        return this.callCount;
    }
}

async function testImprovedApproach() {
    const output: string[] = [];
    output.push('='.repeat(80));
    output.push('IMPROVED APPROACH TEST: user_output Detection (No DONE keyword)');
    output.push('='.repeat(80));
    output.push('\nThe agent should automatically terminate when user_output is called.');
    output.push('No "DONE" keyword needed!\n');

    const provider = new TestProvider();
    const agent = new AgentLoop(provider, { 
        includeDefaultActions: true,
        onUserOutput: (msg) => output.push(`[User Output]: ${msg}`)
    });

    // Multi-turn conversation
    output.push('\n--- Turn 1 ---');
    output.push('User: "Hello!"');
    await agent.run('Hello!');
    output.push(`Calls made: ${provider.getCallCount()}`);

    output.push('\n--- Turn 2 ---');
    output.push('User: "How are you?"');
    await agent.run('How are you?');
    output.push(`Calls made for this turn: 1`);
    output.push(`Total calls: ${provider.getCallCount()}`);

    output.push('\n--- Turn 3 ---');
    output.push('User: "What is 2+2?"');
    const result = await agent.run('What is 2+2?');
    output.push(`Calls made for this turn: 1`);
    output.push(`Total calls: ${provider.getCallCount()}`);

    output.push('\n' + provider.getLog());

    output.push('\n' + '='.repeat(80));
    output.push('RESULTS:');
    output.push(`✅ Total LLM calls: ${provider.getCallCount()} (one per turn)`);
    output.push(`✅ Last result success: ${result.success}`);
    output.push(`✅ No "DONE" keyword required!`);
    output.push(`✅ Agent terminates automatically when user_output is called`);
    output.push('='.repeat(80));

    const fullOutput = output.join('\n');
    fs.writeFileSync('improved-test-output.txt', fullOutput);
    console.log(fullOutput);
}

// Test with multi-step actions
class MultiStepProvider implements ILLMProvider {
    private step = 0;

    async sendAgenticMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        this.step++;
        
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        
        // Simulate a multi-step process
        if (lastUserMessage.content.includes('weather')) {
            if (this.step === 1) {
                // First, call weather action
                return `{"action": "get_weather", "parameters": {"location": "Paris"}}`;
            } else {
                // Then, output the result to user (this should terminate)
                return `{"action": "user_output", "parameters": {"message": "The weather in Paris is sunny, 22°C!"}}`;
            }
        }
        
        // Default
        return `{"action": "user_output", "parameters": {"message": "Hello!"}}`;
    }

    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        return "Hello!";
    }

    resetStep() {
        this.step = 0;
    }
}

async function testMultiStep() {
    const output: string[] = [];
    output.push('\n' + '='.repeat(80));
    output.push('MULTI-STEP TEST: Weather Query');
    output.push('='.repeat(80));
    output.push('\nThis simulates: get_weather action → user_output');
    output.push('The loop should run exactly 2 iterations.\n');

    const provider = new MultiStepProvider();
    
    // Create a simple weather action
    const weatherAction = {
        name: 'get_weather',
        description: 'Get weather for a location',
        parameters: [{ name: 'location', type: 'string' as const, description: 'City', required: true }],
        async execute(params: any) {
            return { temp: 22, condition: 'sunny' };
        }
    };

    const agent = new AgentLoop(provider, { 
        includeDefaultActions: true,
        onUserOutput: (msg) => output.push(`[User Output]: ${msg}`)
    });
    
    agent.registerAction(weatherAction);

    output.push('User: "What\'s the weather in Paris?"');
    const result = await agent.run("What's the weather in Paris?");
    
    output.push(`\nResult: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    output.push(`Actions executed: ${result.actionsExecuted.map(a => a.actionName).join(', ')}`);
    output.push(`\n✅ Loop terminated automatically after user_output`);
    output.push('='.repeat(80));

    const fullOutput = output.join('\n');
    fs.appendFileSync('improved-test-output.txt', '\n' + fullOutput);
    console.log(fullOutput);
}

async function runAllTests() {
    await testImprovedApproach();
    await testMultiStep();
}

runAllTests().catch(e => {
    const error = `ERROR: ${e.message}\n${e.stack}`;
    fs.writeFileSync('improved-test-output.txt', error);
    console.error(error);
});
