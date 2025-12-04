import { AgentLoop, ILLMProvider, Message, IAction, ParameterDefinition, ActionExecution } from '../src/index';

/**
 * REAL LLM PROVIDER EXAMPLE
 * 
 * sendMessage: Normal LLM API call (just chat)
 * sendAgenticMessage: LLM decides whether to use actions, responds accordingly
 */
class RealLLMProvider implements ILLMProvider {
    private apiKey: string;
    private apiUrl: string;

    constructor(apiKey: string, apiUrl: string = 'https://api.openai.com/v1/chat/completions') {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    /**
     * Normal message - just call LLM API and return response
     * Used for simple queries without action capabilities
     */
    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        console.log(`\n[LLM Normal Call] Simple chat request`);
        return this.callLLMAPI(messages, systemPrompt);
    }

    /**
     * Agentic message - LLM decides whether to use actions
     * The system prompt includes available actions, and the LLM decides what to do
     */
    async sendAgenticMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        console.log(`\n[LLM Agentic Call] System prompt with actions provided`);
        
        // The systemPrompt already contains action definitions from AgentLoop/Agent
        // The LLM will see them and decide whether to use actions or respond normally
        // This is the key: the SYSTEM PROMPT tells the LLM what actions are available
        
        return this.callLLMAPI(messages, systemPrompt);
    }

    /**
     * Actual LLM API call
     */
    private async callLLMAPI(messages: Message[], systemPrompt?: string): Promise<string> {
        const apiMessages: any[] = [];

        if (systemPrompt) {
            apiMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        for (const msg of messages) {
            apiMessages.push({
                role: msg.role,
                content: msg.content
            });
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: apiMessages,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`LLM API error: ${response.statusText}`);
            }

            const data = await response.json();
            const llmResponse = data.choices[0].message.content;

            console.log(`[LLM Response] ${llmResponse.substring(0, 100)}...`);
            return llmResponse;

        } catch (error) {
            console.error('Error calling LLM:', error);
            throw error;
        }
    }
}

/**
 * SIMULATED LLM PROVIDER
 * 
 * Simulates what a real LLM would do for testing WITHOUT an API key.
 * - sendAgenticMessage: Can decide to use actions
 * - sendMessage: Normal chat only
 */
class SimulatedLLMProvider implements ILLMProvider {
    /**
     * Agentic message - LLM sees actions and can decide to use them
     */
    async sendAgenticMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage.content.toLowerCase();

        console.log(`\n[Simulated LLM - Agentic] Received: "${lastMessage.content}"`);
        console.log(`[Simulated LLM] Has actions available: ${systemPrompt ? 'Yes' : 'No'}`);

        // Simulate intelligent decision-making like a real LLM would
        // In a real scenario, the LLM reads the system prompt which lists available actions
        // and decides whether to use them based on the user's request

