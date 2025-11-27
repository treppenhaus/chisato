# Chisato 

A lightweight, extensible TypeScript framework for building LLM-powered agents with custom actions and pluggable LLM providers.

## Features

- **Provider Agnostic**: Use any LLM service (OpenAI, Anthropic, local models, etc.)
- **Simple API**: Easy to use and integrate into your projects
- **Custom Actions**: Create your own agent capabilities with a simple interface
- **Automatic Action Handling**: Actions are automatically added to system prompts and executed
- **Conversation Loop**: Handles multi-turn interactions with automatic action execution
- **TypeScript First**: Full type safety and IntelliSense support


## Quick Start

```typescript
import { Agent, ILLMProvider, IAction, Message } from 'chisato';

// 1. Implement your LLM provider
class MyLLMProvider implements ILLMProvider {
  async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
    // Your LLM API call here
    // For example, using OpenAI, Anthropic, or any other service
    return "LLM response";
  }
}

// 2. Create custom actions
class CalculatorAction implements IAction {
  name = 'calculator';
  description = 'Perform mathematical calculations';
  parameters = [
    {
      name: 'expression',
      type: 'string' as const,
      description: 'Mathematical expression to evaluate',
      required: true
    }
  ];

  async execute(params: Record<string, any>): Promise<any> {
    const result = eval(params.expression); // Use a safe evaluator in production!
    return { result };
  }
}

// 3. Create and configure your agent
const provider = new MyLLMProvider();
const agent = new Agent(provider);

// 4. Register actions
agent.registerAction(new CalculatorAction());

// 5. Start chatting!
const response = await agent.chat("What is 15 * 23?");
console.log(response);
```

## How It Works

1. **You send a message** to the agent using `agent.chat()`
2. **The agent builds a system prompt** that includes descriptions of all registered actions
3. **The LLM responds**, potentially including action calls in JSON format: `{"action": "name", "parameters": {...}}`
4. **The agent parses the response** and automatically executes any requested actions
5. **Action results are fed back** to the LLM
6. **Steps 3-5 repeat** until the LLM provides a final response without actions

## Creating a Custom LLM Provider

Implement the `ILLMProvider` interface:

```typescript
import { ILLMProvider, Message } from 'chisato';

class OpenAIProvider implements ILLMProvider {
  constructor(private apiKey: string) {}

  async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
    // Convert to your LLM's format
    const openAIMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    if (systemPrompt) {
      openAIMessages.unshift({ role: 'system', content: systemPrompt });
    }

    // Make API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: openAIMessages
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

## Creating Custom Actions

Implement the `IAction` interface:

```typescript
import { IAction } from 'chisato';

class WeatherAction implements IAction {
  name = 'get_weather';
  description = 'Get current weather for a location';
  parameters = [
    {
      name: 'location',
      type: 'string' as const,
      description: 'City name or coordinates',
      required: true
    },
    {
      name: 'units',
      type: 'string' as const,
      description: 'Temperature units (celsius or fahrenheit)',
      required: false
    }
  ];

  async execute(params: Record<string, any>): Promise<any> {
    // Your implementation here
    const weather = await fetchWeatherAPI(params.location, params.units);
    return {
      temperature: weather.temp,
      condition: weather.condition,
      humidity: weather.humidity
    };
  }
}

// Use it
agent.registerAction(new WeatherAction());
```

## Configuration Options

```typescript
const agent = new Agent(provider, {
  maxIterations: 10,  // Maximum conversation loops (default: 10)
  systemPromptPrefix: 'You are a helpful assistant.'  // Custom system prompt prefix
});
```

## API Reference

### `Agent`

Main agent class.

**Constructor:**
```typescript
new Agent(provider: ILLMProvider, options?: AgentOptions)
```

**Methods:**
- `registerAction(action: IAction): void` - Register an action
- `chat(userMessage: string): Promise<string>` - Send a message and get a response
- `getHistory(): Message[]` - Get conversation history
- `clearHistory(): void` - Clear conversation history

### `ILLMProvider`

Interface for LLM providers.

**Methods:**
- `sendMessage(messages: Message[], systemPrompt?: string): Promise<string>`

### `IAction`

Interface for actions.

**Properties:**
- `name: string` - Unique action name
- `description: string` - What the action does
- `parameters: ParameterDefinition[]` - Parameter definitions

**Methods:**
- `execute(params: Record<string, any>): Promise<any>` - Execute the action

## Examples

See the [examples](./examples) directory for complete working examples:

- `basic-usage.ts` - Simple agent with a calculator action
- `custom-provider.ts` - Example LLM provider implementation

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
