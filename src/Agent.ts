import { ILLMProvider } from './interfaces/ILLMProvider';
import { IAction } from './interfaces/IAction';
import { Message, ActionCall, ActionResult, AgentOptions } from './interfaces/types';
import { ActionRegistry } from './ActionRegistry';
import { parseActionCalls, formatActionResults } from './utils/parser';

/**
 * Main agent class that orchestrates LLM interaction with actions
 */
export class Agent {
    private provider: ILLMProvider;
    private registry: ActionRegistry;
    private conversationHistory: Message[] = [];
    private options: AgentOptions;

    /**
     * Create a new agent
     * @param provider - LLM provider implementation
     * @param options - Optional configuration
     */
    constructor(provider: ILLMProvider, options: AgentOptions = {}) {
        this.provider = provider;
        this.registry = new ActionRegistry();
        this.options = {
            maxIterations: options.maxIterations || 10,
            systemPromptPrefix: options.systemPromptPrefix || ''
        };
    }

    /**
     * Register an action with the agent
     * @param action - The action to register
     */
    registerAction(action: IAction): void {
        this.registry.registerAction(action);
    }

    /**
     * Send a message and handle the conversation loop
     * @param userMessage - The user's message
     * @returns The final response from the LLM
     */
    async chat(userMessage: string): Promise<string> {
        // Add user message to history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        let iterations = 0;
        let finalResponse = '';

        while (iterations < this.options.maxIterations!) {
            iterations++;

            // Build system prompt with actions
            const systemPrompt = this._buildSystemPrompt();

            // Get agentic response from LLM (with action capabilities)
            const response = await this.provider.sendAgenticMessage(
                this.conversationHistory,
                systemPrompt
            );

            // Add assistant response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response
            });

            // Parse for action calls
            const actionCalls = parseActionCalls(response);

            if (actionCalls.length === 0) {
                // No actions, this is the final response
                finalResponse = response;
                break;
            }

            // Execute actions
            const actionResults = await this._executeActions(actionCalls);

            // Format results and add to conversation
            const resultsMessage = formatActionResults(actionResults);
            this.conversationHistory.push({
                role: 'user',
                content: resultsMessage
            });
        }

        if (iterations >= this.options.maxIterations!) {
            throw new Error(`Maximum iterations (${this.options.maxIterations}) reached`);
        }

        return finalResponse;
    }

    /**
     * Get the conversation history
     * @returns Array of messages
     */
    getHistory(): Message[] {
        return [...this.conversationHistory];
    }

    /**
     * Clear the conversation history
     */
    clearHistory(): void {
        this.conversationHistory = [];
    }

    /**
     * Build the system prompt with action descriptions
     * @private
     */
    private _buildSystemPrompt(): string {
        const actionPrompt = this.registry.generateActionPrompt();

        if (!actionPrompt) {
            return this.options.systemPromptPrefix || '';
        }

        if (this.options.systemPromptPrefix) {
            return `${this.options.systemPromptPrefix}\n\n${actionPrompt}`;
        }

        return actionPrompt;
    }

    /**
     * Execute multiple actions
     * @private
     */
    private async _executeActions(actionCalls: ActionCall[]): Promise<ActionResult[]> {
        const results: ActionResult[] = [];

        for (const call of actionCalls) {
            const action = this.registry.getAction(call.action);

            if (!action) {
                results.push({
                    action: call.action,
                    success: false,
                    error: `Action '${call.action}' not found`
                });
                continue;
            }

            try {
                const result = await action.execute(call.parameters);
                results.push({
                    action: call.action,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    action: call.action,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return results;
    }
}
