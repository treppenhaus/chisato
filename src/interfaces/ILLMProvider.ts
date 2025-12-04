import { Message } from './types';

/**
 * Interface for LLM providers
 * Implement this to integrate any LLM service (OpenAI, Anthropic, local models, etc.)
 */
export interface ILLMProvider {
    /**
     * Send a message to the LLM and get an agentic response.
     * 
     * This method is used by AgentLoop when the LLM should have access to actions.
     * The system prompt will include available actions, and the LLM can decide
     * whether to use them or respond normally.
     * 
     * @param messages - Conversation history
     * @param systemPrompt - System prompt including available actions
     * @returns The LLM's response, potentially including action calls in JSON format
     */
    sendAgenticMessage(messages: Message[], systemPrompt?: string): Promise<string>;

    /**
     * Send a message to the LLM and get a normal response.
     * 
     * This method is used by Agent for regular chat interactions where the LLM
     * should NOT have access to actions. Use this for simple question-answering,
     * conversations, or when you don't want the LLM to use actions.
     * 
     * @param messages - Conversation history
     * @param systemPrompt - Optional system prompt (without action definitions)
     * @returns The LLM's response as plain text
     */
    sendMessage(messages: Message[], systemPrompt?: string): Promise<string>;
}
