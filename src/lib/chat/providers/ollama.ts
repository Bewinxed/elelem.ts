// providers/anthropic.ts
import type { ChatRequest, ProgressResponse } from 'ollama';
import type { LLMApi, LLMClientConfig, LLMMessageStreamParams } from '../llm.js';

type OllamaMessageStreamRequestParams = LLMMessageStreamParams<'OLLAMA'>;
type OllamaLLMProvider<
	ClientConfig extends LLMClientConfig<'OLLAMA'>,
	RequestConfig extends OllamaMessageStreamRequestParams
> = LLMApi<'OLLAMA', ClientConfig, RequestConfig>;

function transformParams(params: OllamaMessageStreamRequestParams): ChatRequest {
	if (params.messages.some((message) => message.role === 'function')) {
		throw new Error('Function calling is not supported by Anthropic');
	}
	const system_prompt_present = params.messages.some((message) => message.role === 'system');
	if (!system_prompt_present && params.system) {
		params.messages.unshift({
			id: 'system',
			role: 'system',
			content: params.system
		});
	}
	return {
		model: params.model as string,
		messages: params.messages.map((message) => ({
			role: message.role as 'user' | 'assistant',
			content: message.content,
			id: message.id
		})),
		options: {
			top_p: params.top_p,
			top_k: params.top_k,
			temperature: params.temperature,
			repeat_penalty: params.repeat_penalty,
			frequency_penalty: params.frequency_penalty,
			presence_penalty: params.presence_penalty,
			stop: params.stop ? [params.stop] : undefined
		}
	};
}

export class OllamaProvider<
	Config extends LLMClientConfig<'OLLAMA'>,
	RequestConfig extends OllamaMessageStreamRequestParams
> implements OllamaLLMProvider<Config, RequestConfig>
{
	config: Config;
	constructor(config: Config) {
		this.config = config;
	}
	async *streamCompletion<T extends RequestConfig>(
		config: T
	): AsyncGenerator<T extends { raw: true } ? ProgressResponse : string> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { apiKey, baseUrl, timeout, fetchFn, maxRetries } = this.config;

		const url = `${baseUrl || 'http://localhost:11434'}/api/generate'`;

		const body = transformParams({
			...config,
			model: config.model ?? this.config.defaultModel,
			stream: true
		});

		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: this.config.signal
		});

		if (!response.body) throw new Error('Response body is null');

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			if (this.config.signal?.aborted) {
				throw new DOMException('Aborted', 'AbortError');
			}
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split('\n').filter(Boolean);

			for (const line of lines) {
				const data = JSON.parse(line) as ProgressResponse;
				if (data.digest) {
					if (config.raw) {
						yield data as T extends { raw: true } ? ProgressResponse : string;
						continue;
					}
					yield data.digest as T extends { raw: true } ? ProgressResponse : string;
				}
			}
		}
	}
}
