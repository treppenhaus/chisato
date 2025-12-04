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
    /** Max retries for LLM calls when output is invalid */
    maxRetries?: number;
    /** Max retries per action execution when action fails */
    maxActionRetries?: number;
    /** Callback when LLM produces invalid output */
    onInvalidOutput?: (attempt: number, error: string, output: string) => void;
    /** Callback when action execution is retried */
    onActionRetry?: (actionName: string, attempt: number, error: string) => void;
    /** Callback when action reaches max retries */
    onActionMaxRetries?: (actionName: string, error: string) => void;
}
