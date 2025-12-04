# Understanding sendMessage vs sendAgenticMessage

## The Key Insight

The difference is **NOT** in the LLM API call itself, but in **WHAT THE LLM SEES** via the system prompt!

## How It Works

### `sendMessage()` - Normal Chat

```typescript
async sendMessage(messages, systemPrompt?) {
    // systemPrompt = "You are a helpful assistant" (or empty)
    // NO action definitions included

    return callLLMAPI(messages, systemPrompt);
    // LLM sees: regular conversation, no actions available
    // LLM responds: normal text
}
```

### `sendAgenticMessage()` - Agentic Mode

```typescript
async sendAgenticMessage(messages, systemPrompt?) {
    // systemPrompt = "You are a helpful assistant...
    //                 Available Actions:
    //                 - search (query: string)
    //                 - weather (city: string)
    //                 ..."

    return callLLMAPI(messages, systemPrompt);
    // LLM sees: conversation + available actions in system prompt
    // LLM decides: "Do I need an action? Yes/No"
    // LLM responds: normal text OR action JSON
}
```

## The Magic is in the System Prompt

**Who builds the system prompt?**

1. **AgentLoop/Agent** automatically builds it with action descriptions
2. When calling `sendAgenticMessage()`, the system prompt includes:

   ```
   You are a helpful assistant.

   Available Actions:
   - search: Search the internet
     Parameters: query (string)
   - weather: Get weather info
     Parameters: city (string)

   To use an action, respond with:
   {"action": "search", "parameters": {"query": "..."}}
   ```

3. The **LLM reads this** and decides what to do!

## Example Flow

### User: "Search for TypeScript"

**With `sendAgenticMessage()`:**

```
System: Here are available actions: search, weather, email...
User: Search for TypeScript

LLM thinks: "User wants search. I have search action. I'll use it!"
LLM responds:
  I'll search for that.
  {"action": "search", "parameters": {"query": "TypeScript"}}
  {"action": "user_output", "parameters": {"message": "Found results!"}}
```

**With `sendMessage()`:**

```
System: You are a helpful assistant
User: Search for TypeScript

LLM thinks: "User wants search. I don't have search capability."
LLM responds:
  I cannot search the internet, but I can tell you about TypeScript...
```

## Both Methods Call Same API!

**Yes, both can use the exact same `callLLMAPI()` function!**

The difference is:

- **What's IN the system prompt** (actions vs no actions)
- **How the LLM interprets the request** based on what it sees

## Real Implementation

```typescript
class MyProvider implements ILLMProvider {
  async sendMessage(messages, systemPrompt) {
    // systemPrompt might be empty or just "You are helpful"
    return this.callAPI(messages, systemPrompt);
  }

  async sendAgenticMessage(messages, systemPrompt) {
    // systemPrompt includes action definitions
    // Agent/AgentLoop adds them automatically!
    return this.callAPI(messages, systemPrompt);
  }

  private async callAPI(messages, systemPrompt) {
    // Same API call for both!
    // The LLM decides what to do based on the system prompt
    return await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages,
      ],
    });
  }
}
```

## Summary

✅ Both methods CAN call the same API  
✅ The difference is in the system prompt content  
✅ AgentLoop/Agent builds the system prompt with actions  
✅ The LLM sees actions and decides whether to use them  
✅ This is how the framework achieves "LLM decides when to use actions"

**The LLM makes the decision based on:**

1. What actions are available (in system prompt)
2. What the user is asking for
3. Its training on when to use tools/actions

This is the standard way modern LLM frameworks work (like LangChain, etc.)!
