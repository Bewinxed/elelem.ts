// providers/anthropic.ts

import type { Model, RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages.mjs';
import type { LLMApi, LLMClientConfig, LLMMessageStreamParams } from '../llm.js';
import type { Anthropic } from '@anthropic-ai/sdk';

type AnthropicMessageStreamRequestParams = LLMMessageStreamParams<'ANTHROPIC'>;

type AnthropicLLMProvider<
	ClientConfig extends LLMClientConfig<'ANTHROPIC'>,
	RequestConfig extends AnthropicMessageStreamRequestParams
> = LLMApi<'ANTHROPIC', ClientConfig, RequestConfig>;

function transformParams(
	params: AnthropicMessageStreamRequestParams
): Anthropic.MessageStreamParams {
	if (params.messages.some((message) => message.role === 'function')) {
		throw new Error('Function calling is not supported by Anthropic');
	}

	return {
		model: params.model as Model,
		messages: params.messages.map((message) => ({
			role: message.role as 'user' | 'assistant',
			content: message.content
		})),
		max_tokens: params.max_tokens,
		temperature: params.temperature,
		top_k: params.top_k,
		top_p: params.top_p,
		stop_sequences: params.stop ? [params.stop] : undefined,
		system: params.system,
		stream: params.stream
	};
}

export class AnthropicProvider<
	Config extends LLMClientConfig<'ANTHROPIC'>,
	RequestConfig extends LLMMessageStreamParams<'ANTHROPIC'>
> implements AnthropicLLMProvider<Config, RequestConfig>
{
	config: Config;
	constructor(config: Config) {
		this.config = config;
	}
	async *streamCompletion<T extends RequestConfig>(
		config: T
	): AsyncGenerator<T extends { raw: true } ? RawMessageStreamEvent : string> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { apiKey, baseUrl, timeout, fetchFn, maxRetries } = this.config;
		const url = `${baseUrl ?? 'https://api.anthropic.com'}/v1/messages?${this.config.queryParams || ''}`;
		const headers = {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey!,
			'anthropic-version': '2023-06-01'
		};
		const body = transformParams({
			...config,
			model: config.model ?? this.config.defaultModel,
			stream: true
		});

		const response = await (fetchFn ?? fetch)(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: this.config.signal
		});

		if (!response.ok) {
			throw new Error(`Anthropic API returned ${response.status} ${await response.text()}`);
		}

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
				if (line.startsWith('data: ')) {
					const data = JSON.parse(line.slice(6)) as RawMessageStreamEvent;
					if (config.raw) {
						yield data as T extends { raw: true } ? RawMessageStreamEvent : string;
						continue;
					}
					if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
						yield data.delta.text as T extends { raw: true } ? RawMessageStreamEvent : string;
					}
				}
			}
		}
	}
}
