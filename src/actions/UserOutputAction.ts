import { IAction } from '../interfaces/IAction';
import { ParameterDefinition } from '../interfaces/types';

/**
 * Built-in action for outputting messages to the user
 * This allows the LLM to send messages that should be displayed to the user
 */
export class UserOutputAction implements IAction {
    name = 'user_output';
    description = 'Output a message to the user. Use this when you want to communicate with the user or provide information.';
    parameters: ParameterDefinition[] = [
        {
            name: 'message',
            type: 'string',
            description: 'The message to display to the user',
            required: true
        }
    ];

    async execute(params: Record<string, any>): Promise<any> {
        return {
            type: 'user_output',
            message: params.message,
            timestamp: new Date().toISOString()
        };
    }
}
