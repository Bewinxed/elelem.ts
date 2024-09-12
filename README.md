# LLM Chat API Wrapper

```markdown
# LLM Chat API Wrapper

This TypeScript library provides a unified interface for interacting with various Large Language Model (LLM) providers, including OpenAI, Anthropic, and Ollama. It offers a flexible and extensible way to integrate different LLM services into your applications.

## Features

- Support for multiple LLM providers (OpenAI, Anthropic, Ollama)
- Unified interface for streaming chat completions
- Type-safe configurations for different providers
- Extensible architecture for adding new providers

## Installation

```bash
npm install llm-chat-api-wrapper
bun install llm-chat-api-wrapper
```

## Usage

```typescript
import { createChatLLMWrapper } from 'llm-chat-api-wrapper';

// Create a wrapper for OpenAI
const openaiConfig: LLMClientConfig<'OPENAI'> = {
	apiKey: 'your-api-key',
	// ... other configuration options
};

const openaiWrapper = await createChatLLMWrapper('OPENAI', openaiConfig);

// Stream completion
const messages = [{ id: '1', role: 'user', content: 'Hello, AI!' }];
const streamParams: LLMMessageStreamParams<'OPENAI'> = {
	messages,
	max_tokens: 100,
	// ... other stream parameters
};

for await (const chunk of openaiWrapper.streamCompletion(streamParams)) {
	console.log(chunk);
}
```

## Supported Providers

- OpenAI
- OpenAI-compatible services
- Anthropic
- Ollama

## Adding New Providers

To add a new provider:

1. Create a new file in the `providers` directory (e.g., `newprovider.ts`)
2. Implement the `LLMApi` interface for the new provider
3. Add the new provider to the `LLMProvider` type and `createChatLLMWrapper` function

## License

This project is licensed under the MIT License.
```
