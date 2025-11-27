import { ActionCall, ActionResult } from '../interfaces/types';

/**
 * Parse action calls from LLM response
 * @param response - The LLM response text
 * @returns Array of parsed action calls
 */
export function parseActionCalls(response: string): ActionCall[] {
    const actionCalls: ActionCall[] = [];

    // Match JSON objects with action and parameters
    const jsonRegex = /\{[\s\S]*?"action"[\s\S]*?"parameters"[\s\S]*?\}/g;
    const matches = response.match(jsonRegex);

    if (!matches) {
        return actionCalls;
    }

    for (const match of matches) {
        try {
            const parsed = JSON.parse(match);
            if (parsed.action && parsed.parameters) {
                actionCalls.push({
                    action: parsed.action,
                    parameters: parsed.parameters
                });
            }
        } catch (e) {
            // Invalid JSON, skip this match
            continue;
        }
    }

    return actionCalls;
}

/**
 * Format action results for inclusion in the next LLM message
 * @param results - Array of action results
 * @returns Formatted string
 */
export function formatActionResults(results: ActionResult[]): string {
    if (results.length === 0) {
        return '';
    }

    const formatted = results.map(result => {
        if (result.success) {
            return `Action '${result.action}' completed successfully. Result: ${JSON.stringify(result.result)}`;
        } else {
            return `Action '${result.action}' failed. Error: ${result.error}`;
        }
    }).join('\n');

    return `Action results:\n${formatted}`;
}
