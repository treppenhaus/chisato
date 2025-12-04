# Using AgentLoop with a Real LLM

The AgentLoop framework is designed to work with **any LLM provider**. The LLM decides whether to use actions or respond normally.

## How It Works

1. **System Prompt**: AgentLoop automatically sends available actions to the LLM in the system prompt
2. **LLM Decision**: The LLM reads the user's message and decides:
   - Should I just respond normally?
   - Should I use one or more actions?
3. **Action Execution**: If the LLM outputs action JSON, AgentLoop executes those actions
4. **User Notification**: The LLM calls `user_output` to notify the user what happened

## Quick Start with OpenAI

```typescript
import { AgentLoop, ILLMProvider, Message } from "chisato";

class OpenAIProvider implements ILLMProvider {
  constructor(private apiKey: string) {}

  async sendMessage(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    const apiMessages: any[] = [];

    if (systemPrompt) {
      apiMessages.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: apiMessages,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Use it
const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!);
const agent = new AgentLoop(provider);

agent.registerAction(new SearchAction());
await agent.run("Search for TypeScript tutorials");
```

## Anthropic (Claude)

```typescript
class AnthropicProvider implements ILLMProvider {
  constructor(private apiKey: string) {}

  async sendMessage(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    const data = await response.json();
    return data.content[0].text;
  }
}
```

## Local Models (Ollama)

```typescript
class OllamaProvider implements ILLMProvider {
  constructor(private model: string = "llama2") {}

  async sendMessage(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          ...messages,
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    return data.message.content;
  }
}
```

## What Does the LLM See?

When you call `agent.run('Search for TypeScript')`, the LLM receives:

### System Prompt (automatically generated)

```
You are a helpful AI assistant that can use actions to accomplish tasks.

When the user sends a message, DECIDE whether to:
1. Just respond normally (for simple questions, greetings, etc.)
2. Use available actions to help the user

If you use actions, you MUST also call the user_output action afterward to tell the user what you did.

# Available Actions

You have access to the following actions. To use an action, respond with a JSON object in this exact format:
{"action": "action_name", "parameters": {"param1": "value1"}}

### search
Search the internet for information

Parameters:
  - query (string) (required): Search query

### user_output
Output a message to the user. Use this when you want to communicate with the user or provide information.

Parameters:
  - message (string) (required): The message to display to the user

...
```

### User Message

```
Search for TypeScript
```

### LLM Response Example

```
I'll search for TypeScript tutorials for you.

{"action": "search", "parameters": {"query": "TypeScript tutorials"}}

{"action": "user_output", "parameters": {"message": "Found great TypeScript resources including the official handbook and several tutorials!"}}
```

## Testing Without an API Key

Use the `SimulatedLLMProvider` in `test-agent-loop.ts` to test the framework without needing an API key. It simulates how a real LLM would decide.

## Environment Variables

Create a `.env` file:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Then use:

```typescript
const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!);
```

## Best Practices

1. **Clear Action Descriptions**: Help the LLM understand when to use each action
2. **User Notifications**: Always call `user_output` after actions
3. **Error Handling**: Implement proper error handling in your provider
4. **Rate Limiting**: Be mindful of API rate limits
5. **Cost**: GPT-4 is more capable but expensive; GPT-3.5 is cheaper

## Monitoring Actions

Use callbacks to track what the LLM is doing:

```typescript
const agent = new AgentLoop(provider, {
  onActionExecuted: (exec) => {
    console.log(`Action: ${exec.actionName}`, exec.parameters);
  },
  onUserOutput: (msg) => {
    console.log(`Output: ${msg}`);
  },
});
```

## Full Example

See `test-agent-loop.ts` for a complete working example with:

- Real LLM provider (OpenAI)
- Simulated provider (for testing)
- Multiple custom actions
- Complete test scenarios
