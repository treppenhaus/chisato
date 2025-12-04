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
            systemPromptPrefix: options.systemPromptPrefix || '',
            maxRetries: options.maxRetries,
            maxActionRetries: options.maxActionRetries,
            onInvalidOutput: options.onInvalidOutput,
            onActionRetry: options.onActionRetry,
            onActionMaxRetries: options.onActionMaxRetries
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

            // Try to get a valid response from LLM with retries
            let response: string = '';
            let validResponse = false;
            const maxRetries = this.options.maxRetries || 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    // Get agentic response from LLM (with action capabilities)
                    response = await this.provider.sendAgenticMessage(
                        this.conversationHistory,
                        systemPrompt
                    );

                    // Validate the response is not empty
                    if (!response || response.trim().length === 0) {
                        throw new Error('LLM returned empty response');
                    }

                    // Validate the response
                    const testParse = parseActionCalls(response);
                    
                    // Check if response looks like it's trying to call actions but failed to parse
                    const looksLikeAction = response.includes('"action"') && response.includes('"parameters"');
                    
                    if (looksLikeAction && testParse.length === 0) {
                        // Response contains action structure but parsing failed
                        throw new Error('Response appears to contain malformed action JSON');
                    }

                    validResponse = true;
                    break; // Success!

                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    
                    // Call the invalid output callback
                    if (this.options.onInvalidOutput) {
                        this.options.onInvalidOutput(attempt, errorMsg, response);
                    }

                    if (attempt === maxRetries) {
                        // Last attempt failed, throw error
                        throw new Error(`LLM produced invalid output after ${maxRetries} attempts. Last error: ${errorMsg}`);
                    }

                    // Wait a bit before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, attempt * 500));
                }
            }

            if (!validResponse) {
                throw new Error('Failed to get valid response from LLM');
            }

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

            // Check if user_output action was called - if so, we're done
            // This means the agent has communicated the result to the user
            const hasUserOutput = actionCalls.some(call => call.action === 'user_output');
            if (hasUserOutput) {
                finalResponse = response;
                break;
            }

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
     * Execute multiple actions with retry logic
     * @private
     */
    private async _executeActions(actionCalls: ActionCall[]): Promise<ActionResult[]> {
        const results: ActionResult[] = [];
        const maxActionRetries = this.options.maxActionRetries || 2;

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

            // Retry logic for action execution
            let actionSuccess = false;
            let lastError = '';

            for (let attempt = 1; attempt <= maxActionRetries; attempt++) {
                try {
                    const result = await action.execute(call.parameters);
                    results.push({
                        action: call.action,
                        success: true,
                        result
                    });
                    actionSuccess = true;
                    break; // Success!

                } catch (error) {
                    lastError = error instanceof Error ? error.message : String(error);

                    // Call retry callback
                    if (attempt < maxActionRetries && this.options.onActionRetry) {
                        this.options.onActionRetry(call.action, attempt, lastError);
                    }

                    if (attempt === maxActionRetries) {
                        // Max retries reached
                        if (this.options.onActionMaxRetries) {
                            this.options.onActionMaxRetries(call.action, lastError);
                        }

                        results.push({
                            action: call.action,
                            success: false,
                            error: `Action failed after ${maxActionRetries} attempts: ${lastError}`
                        });
                    } else {
                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, attempt * 300));
                    }
                }
            }
        }

        return results;
    }
}
