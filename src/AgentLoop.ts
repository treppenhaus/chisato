import { ILLMProvider } from './interfaces/ILLMProvider';
import { IAction } from './interfaces/IAction';
import { Message } from './interfaces/types';
import { Agent } from './Agent';
import { UserOutputAction } from './actions/UserOutputAction';
import { QueryLLMAction } from './actions/QueryLLMAction';
import { parseActionCalls } from './utils/parser';
import {
    AgentLoopOptions,
    AgentLoopResult,
    ActionExecution
} from './interfaces/AgentLoopTypes';

/**
 * AgentLoop provides a simple interface for creating chat agents that can:
 * 1. Decide whether to respond normally or use actions
 * 2. Execute actions when needed
 * 3. Automatically notify users after action execution
 */
export class AgentLoop {
    private agent: Agent;
    private provider: ILLMProvider;
    private options: Required<AgentLoopOptions>;
    private userOutputs: string[] = [];
    private actionsExecuted: ActionExecution[] = [];

    constructor(provider: ILLMProvider, options: AgentLoopOptions = {}) {
        this.provider = provider;
        this.options = {
            maxSteps: options.maxSteps || 10,
            includeDefaultActions: options.includeDefaultActions ?? ['user_output', 'query_llm'],
            systemPrompt: options.systemPrompt || this.getDefaultSystemPrompt(),
            maxRetries: options.maxRetries || 3,
            maxActionRetries: options.maxActionRetries || 2,
            onStepComplete: options.onStepComplete || (() => { }),
            onUserOutput: options.onUserOutput || ((msg) => console.log('[Agent]:', msg)),
            onActionExecuted: options.onActionExecuted || (() => { }),
            onInvalidOutput: options.onInvalidOutput || (() => { }),
            onActionRetry: options.onActionRetry || (() => { }),
            onActionMaxRetries: options.onActionMaxRetries || (() => { })
        };

        // Create the agent
        this.agent = new Agent(provider, {
            maxIterations: this.options.maxSteps,
            systemPromptPrefix: this.options.systemPrompt,
            maxRetries: this.options.maxRetries,
            maxActionRetries: this.options.maxActionRetries,
            onInvalidOutput: this.options.onInvalidOutput,
            onActionRetry: this.options.onActionRetry,
            onActionMaxRetries: this.options.onActionMaxRetries
        });

        // Register default actions based on the array
        if (this.options.includeDefaultActions.length > 0) {
            this.registerDefaultActions();
        }
    }

    /**
     * Register an action with the agent
     */
    registerAction(action: IAction): void {
        this.agent.registerAction(action);
    }