        // Simple greeting - just respond
        if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
            console.log('[Simulated LLM] Decision: Normal greeting, no action needed');
            return 'Hello! I can help you with searches, weather information, sending emails, and more. What would you like to do?';
        }

        // Question about capabilities
        if (userMessage.includes('what can you') || userMessage.includes('help me')) {
            console.log('[Simulated LLM] Decision: Explaining capabilities, no action needed');
            return 'I can help you search the internet, check weather, send emails, and more. I have access to several actions that I can use when needed.';
        }

        // Search request - use action
        if (userMessage.includes('search')) {
            console.log('[Simulated LLM] Decision: User wants search, using search action');
            const query = userMessage.replace('search for', '').replace('search', '').trim() || 'TypeScript tutorials';
            return `I'll search for that information.

{"action": "search", "parameters": {"query": "${query}"}}

{"action": "user_output", "parameters": {"message": "I found several great resources about ${query}. The top results include comprehensive tutorials and documentation that should help you get started."}}`;
        }

        // Weather request - use action
        if (userMessage.includes('weather')) {
            console.log('[Simulated LLM] Decision: User wants weather, using weather action');
            const city = userMessage.includes('tokyo') ? 'Tokyo' : 'New York';
            return `Let me check the weather for you.

{"action": "get_weather", "parameters": {"location": "${city}"}}

{"action": "user_output", "parameters": {"message": "The current weather in ${city} is sunny with a temperature of 72°F. It's a beautiful day!"}}`;
        }

        // Email request - use action
        if (userMessage.includes('email') || userMessage.includes('send')) {
            console.log('[Simulated LLM] Decision: User wants to send email, using email action');
            return `I'll send that email for you.

{"action": "send_email", "parameters": {"to": "john@example.com", "subject": "Hello", "body": "This is a test email"}}

{"action": "user_output", "parameters": {"message": "Email sent successfully to john@example.com!"}}`;
        }

        // Math question - use action
        if (userMessage.includes('calculate') || userMessage.includes('what is') || /\d+\s*[\+\-\*\/]\s*\d+/.test(userMessage)) {
            console.log('[Simulated LLM] Decision: Math calculation needed, using calculator action');
            return `I'll calculate that for you.

{"action": "calculator", "parameters": {"expression": "15 * 23"}}

{"action": "user_output", "parameters": {"message": "The result of 15 × 23 is 345."}}`;
        }

        // Default - just respond normally
        console.log('[Simulated LLM] Decision: General question, responding normally');
        return 'I\'m here to help! You can ask me to search for information, check weather, send emails, perform calculations, and more.';
    }

    /**
     * Normal message - just chat, no actions available
     */
    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        const lastMessage = messages[messages.length - 1];
        console.log(`\n[Simulated LLM - Normal] Received: "${lastMessage.content}"`);
        console.log('[Simulated LLM] Mode: Regular chat (no actions)');

        // Simple responses without actions
        if (lastMessage.content.toLowerCase().includes('hello') || lastMessage.content.toLowerCase().includes('hi')) {
            return 'Hello! How can I assist you today?';
        }

        if (lastMessage.content.toLowerCase().includes('help')) {
            return 'I\'m here to help! What would you like to know?';
        }

        return 'I understand. Please feel free to ask me anything.';
    }
}

/**
 * Custom Actions for demonstration
 */
class SearchAction implements IAction {
    name = 'search';
    description = 'Search the internet for information';
    parameters: ParameterDefinition[] = [
        { name: 'query', type: 'string', description: 'Search query', required: true }
    ];

    async execute(params: Record<string, any>) {
        console.log(`\n🔍 [SearchAction EXECUTED] Query: "${params.query}"`);
        // In a real app, this would call a search API
        return { results: ['Result 1 (example result delivered by action)', 'Result 2', 'Result 3'] };
    }
}

class WeatherAction implements IAction {
    name = 'get_weather';
    description = 'Get current weather for a location';
    parameters: ParameterDefinition[] = [
        { name: 'location', type: 'string', description: 'City name', required: true }
    ];

    async execute(params: Record<string, any>) {
        console.log(`\n🌤️  [WeatherAction EXECUTED] Location: ${params.location}`);
        // In a real app, this would call a weather API
        return { temperature: 72, condition: 'Sunny' };
    }
}

class EmailAction implements IAction {
    name = 'send_email';
    description = 'Send an email';
    parameters: ParameterDefinition[] = [
        { name: 'to', type: 'string', description: 'Recipient email', required: true },
        { name: 'subject', type: 'string', description: 'Email subject', required: true },
        { name: 'body', type: 'string', description: 'Email body', required: true }
    ];

    async execute(params: Record<string, any>) {
        console.log(`\n📧 [EmailAction EXECUTED] To: ${params.to}, Subject: ${params.subject}`);
        // In a real app, this would send an actual email
        return { sent: true, messageId: 'msg-123' };
    }
}

class CalculatorAction implements IAction {
    name = 'calculator';
    description = 'Perform mathematical calculations';
    parameters: ParameterDefinition[] = [
        { name: 'expression', type: 'string', description: 'Math expression to evaluate', required: true }
    ];

