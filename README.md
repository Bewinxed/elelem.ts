# elelem.ts 🤖

This ONLY uses fetch, so no extra dependencies are needed except for types, which will be inlined soon.

This TypeScript library provides a unified interface for interacting with various Large Language Model (LLM) providers, including OpenAI, Anthropic, and Ollama. It offers a flexible and extensible way to integrate different LLM services into your applications.

## Features

- Support for multiple LLM providers (OpenAI, Anthropic, Ollama)
- Unified interface for streaming chat completions
- Type-safe configurations for different providers
- Extensible architecture for adding new providers

## Installation

```bash
npm install elelem.ts
bun install elelem.ts
```

## Usage

```typescript
import { createChatLLMWrapper } from 'elelem.ts';

const llm = await createChatLLMWrapper('OPENAI' | 'ANTHROPIC' | ..., {
    apiKey: 'your-api-key',
    baseUrl: 'https://api.openai.com' | "http://localhost:11434",
});

for await (const chunk of openaiWrapper.streamCompletion(streamParams)) {
	console.log(chunk);
}

// Only Streaming is supported for now.

```

## Supported Providers

- OpenAI
- OpenAI-compatible services
- Anthropic
- Ollama

## Adding New Providers

To add a new provider:

Check /src/lib/chat/providers, and make a PR.
Or ask me to add it.

## License

This project is licensed under the MIT License.
