# Agent Loop Feature - Design Decisions

## Overview

The Agent Loop feature adds autonomous task execution capabilities to Chisato. It allows an LLM to break down complex tasks into steps and execute them with appropriate actions.

## Key Design Decisions

### 1. Default Actions: `user_output` and `query_llm`

**Decision**: Yes, both are provided as default actions.

**Rationale**:

- **`user_output`**: Essential for the agent to communicate results to users. Without this, the agent would have no standard way to present information. It's automatically included when `includeDefaultActions: true` (default).

- **`query_llm`**: Allows the agent to query the LLM for additional information during execution. This enables the agent to be more autonomous and handle situations where it needs clarification or additional reasoning.

**Usage**:

```typescript
const agentLoop = new AgentLoop(provider, {
  includeDefaultActions: true, // default, includes both actions
});
```

### 2. Easy Chat Creation with Action Recognition

**Decision**: AgentLoop automatically recognizes and executes actions based on LLM responses.

**Implementation**:

- When the LLM responds with JSON in the format `{"action": "name", "parameters": {...}}`, the action is automatically executed
- The agent determines which action to use for each step
- No manual action dispatching required

**Example**:

```typescript
// Create a simple interactive chat
const chat = new AgentLoop(provider, {
  includeDefaultActions: true,
  onUserOutput: (msg) => console.log("Agent:", msg),
});

// Register custom actions
chat.registerAction(new SearchAction());
chat.registerAction(new EmailAction());

// Agent automatically recognizes when to use which action
await chat.run("Search for TypeScript tutorials and email me the top 3");
// Agent will: 1) Use SearchAction, 2) Analyze, 3) Use user_output or EmailAction
```

### 3. Task Breakdown Process

**How it works**:

1. **Initial Prompt**: User provides a task
2. **LLM Breakdown**: Task is sent to LLM with a task breakdown prompt
3. **Step Parsing**: Response is parsed into individual steps (numbered list or bullets)
4. **Step Execution**: Each step is executed, with the agent determining appropriate actions
5. **Result Collection**: Outputs collected via `user_output` action

### 4. Flexibility and Customization

**Options provided**:

- `maxSteps`: Limit execution to prevent infinite loops
- `taskBreakdownPrompt`: Customize how tasks are broken down
- `includeDefaultActions`: Control whether default actions are registered
- `onStepComplete`: React to each step completion
- `onUserOutput`: Handle user-facing outputs

### 5. Separation of Concerns

**Agent vs AgentLoop**:

- **Agent**: Low-level conversation loop with action execution
- **AgentLoop**: High-level task orchestration with automatic breakdown

This separation allows:

- Using `Agent` for simple chat with actions
- Using `AgentLoop` for complex multi-step autonomous tasks
- AgentLoop internally uses Agent for reliability

## Use Cases

### 1. Interactive Chat with Actions

```typescript
const chat = new AgentLoop(provider, {
  onUserOutput: (msg) => displayInUI(msg),
});
chat.registerAction(new WeatherAction());
chat.registerAction(new SearchAction());

// User types naturally, agent recognizes when to use actions
await chat.run("What's the weather in Tokyo?");
```

### 2. Autonomous Task Execution

```typescript
const executor = new AgentLoop(provider, {
  maxSteps: 20,
  onStepComplete: (step) => updateProgressBar(step),
});
executor.registerAction(new FileAction());
executor.registerAction(new GitAction());

await executor.run("Create a new React component with tests");
```

### 3. Custom Task Breakdown

```typescript
const customLoop = new AgentLoop(provider, {
  taskBreakdownPrompt: `Break down the task into specific, technical steps.
  Format as:
  1. [Action] Description
  2. [Action] Description`,
});
```

## Benefits

1. **Easy to Use**: Simple API for complex workflows
2. **Flexible**: Highly customizable behavior
3. **Autonomous**: Agent can operate with minimal intervention
4. **Extensible**: Easy to add custom actions
5. **Type-Safe**: Full TypeScript support

## Future Enhancements

Potential additions:

- Step dependencies and parallel execution
- Retry logic for failed steps
- Step validation before execution
- More sophisticated step parsing
- Built-in actions for common tasks (file I/O, HTTP requests, etc.)
