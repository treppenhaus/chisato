import { ParameterDefinition } from './types';

/**
 * Interface for actions that the agent can execute
 * Implement this to create custom agent capabilities
 */
export interface IAction {
    /**
     * Unique name for the action
     */
    name: string;

    /**
     * Description of what the action does
     */
    description: string;

    /**
     * Parameter definitions for the action
     */
    parameters: ParameterDefinition[];

    /**
     * Execute the action with given parameters
     * @param params - Parameters for the action
     * @returns Result of the action execution
     */
    execute(params: Record<string, any>): Promise<any>;
}
