# Chisato AgentLoop Architecture

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                              │
│                "Plan a birthday party"                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT LOOP                                 │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. TASK BREAKDOWN (LLM Call)                          │    │
│  │     Input: "Plan a birthday party"                     │    │
│  │     Output:                                            │    │
│  │       1. Choose a venue                                │    │
│  │       2. Create guest list                             │    │
│  │       3. Send invitations                              │    │
│  │       4. Order cake                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  2. STEP EXECUTION LOOP                                │    │
│  │                                                        │    │
│  │  For each step:                                        │    │
│  │    ┌──────────────────────────────────────┐           │    │
│  │    │  Agent determines action needed       │           │    │
│  │    │  (via LLM call)                      │           │    │
│  │    └──────────────┬───────────────────────┘           │    │
│  │                   │                                    │    │
│  │    ┌──────────────▼───────────────────────┐           │    │
│  │    │  Execute appropriate action:         │           │    │
│  │    │  - user_output (built-in)           │           │    │
│  │    │  - query_llm (built-in)             │           │    │
│  │    │  - Custom registered actions         │           │    │
│  │    └──────────────┬───────────────────────┘           │    │
│  │                   │                                    │    │
│  │    ┌──────────────▼───────────────────────┐           │    │
│  │    │  Collect results and outputs         │           │    │
│  │    └──────────────────────────────────────┘           │    │
│  └────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  3. RESULT COLLECTION                                  │    │
│  │     - All step statuses                                │    │
│  │     - All user outputs                                 │    │
│  │     - Success/failure status                           │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER OUTPUT                                │
│  ✓ Completed: Choose a venue                                   │
│  ✓ Completed: Create guest list                                │
│  ✓ Completed: Send invitations                                 │
│  ✓ Completed: Order cake                                       │
│                                                                 │
│  Result: 4 steps completed successfully!                       │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHISATO FRAMEWORK                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │       Agent          │        │     AgentLoop        │      │
│  │                      │        │                      │      │
│  │  - Low-level chat    │        │  - Task breakdown    │      │
│  │  - Action execution  │        │  - Step orchestration│      │
│  │  - Conversation loop │◄───────│  - Uses Agent        │      │
│  └──────────────────────┘        └──────────────────────┘      │
│           │                                  │                  │
│           │                                  │                  │
│           ▼                                  ▼                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            ActionRegistry                              │    │
│  │                                                        │    │
│  │  - user_output (default)                              │    │
│  │  - query_llm (default)                                │    │
│  │  - Custom actions...                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            ILLMProvider                                │    │
│  │                                                        │    │
│  │  - OpenAI, Anthropic, local models, etc.             │    │
│  │  - Implemented by user                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Action Recognition Flow

```
                    ┌─────────────────────┐
                    │   LLM Response      │
                    │                     │
                    │ "I'll search for    │
                    │ tutorials..."       │
                    │                     │
                    │ {"action": "search",│
                    │  "parameters": {    │
                    │    "query": "..."   │
                    │  }}                 │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  parseActionCalls() │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   ActionRegistry    │
                    │   .getAction()      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Execute Action     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Return Result      │
                    │  to AgentLoop       │
                    └─────────────────────┘
```

## Default Actions Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Default Actions                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────┐  ┌──────────────────────────┐  │
│  │   UserOutputAction         │  │   QueryLLMAction         │  │
│  ├────────────────────────────┤  ├──────────────────────────┤  │
│  │ name: "user_output"        │  │ name: "query_llm"        │  │
│  │                            │  │                          │  │
│  │ Purpose:                   │  │ Purpose:                 │  │
│  │ - Output to user           │  │ - Query LLM for info     │  │
│  │ - Display results          │  │ - Get clarification      │  │
│  │ - Communication            │  │ - Additional reasoning   │  │
│  │                            │  │                          │  │
│  │ Parameters:                │  │ Parameters:              │  │
│  │ - message (required)       │  │ - prompt (required)      │  │
│  │                            │  │ - context (optional)     │  │
│  │                            │  │                          │  │
│  │ Returns:                   │  │ Returns:                 │  │
│  │ - type: "user_output"      │  │ - type: "llm_query"      │  │
│  │ - message: string          │  │ - response: string       │  │
│  │ - timestamp: ISO string    │  │ - timestamp: ISO string  │  │
│  └────────────────────────────┘  └──────────────────────────┘  │
│                                                                 │
│  Both registered automatically when:                            │
│  includeDefaultActions: true (default)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Usage Pattern Comparison

### Pattern 1: Simple Chat (Agent)

```typescript
const agent = new Agent(provider);
agent.registerAction(new CalculatorAction());
const response = await agent.chat("What is 15 * 23?");
// One-shot interaction
```

### Pattern 2: Autonomous Tasks (AgentLoop)

```typescript
const agentLoop = new AgentLoop(provider);
agentLoop.registerAction(new CalculatorAction());
const result = await agentLoop.run("Calculate taxes for Q1-Q4");
// Multi-step autonomous execution
```

### Pattern 3: Interactive Chat with Actions (AgentLoop)

```typescript
const chat = new AgentLoop(provider, {
  onUserOutput: (msg) => display(msg),
});
chat.registerAction(new SearchAction());
chat.registerAction(new WeatherAction());

// Continuous interaction with action recognition
while (userInput) {
  await chat.run(userInput);
}
```
