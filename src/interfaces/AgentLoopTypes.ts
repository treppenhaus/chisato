/**
 * Represents a step in the agent loop workflow
 */
export interface AgentStep {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    action?: string;
    actionParams?: Record<string, any>;
    result?: any;
    error?: string;
}

/**
 * Information about an action execution
 */
export interface ActionExecution {
    actionName: string;
    parameters: Record<string, any>;
    result: any;
    timestamp: string;
}

/**
 * Configuration options for the agent loop
 */
export interface AgentLoopOptions {
    /** Maximum number of steps to execute */
    maxSteps?: number;
    /** Whether to include default actions (user_output, query_llm) */
    includeDefaultActions?: boolean;
    /** Custom system prompt for the agent */
    systemPrompt?: string;
    /** Callback for when a step is completed */
    onStepComplete?: (step: AgentStep) => void;
    /** Callback for when user output is generated */
    onUserOutput?: (message: string) => void;
    /** Callback for when an action is executed */
    onActionExecuted?: (execution: ActionExecution) => void;
}

/**
 * Result of the agent loop execution
 */
export interface AgentLoopResult {
    outputs: string[];
    actionsExecuted: ActionExecution[];
    success: boolean;
    error?: string;
}
