import { ILLMProvider, Message } from '../src/index';

/**
 * Example: OpenAI Provider Implementation
 * 
 * This shows how to integrate with OpenAI's API.
 * Install dependencies: npm install openai
 */
export class OpenAIProvider implements ILLMProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        // Build messages array
        const openAIMessages: any[] = [];

        if (systemPrompt) {
            openAIMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        // Add conversation history
        openAIMessages.push(...messages.map(msg => ({
            role: msg.role,
            content: msg.content
        })));

        // Make API call
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: openAIMessages
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}

/**
 * Example: Anthropic Claude Provider Implementation
 * 
 * This shows how to integrate with Anthropic's API.
 * Install dependencies: npm install @anthropic-ai/sdk
 */
export class AnthropicProvider implements ILLMProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        // Convert messages (Anthropic doesn't include system in messages array)
        const anthropicMessages = messages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }));

        // Make API call
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: 4096,
                system: systemPrompt,
                messages: anthropicMessages
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }
}

/**
 * Example: Local LLM Provider (e.g., Ollama)
 * 
 * This shows how to integrate with a local LLM server.
 */
export class LocalLLMProvider implements ILLMProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
        // Build prompt from messages
        let prompt = '';

        if (systemPrompt) {
            prompt += `System: ${systemPrompt}\n\n`;
        }

        for (const msg of messages) {
            prompt += `${msg.role}: ${msg.content}\n`;
        }

        prompt += 'assistant: ';

        // Make API call to Ollama
        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Local LLM API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    }
}

/**
 * Usage example
 */
/*
import { Agent } from '../src/index';
import { OpenAIProvider, AnthropicProvider, LocalLLMProvider } from './custom-provider';

// Use OpenAI
const openai = new OpenAIProvider(process.env.OPENAI_API_KEY!);
const agent1 = new Agent(openai);

// Use Anthropic
const anthropic = new AnthropicProvider(process.env.ANTHROPIC_API_KEY!);
const agent2 = new Agent(anthropic);

// Use local LLM
const local = new LocalLLMProvider();
const agent3 = new Agent(local);
*/
