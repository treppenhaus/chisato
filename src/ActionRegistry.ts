import { IAction } from './interfaces/IAction';

/**
 * Registry for managing actions
 */
export class ActionRegistry {
    private actions: Map<string, IAction> = new Map();

    /**
     * Register a new action
     * @param action - The action to register
     */
    registerAction(action: IAction): void {
        if (this.actions.has(action.name)) {
            throw new Error(`Action with name '${action.name}' is already registered`);
        }
        this.actions.set(action.name, action);
    }

    /**
     * Get an action by name
     * @param name - The name of the action
     * @returns The action or undefined if not found
     */
    getAction(name: string): IAction | undefined {
        return this.actions.get(name);
    }

    /**
     * Get all registered actions
     * @returns Array of all actions
     */
    getActions(): IAction[] {
        return Array.from(this.actions.values());
    }

    /**
     * Generate a system prompt section describing all available actions
     * @returns Formatted string describing actions in a way the LLM can understand
     */
    generateActionPrompt(): string {
        if (this.actions.size === 0) {
            return '';
        }

        const actionDescriptions = this.getActions().map(action => {
            const params = action.parameters.map(p => {
                const required = p.required !== false ? ' (required)' : ' (optional)';
                return `  - ${p.name} (${p.type})${required}: ${p.description}`;
            }).join('\n');

            return `### ${action.name}
${action.description}

Parameters:
${params || '  None'}`;
        }).join('\n\n');

        return `# Available Actions

You have access to the following actions. To use an action, respond with a JSON object in this exact format:
{"action": "action_name", "parameters": {"param1": "value1", "param2": "value2"}}

You can call multiple actions by including multiple JSON objects in your response.

${actionDescriptions}

Remember: Always use the exact JSON format shown above when calling actions.`;
    }
}
