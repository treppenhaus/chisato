/**
 * Represents a message in the conversation
 */
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Parameter definition for an action
 */
export interface ParameterDefinition {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
}

/**
 * Represents an action call parsed from LLM response
 */
export interface ActionCall {
    action: string;
    parameters: Record<string, any>;
}

/**
 * Result of an action execution
 */
export interface ActionResult {
    action: string;
    success: boolean;
    result?: any;
    error?: string;
}

/**
 * Configuration options for the agent
 */
export interface AgentOptions {
    maxIterations?: number;
    systemPromptPrefix?: string;
}
