import { ActionCall, ActionResult } from '../interfaces/types';

/**
 * Parse action calls from LLM response
 * Handles nested JSON objects properly by tracking brace count
 */
export function parseActionCalls(response: string): ActionCall[] {
    const actionCalls: ActionCall[] = [];
    
    // Parse character by character to find complete JSON objects
    // this is needed because the LLM would produce wrong json from time to time and
    // we also need to parse / adjust for lazy json which is missing brackets
    let inJson = false;
    let braceCount = 0;
    let currentJson = '';

    for (let i = 0; i < response.length; i++) {
        const char = response[i];
        
        if (char === '{') {
            if (!inJson) {
                inJson = true;
                braceCount = 1;
                currentJson = '{';
            } else {
                braceCount++;
                currentJson += char;
            }
        } else if (char === '}' && inJson) {
            currentJson += char;
            braceCount--;
            
            if (braceCount === 0) {
                // Complete JSON object found
                if (currentJson.includes('"action"') && currentJson.includes('"parameters"')) {
                    try {
                        const parsed = JSON.parse(currentJson);
                        if (parsed.action && parsed.parameters) {
                            actionCalls.push({
                                action: parsed.action,
                                parameters: parsed.parameters
                            });
                        }
                    } catch (e) {
                        // Invalid JSON, skip
                        continue;
                    }
                }
                inJson = false;
                currentJson = '';
            }
        } else if (inJson) {
            currentJson += char;
        }
    }

    return actionCalls;
}

/**
 * Check if the response contains the "DONE" signal
 * This indicates the LLM has finished and should not be looped further
 */
export function isDoneSignal(response: string): boolean {
    // Check if response contains "DONE" on its own line or at the end
    const trimmed = response.trim();
    return trimmed === 'DONE' || trimmed.endsWith('\nDONE') || /\bDONE\s*$/i.test(trimmed);
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
