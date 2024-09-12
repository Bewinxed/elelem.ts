import type { Model as AnthropicModels } from '@anthropic-ai/sdk/resources/messages.mjs';
import type { ChatModel } from 'openai/resources/chat/index.mjs';

export type LLMProvider = 'OPENAI' | 'OPENAI_COMPATIBLE' | 'ANTHROPIC' | 'OLLAMA' | 'COHERE';
export type Role = 'user' | 'assistant' | 'system' | 'function';

export type Message = {
	id: string;
	role: Role;
	content: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	json?: Record<string, any>;
};

type Models<T extends LLMProvider> = T extends 'ANTHROPIC'
	? AnthropicModels
	: T extends 'OPENAI'
		? ChatModel
		: string;

export interface LLMClientConfig<P extends LLMProvider> {
	defaultModel?: Models<P>;
	organization?: string;
	apiKey?: string;
	baseUrl?: string;
	timeout?: number;
	fetchFn?: typeof fetch;
	maxRetries?: number;
	headers?: Record<string, string>;
	queryParams?: Record<string, string>;
	signal?: AbortSignal;
}

export interface LLMMessageStreamParams<Provider extends LLMProvider> {
	raw?: boolean;
	model?: Models<Provider>;
	messages: Message[];
	max_tokens: number;
	temperature?: number;
	top_k?: number;
	top_p?: number;
	stop?: string;
	repeat_penalty?: number;
	presence_penalty?: number;
	frequency_penalty?: number;
	system?: string;
	stream?: boolean;
}

export interface LLMApi<
	Provider extends LLMProvider,
	Config extends LLMClientConfig<Provider>,
	RequestConfig extends LLMMessageStreamParams<Provider>
> {
	config: Config;
	streamCompletion<T extends RequestConfig>(
		config: T
	): AsyncGenerator<T extends { raw: true } ? object : string>;
}

export async function createChatLLMWrapper<
	Provider extends LLMProvider,
	ClientConfig extends LLMClientConfig<Provider>,
	StreamParams extends LLMMessageStreamParams<Provider>
>(provider: Provider, config: ClientConfig): Promise<LLMApi<Provider, ClientConfig, StreamParams>> {
	switch (provider) {
		case 'OPENAI':
		case 'OPENAI_COMPATIBLE': {
			const module = await import('./providers/openai.js');
			return new module.OpenAiProvider(config as LLMClientConfig<'OPENAI'>) as LLMApi<
				Provider,
				ClientConfig,
				StreamParams
			>;
		}
		case 'ANTHROPIC': {
			const module_1 = await import('./providers/anthropic.js');
			return new module_1.AnthropicProvider(config as LLMClientConfig<'ANTHROPIC'>) as LLMApi<
				Provider,
				ClientConfig,
				StreamParams
			>;
		}

		case 'OLLAMA': {
			const module_2 = await import('./providers/ollama.js');
			return new module_2.OllamaProvider(config as LLMClientConfig<'OLLAMA'>) as LLMApi<
				Provider,
				ClientConfig,
				StreamParams
			>;
		}
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}
