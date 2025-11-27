import { Message } from './types';

/**
 * Interface for LLM providers
 * Implement this to integrate any LLM service (OpenAI, Anthropic, local models, etc.)
 */
export interface ILLMProvider {
    /**
     * Send a message to the LLM and get a response
     * @param messages - Conversation history
     * @param systemPrompt - Optional system prompt
     * @returns The LLM's response as a string
     */
    sendMessage(messages: Message[], systemPrompt?: string): Promise<string>;
}
