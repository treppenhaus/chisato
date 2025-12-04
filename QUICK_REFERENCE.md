# Chisato AgentLoop - Quick Reference

## Installation

```bash
npm install @treppenhaus/chisato
```

## Basic Setup

```typescript
import { AgentLoop, ILLMProvider, Message } from "chisato";

// 1. Create your LLM provider
class MyProvider implements ILLMProvider {
  async sendMessage(messages: Message[]): Promise<string> {
    // Your LLM API call
    return "response";
  }
}

// 2. Create AgentLoop
const loop = new AgentLoop(new MyProvider());

// 3. Run tasks
const result = await loop.run("Your task here");
```

## Common Patterns

### Pattern 1: Basic Autonomous Task

```typescript
const agentLoop = new AgentLoop(provider);
const result = await agentLoop.run("Create a project plan");

console.log(result.steps); // All steps executed
console.log(result.outputs); // All user outputs
console.log(result.success); // true/false
```

### Pattern 2: Interactive Chat

```typescript
const chat = new AgentLoop(provider, {
  onUserOutput: (msg) => {
    console.log("🤖 Agent:", msg);
  },
});

// User can send messages naturally
await chat.run("Hello, how can you help?");
await chat.run("Search for TypeScript tutorials");
await chat.run("Tell me about the first result");
```

### Pattern 3: Progress Tracking

```typescript
const loop = new AgentLoop(provider, {
  onStepComplete: (step) => {
    console.log(`✓ ${step.description} [${step.status}]`);
  },
  onUserOutput: (msg) => {
    console.log(`💬 ${msg}`);
  },
});
```

### Pattern 4: Custom Actions

```typescript
import { IAction, ParameterDefinition } from "chisato";

class MyAction implements IAction {
  name = "my_action";
  description = "What it does";
  parameters: ParameterDefinition[] = [
    {
      name: "param1",
      type: "string",
      description: "Parameter description",
      required: true,
    },
  ];

  async execute(params: Record<string, any>) {
    // Your implementation
    return { result: "success" };
  }
}

const loop = new AgentLoop(provider);
loop.registerAction(new MyAction());
```

## Configuration Options

```typescript
const loop = new AgentLoop(provider, {
  // Maximum steps to execute
  maxSteps: 20,

  // Include default actions (user_output, query_llm)
  includeDefaultActions: true,

  // Custom task breakdown prompt
  taskBreakdownPrompt: "Break down this task...",

  // Step completion callback
  onStepComplete: (step) => {
    console.log(step);
  },

  // User output callback
  onUserOutput: (message) => {
    console.log(message);
  },
});
```

## Default Actions

### user_output

```typescript
// LLM calls this to output to user
{"action": "user_output", "parameters": {"message": "Hello!"}}
```

### query_llm

```typescript
// LLM calls this to query itself
{
  "action": "query_llm",
  "parameters": {
    "prompt": "What are best practices for...",
    "context": "We are building..."
  }
}
```

## API Reference

### AgentLoop Methods

```typescript
// Execute a task
run(task: string): Promise<AgentLoopResult>

// Register an action
registerAction(action: IAction): void

// Get conversation history
getHistory(): Message[]

// Get all user outputs
getUserOutputs(): string[]

// Clear history
clearHistory(): void
```

### AgentLoopResult

```typescript
interface AgentLoopResult {
  steps: AgentStep[]; // All executed steps
  outputs: string[]; // All user outputs
  success: boolean; // Overall success
  error?: string; // Error if failed
}
```

### AgentStep

```typescript
interface AgentStep {
  id: string; // Step identifier
  description: string; // Step description
  status: "pending" | "in_progress" | "completed" | "failed";
  action?: string; // Action used (if any)
  actionParams?: Record<string, any>;
  result?: any; // Step result
  error?: string; // Error if failed
}
```

## Common Use Cases

### Use Case 1: Task Planning

```typescript
const result = await loop.run("Plan a marketing campaign");
```

### Use Case 2: Code Generation

```typescript
loop.registerAction(new FileWriteAction());
await loop.run("Create a React component for a login form");
```

### Use Case 3: Research Assistant

```typescript
loop.registerAction(new SearchAction());
loop.registerAction(new SummarizeAction());
await loop.run(
  "Research the top 5 machine learning frameworks and compare them"
);
```

### Use Case 4: Customer Support

```typescript
const support = new AgentLoop(provider, {
  onUserOutput: (msg) => sendToCustomer(msg),
});
support.registerAction(new DatabaseQueryAction());
support.registerAction(new TicketCreateAction());
await support.run(customerMessage);
```

### Use Case 5: Data Processing

```typescript
loop.registerAction(new FetchDataAction());
loop.registerAction(new TransformAction());
loop.registerAction(new SaveAction());
await loop.run("Fetch sales data, transform it to JSON, and save to database");
```

## Tips & Best Practices

1. **Start Simple**: Begin with default actions, add custom ones as needed
2. **Use Callbacks**: Leverage `onStepComplete` and `onUserOutput` for real-time feedback
3. **Set Limits**: Use `maxSteps` to prevent runaway execution
4. **Type Safety**: Use TypeScript for full type checking
5. **Error Handling**: Check `result.success` before using `result.outputs`
6. **Action Design**: Make actions focused and single-purpose
7. **Clear Descriptions**: Action descriptions help the LLM choose correctly
8. **Test Incrementally**: Test each action individually before combining

## Troubleshooting

### Issue: Steps not being parsed

**Solution**: LLM might not be formatting steps correctly. Use `taskBreakdownPrompt` to guide it.

### Issue: Wrong actions being called

**Solution**: Make action `description` and `parameters` more specific.

### Issue: No user outputs

**Solution**: Ensure `includeDefaultActions: true` and LLM knows about `user_output`.

### Issue: Too many steps

**Solution**: Lower `maxSteps` or improve task breakdown prompt.

## Examples

See `/examples` directory for:

- `basic-usage.ts` - Simple agent usage
- `custom-provider.ts` - Custom LLM provider
- `agent-loop-usage.ts` - Comprehensive AgentLoop examples

## Testing

```bash
# Build
npm run build

# Test
npm test
# or
npx ts-node test-agent-loop.ts
```

## Resources

- **README.md** - Full documentation
- **ARCHITECTURE.md** - Visual diagrams and architecture
- **AGENT_LOOP_DESIGN.md** - Design decisions
- **IMPLEMENTATION_SUMMARY.md** - Feature summary