    /**
     * Process a user message - the LLM decides whether to use actions or respond normally
     */
    async run(userMessage: string): Promise<AgentLoopResult> {
        this.userOutputs = [];
        this.actionsExecuted = [];

        try {
            // Let the agent handle the message
            // The LLM will decide whether to use actions or just respond
            const response = await this.agent.chat(userMessage);

            // Track all actions that were executed
            this.trackExecutedActions();

            // Extract user outputs
            this.extractUserOutputs(response);

            // If actions were executed but no user_output was called, 
            // automatically create one to notify the user
            if (this.actionsExecuted.length > 0 && this.userOutputs.length === 0) {
                const message = this.generateAutoNotification();
                this.userOutputs.push(message);
                this.options.onUserOutput(message);
            }

            return {
                outputs: this.userOutputs,
                actionsExecuted: this.actionsExecuted,
                success: true
            };

        } catch (error) {
            return {
                outputs: this.userOutputs,
                actionsExecuted: this.actionsExecuted,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Track which actions were executed from conversation history
     */
    private trackExecutedActions(): void {
        const history = this.agent.getHistory();

        for (const message of history) {
            if (message.role === 'assistant') {
                const actionCalls = parseActionCalls(message.content);

                for (const call of actionCalls) {
                    // Skip user_output as it's just for display
                    if (call.action === 'user_output') {
                        continue;
                    }

                    const execution: ActionExecution = {
                        actionName: call.action,
                        parameters: call.parameters,
                        result: null, // Result would need to be tracked separately
                        timestamp: new Date().toISOString()
                    };

                    // Check if this action was already tracked
                    const alreadyTracked = this.actionsExecuted.some(
                        e => e.actionName === call.action &&
                            JSON.stringify(e.parameters) === JSON.stringify(call.parameters)
                    );

                    if (!alreadyTracked) {
                        this.actionsExecuted.push(execution);
                        this.options.onActionExecuted(execution);
                    }
                }
            }
        }
    }

    /**
     * Extract user outputs from the conversation
     */
    private extractUserOutputs(response: string): void {
        const history = this.agent.getHistory();

        for (const message of history) {
            if (message.role === 'assistant') {
                const actionCalls = parseActionCalls(message.content);

                for (const call of actionCalls) {
                    if (call.action === 'user_output' && call.parameters.message) {
                        const msg = call.parameters.message;
                        if (!this.userOutputs.includes(msg)) {
                            this.userOutputs.push(msg);
                            this.options.onUserOutput(msg);
                        }
                    }
                }
            }
        }

        // Also check the final response
        const actionCalls = parseActionCalls(response);
        for (const call of actionCalls) {
            if (call.action === 'user_output' && call.parameters.message) {
                const msg = call.parameters.message;
                if (!this.userOutputs.includes(msg)) {
                    this.userOutputs.push(msg);
                    this.options.onUserOutput(msg);
                }
            }
        }
    }

    /**
     * Generate automatic notification when actions were executed
     */
    private generateAutoNotification(): string {
        const actionNames = this.actionsExecuted.map(e => e.actionName).join(', ');
        return `Executed actions: ${actionNames}`;
    }

    /**
     * Register default actions
     */
    private registerDefaultActions(): void {
        if (this.options.includeDefaultActions.includes('user_output')) {
            this.agent.registerAction(new UserOutputAction());
        }
        if (this.options.includeDefaultActions.includes('query_llm')) {
            this.agent.registerAction(new QueryLLMAction(this.provider));
        }
    }

    /**
     * Get default system prompt
     */
    private getDefaultSystemPrompt(): string {
        return `You are a helpful AI assistant that can use actions to accomplish tasks.

CRITICAL RULES:
1. ALWAYS use the "user_output" action to send messages to the user - NEVER respond with plain text
2. After gathering information with other actions, use "user_output" to present the results
3. The conversation will automatically end after you call "user_output"

IMPORTANT: You will see a conversation history with multiple messages. The history is for CONTEXT ONLY. 
You should ONLY respond to the MOST RECENT user message. Do NOT respond to previous messages in the history.

When responding to the latest user message, DECIDE whether to:
1. Just use user_output action (for simple questions, greetings, etc.)
2. Use other actions to gather information, THEN use user_output to present results

For example:
- User: "Hello" → {"action": "user_output", "parameters": {"message": "Hello! How can I help you?"}}
- User: "What's 5+5?" → {"action": "user_output", "parameters": {"message": "5+5 equals 10"}}
- User: "Search for TypeScript tutorials" → Use search action, then user_output to summarize
- User: "What's the weather in Paris?" → Use get_weather action, then user_output with the result

Example workflow for multi-step tasks:
User: "What's the weather in Paris?"
You: {"action": "get_weather", "parameters": {"location": "Paris"}}
[System returns weather data]
You: {"action": "user_output", "parameters": {"message": "The weather in Paris is currently sunny, 22°C."}}
[Conversation ends automatically]

Remember: Always end with user_output to communicate results to the user.`;
    }

    /**
     * Get all conversation history from the agent
     */
    getHistory(): Message[] {
        return this.agent.getHistory();
    }

    /**
     * Get all user outputs generated during execution
     */
    getUserOutputs(): string[] {
        return [...this.userOutputs];
    }

    /**
     * Get all actions that were executed
     */
    getActionsExecuted(): ActionExecution[] {
        return [...this.actionsExecuted];
    }

    /**
     * Clear the agent's conversation history
     */
    clearHistory(): void {
        this.agent.clearHistory();
        this.userOutputs = [];
        this.actionsExecuted = [];
    }
}