    async execute(params: Record<string, any>) {
        console.log(`\n🔢 [CalculatorAction EXECUTED] Expression: ${params.expression}`);
        const result = eval(params.expression); // Use a safe math parser in production!
        return { result };
    }
}

/**
 * Main test
 */
async function testAgentLoop() {
    console.log('='.repeat(80));
    console.log(' AGENT LOOP TEST - LLM DECIDES WHEN TO USE ACTIONS');
    console.log('='.repeat(80));

    // OPTION 1: Use a real LLM (uncomment when you have an API key)
    //const provider = new RealLLMProvider(process.env.OPENAI_API_KEY || 'your-api-key-here');

    // OPTION 2: Use simulated LLM (for testing without API key)
    const provider = new SimulatedLLMProvider();

    const agentLoop = new AgentLoop(provider, {
        includeDefaultActions: true,
        onUserOutput: (message) => {
            console.log('\n✅ [USER OUTPUT]:', message);
        },
        onActionExecuted: (execution: ActionExecution) => {
            console.log(`\n⚡ [ACTION TRACKED]: ${execution.actionName}`);
            console.log(`   Parameters:`, execution.parameters);
            console.log(`   Timestamp: ${execution.timestamp}`);
        }
    });

    // Register custom actions
    agentLoop.registerAction(new SearchAction());
    agentLoop.registerAction(new WeatherAction());
    agentLoop.registerAction(new EmailAction());
    agentLoop.registerAction(new CalculatorAction());

    console.log('\n' + '-'.repeat(80));
    console.log('Available Actions:');
    console.log('  - search (internet search)');
    console.log('  - get_weather (weather information)');
    console.log('  - send_email (send emails)');
    console.log('  - calculator (math calculations)');
    console.log('  - user_output (display to user - built-in)');
    console.log('  - query_llm (query LLM - built-in)');
    console.log('-'.repeat(80));

    // Test scenarios
    const scenarios = [
        { name: 'Simple Greeting', message: 'Hello!' },
        { name: 'Capability Question', message: 'What can you help me with?' },
        { name: 'Search Request', message: 'Search for TypeScript tutorials' },
        { name: 'Weather Request', message: 'What\'s the weather in Tokyo?' },
        { name: 'Email Request', message: 'Send an email to john@example.com' },
        { name: 'Math Calculation', message: 'What is 15 times 23?' }
    ];

    for (const scenario of scenarios) {
        console.log('\n' + '='.repeat(80));
        console.log(`TEST: ${scenario.name}`);
        console.log('='.repeat(80));
        console.log(`👤 User: "${scenario.message}"`);

        const result = await agentLoop.run(scenario.message);

        console.log('\n📊 RESULT:');
        console.log(`   Outputs: ${result.outputs.length}`);
        console.log(`   Actions Executed: ${result.actionsExecuted.length}`);
        if (result.actionsExecuted.length > 0) {
            console.log(`   Actions: ${result.actionsExecuted.map(a => a.actionName).join(', ')}`);
        }
        console.log(`   Success: ${result.success}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(' ✨ ALL TESTS COMPLETE');
    console.log('='.repeat(80));
    console.log('\n� Summary:');
    console.log('  ✓ LLM receives system prompt with available actions');
    console.log('  ✓ LLM decides whether to use actions or respond normally');
    console.log('  ✓ Actions are executed when LLM calls them');
    console.log('  ✓ User is notified via user_output action');
    console.log('  ✓ All actions are tracked and visible');
    console.log('');
    console.log('� To use a REAL LLM:');
    console.log('   1. Get an API key (OpenAI, Anthropic, etc.)');
    console.log('   2. Uncomment RealLLMProvider in the code');
    console.log('   3. Set your API key');
    console.log('   4. Watch the real LLM make decisions!');
    console.log('');
}

// Run the test
testAgentLoop().catch(console.error);
