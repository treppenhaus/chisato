# Retry Functionality for Invalid LLM Output

## Overview

Chisato includes built-in retry logic to handle cases where the LLM produces invalid or malformed output. This is especially useful when working with real LLMs that occasionally produce incomplete JSON or malformed action calls.

## Features

- **Automatic Retries**: Automatically retries up to 3 times (configurable) when invalid output is detected
- **Exponential Backoff**: Waits progressively longer between retries (500ms, 1000ms, 1500ms)
- **Callback Notification**: Get notified each time invalid output is detected
- **Validation**: Automatically validates action JSON before attempting to parse

## Configuration

```typescript
import { AgentLoop } from "chisato";

const agentLoop = new AgentLoop(provider, {
  maxRetries: 3, // Number of retry attempts (default: 3)

  onInvalidOutput: (attempt, error, output) => {
    console.log(`❌ Invalid output on attempt ${attempt}`);
    console.log(`   Error: ${error}`);
    console.log(`   Output: ${output.substring(0, 100)}...`);

    // Log to monitoring service
    // sendToMonitoring({ attempt, error, output });
  },
});
```

## What Gets Retried?

The system retries when:

1. LLM produces malformed JSON that can't be parsed
2. Response contains `"action"` and `"parameters"` but parsing fails
3. Action structure is incomplete (missing closing braces, etc.)

## Example: Handling Flaky LLM

```typescript
import { AgentLoop, ILLMProvider, Message } from "chisato";

class MyProvider implements ILLMProvider {
  async sendAgenticMessage(messages: Message[]): Promise<string> {
    // Call your LLM API (might produce invalid output occasionally)
    return await callOpenAI(messages);
  }

  async sendMessage(messages: Message[]): Promise<string> {
    return await callOpenAI(messages);
  }
}

let retryCount = 0;

const agent = new AgentLoop(new MyProvider(), {
  maxRetries: 5, // Try up to 5 times

  onInvalidOutput: (attempt, error, output) => {
    retryCount++;
    console.warn(`Retry ${attempt}: ${error}`);

    if (attempt === 5) {
      // Last attempt - notify admins
      sendAlert("LLM producing invalid output consistently");
    }
  },

  onActionExecuted: (exec) => {
    console.log(`✓ Action ${exec.actionName} executed successfully`);
  },
});

try {
  const result = await agent.run("Search for TypeScript");
  console.log(`Success after ${retryCount} retries`);
} catch (error) {
  console.error("Failed after all retries:", error);
}
```

## Retry Behavior

### Attempt 1

- Execute LLM call
- Validate response
- If invalid: wait 500ms, retry

### Attempt 2

- Execute LLM call
- Validate response
- If invalid: wait 1000ms, retry

### Attempt 3 (final)

- Execute LLM call
- Validate response
- If invalid: throw error

## Callback Parameters

### onInvalidOutput(attempt, error, output)

**attempt** (number): Which retry attempt (1, 2, 3, etc.)

**error** (string): Description of what went wrong

- `"Response appears to contain malformed action JSON"`
- `"JSON parse error: ..."`

**output** (string): The actual invalid output from the LLM

## Use Cases

### 1. Monitoring & Logging

```typescript
onInvalidOutput: (attempt, error, output) => {
  logger.warn("LLM_INVALID_OUTPUT", {
    attempt,
    error,
    outputLength: output.length,
    timestamp: new Date().toISOString(),
  });
};
```

### 2. Fallback Logic

```typescript
let invalidCount = 0;

onInvalidOutput: (attempt, error, output) => {
  invalidCount++;

  if (invalidCount > 10) {
    // Too many failures, switch to backup LLM
    agentLoop.provider = new BackupProvider();
  }
};
```

### 3. User Feedback

```typescript
onInvalidOutput: (attempt, error) => {
  if (attempt === 1) {
    showToUser("Processing... (retrying)");
  }
};
```

## Best Practices

1. **Don't set maxRetries too high**: 3-5 is usually sufficient
2. **Log invalid outputs**: They help debug LLM issues
3. **Monitor retry rates**: High retry rates indicate LLM problems
4. **Use exponential backoff**: Default timing works well for most cases
5. **Provide user feedback**: Let users know retries are happening

## Disabling Retries

Set `maxRetries: 1` to disable retries:

```typescript
const agent = new AgentLoop(provider, {
  maxRetries: 1, // Fail immediately on invalid output
  onInvalidOutput: (_, error) => {
    console.error("No retries, failing fast:", error);
  },
});
```

## See Also

- `examples/retry-example.ts` - Full working example
- `ILLMPROVIDER_GUIDE.md` - LLM provider implementation guide
- `src/Agent.ts` - Retry implementation details
