# Chisato

**GitHub Repository:** [https://github.com/treppenhaus/chisato](https://github.com/treppenhaus/chisato)

A lightweight, extensible TypeScript framework for building LLM-powered agents with custom actions and pluggable LLM providers.

## What's New in Version 1.0.1

- **AgentLoop System**: Autonomous task execution with automatic action recognition
- **Dual LLM Methods**: Separate `sendAgenticMessage` and `sendMessage` for better control
- **LLM-Driven Decisions**: Let the LLM decide when to use actions vs. normal responses
- **Retry System**: Automatic retry logic for both LLM failures and action failures
- **Action Tracking**: Full visibility into executed actions with callbacks
- **Enhanced Error Handling**: Comprehensive error handling with exponential backoff
- **Default Actions**: Built-in `user_output` and `query_llm` actions

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Core Concepts](#core-concepts)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Provider Agnostic**: Use any LLM service (OpenAI, Anthropic, local models, etc.)
- **Simple API**: Easy to use and integrate into your projects
- **Custom Actions**: Create your own agent capabilities with a simple interface
- **Automatic Action Handling**: Actions are automatically added to system prompts and executed
- **Conversation Loop**: Handles multi-turn interactions with automatic action execution
- **Agent Loop**: Break down complex tasks into steps and execute them autonomously
- **LLM-Driven**: Let the LLM intelligently decide when to use actions
- **Retry Logic**: Automatic retries for LLM errors and action failures
- **Full Visibility**: Track all actions and retries with callbacks
- **TypeScript First**: Full type safety and IntelliSense support

## Quick Start

```typescript
import { Agent, ILLMProvider, IAction, Message } from "chisato";

// 1. Implement your LLM provider
class MyLLMProvider implements ILLMProvider {
  async sendAgenticMessage(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    // For agentic calls (with actions)
    return await callYourLLM(messages, systemPrompt);
  }

  async sendMessage(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    // For normal chat (no actions)
    return await callYourLLM(messages, systemPrompt);
  }
}

// 2. Create custom actions
class CalculatorAction implements IAction {
  name = "calculator";
  description = "Perform mathematical calculations";
  parameters = [
    {
      name: "expression",
      type: "string" as const,
      description: "Mathematical expression to evaluate",
      required: true,
    },
  ];

  async execute(params: Record<string, any>): Promise<any> {
    const result = eval(params.expression);
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

## Documentation

### Guides

- [ILLMProvider Guide](./ILLMPROVIDER_GUIDE.md) - Understanding the two LLM methods
- [Using Real LLMs](./USING_REAL_LLM.md) - Integration with OpenAI, Anthropic, Ollama
- [Retry System Guide](./RETRY_GUIDE.md) - Handling failures and retries
- [AgentLoop Design](./AGENT_LOOP_DESIGN.md) - How autonomous task execution works
- [Quick Reference](./QUICK_REFERENCE.md) - Quick API reference
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Implementation details

### Key Concepts

**Two Types of LLM Calls:**

1. **Agentic Messages** (`sendAgenticMessage`): Used when the LLM should have access to actions and can decide whether to use them
2. **Normal Messages** (`sendMessage`): Used for simple chat without action capabilities

**Retry System:**

- Automatic retry for LLM failures (empty responses, malformed JSON, API errors)
- Automatic retry for action execution failures
- Configurable retry limits and backoff strategies
- Callbacks for monitoring and alerting

## Core Concepts

### How It Works

1. You send a message to the agent using `agent.chat()`
2. The agent builds a system prompt that includes descriptions of all registered actions
3. The LLM responds, potentially including action calls in JSON format
4. The agent parses the response and automatically executes any requested actions
5. Action results are fed back to the LLM
6. Steps 3-5 repeat until the LLM provides a final response without actions

### Creating Custom Actions

Implement the `IAction` interface:

```typescript
import { IAction } from "chisato";

class WeatherAction implements IAction {
  name = "get_weather";
  description = "Get current weather for a location";
  parameters = [
    {
      name: "location",
      type: "string" as const,
      description: "City name or coordinates",
      required: true,
    },
  ];

  async execute(params: Record<string, any>): Promise<any> {
    const weather = await fetchWeatherAPI(params.location);
    return {
      temperature: weather.temp,
      condition: weather.condition,
    };
  }
}

agent.registerAction(new WeatherAction());
```

### Agent Loop - Autonomous Task Execution

The `AgentLoop` class enables autonomous task breakdown and execution:

```typescript
import { AgentLoop } from "chisato";

const agentLoop = new AgentLoop(provider, {
  includeDefaultActions: true,
  maxSteps: 20,
  maxRetries: 3,
  maxActionRetries: 2,
  onUserOutput: (message) => console.log("Agent:", message),
  onActionExecuted: (action) => console.log("Executed:", action.actionName),
  onActionRetry: (name, attempt, error) =>
    console.log(`Retry ${name}: ${attempt}`),
});

// Register custom actions
agentLoop.registerAction(new SearchAction());
agentLoop.registerAction(new WeatherAction());

// Run a complex task - the LLM decides which actions to use
const result = await agentLoop.run(
  "Search for TypeScript tutorials and summarize"
);
```

### Retry Configuration

```typescript
const agentLoop = new AgentLoop(provider, {
  // LLM retry options
  maxRetries: 3, // Retry LLM calls up to 3 times

  onInvalidOutput: (attempt, error, output) => {
    console.log(`LLM retry ${attempt}: ${error}`);
  },

  // Action retry options
  maxActionRetries: 2, // Retry each action up to 2 times

  onActionRetry: (actionName, attempt, error) => {
    console.log(`Action ${actionName} retry ${attempt}: ${error}`);
  },

  onActionMaxRetries: (actionName, error) => {
    console.error(`Action ${actionName} failed permanently: ${error}`);
  },
});
```

## Examples

See the [examples](./examples) directory for complete working examples:

- `basic-usage.ts` - Simple agent with a calculator action
- `custom-provider.ts` - Example LLM provider implementation
- `agent-loop-example.ts` - Comprehensive AgentLoop examples
- `action-retry-example.ts` - Demonstrating retry functionality

## API Reference

### Agent

Main agent class for building conversational agents.

**Constructor:**

```typescript
new Agent(provider: ILLMProvider, options?: AgentOptions)
```

**Methods:**

- `registerAction(action: IAction): void` - Register an action
- `chat(userMessage: string): Promise<string>` - Send a message and get a response
- `getHistory(): Message[]` - Get conversation history
- `clearHistory(): void` - Clear conversation history

**Options:**

```typescript
interface AgentOptions {
  maxIterations?: number; // Maximum conversation loops (default: 10)
  systemPromptPrefix?: string; // Custom system prompt prefix
  maxRetries?: number; // Max LLM retries (default: 3)
  maxActionRetries?: number; // Max action retries (default: 2)
  onInvalidOutput?: (attempt: number, error: string, output: string) => void;
  onActionRetry?: (actionName: string, attempt: number, error: string) => void;
  onActionMaxRetries?: (actionName: string, error: string) => void;
}
```

### AgentLoop

Main class for autonomous task execution with automatic action recognition.

**Constructor:**

```typescript
new AgentLoop(provider: ILLMProvider, options?: AgentLoopOptions)
```

**Methods:**

- `registerAction(action: IAction): void` - Register an action
- `run(task: string): Promise<AgentLoopResult>` - Execute a task
- `getHistory(): Message[]` - Get conversation history
- `getUserOutputs(): string[]` - Get all user outputs
- `getActionsExecuted(): ActionExecution[]` - Get all executed actions

**Options:**

```typescript
interface AgentLoopOptions {
  maxSteps?: number; // Maximum steps (default: 10)
  includeDefaultActions?: boolean; // Include user_output and query_llm (default: true)
  systemPrompt?: string; // Custom system prompt
  maxRetries?: number; // Max LLM retries (default: 3)
  maxActionRetries?: number; // Max action retries (default: 2)
  onStepComplete?: (step: AgentStep) => void;
  onUserOutput?: (message: string) => void;
  onActionExecuted?: (execution: ActionExecution) => void;
  onInvalidOutput?: (attempt: number, error: string, output: string) => void;
  onActionRetry?: (actionName: string, attempt: number, error: string) => void;
  onActionMaxRetries?: (actionName: string, error: string) => void;
}
```

### ILLMProvider

Interface for LLM providers.

**Methods:**

- `sendAgenticMessage(messages: Message[], systemPrompt?: string): Promise<string>` - For agentic calls
- `sendMessage(messages: Message[], systemPrompt?: string): Promise<string>` - For normal chat

See [ILLMPROVIDER_GUIDE.md](./ILLMPROVIDER_GUIDE.md) for detailed information.

### IAction

Interface for actions.

**Properties:**

- `name: string` - Unique action name
- `description: string` - What the action does
- `parameters: ParameterDefinition[]` - Parameter definitions

**Methods:**

- `execute(params: Record<string, any>): Promise<any>` - Execute the action

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests on [GitHub](https://github.com/treppenhaus/chisato).
