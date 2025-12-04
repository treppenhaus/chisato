import { IAction } from '../interfaces/IAction';
import { ParameterDefinition } from '../interfaces/types';
import { ILLMProvider } from '../interfaces/ILLMProvider';
import { Message } from '../interfaces/types';

/**
 * Built-in action that allows the agent to query the LLM
 * This enables the agent to ask questions or get clarifications during execution
 */
export class QueryLLMAction implements IAction {
    name = 'query_llm';
    description = 'Query the LLM for additional information, clarification, or to break down complex tasks.';
    parameters: ParameterDefinition[] = [
        {
            name: 'prompt',
            type: 'string',
            description: 'The question or prompt to send to the LLM',
            required: true
        },
        {
            name: 'context',
            type: 'string',
            description: 'Optional context to provide with the query',
            required: false
        }
    ];

    private provider: ILLMProvider;

    constructor(provider: ILLMProvider) {
        this.provider = provider;
    }

    async execute(params: Record<string, any>): Promise<any> {
        const messages: Message[] = [];

        // Add context if provided
        if (params.context) {
            messages.push({
                role: 'system',
                content: params.context
            });
        }

        // Add the query
        messages.push({
            role: 'user',
            content: params.prompt
        });

        const response = await this.provider.sendMessage(messages);

        return {
            type: 'llm_query',
            prompt: params.prompt,
            response: response,
            timestamp: new Date().toISOString()
        };
    }
}
