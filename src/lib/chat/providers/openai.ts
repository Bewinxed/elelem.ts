// providers/openai.ts
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream.mjs';
import type { LLMApi, LLMClientConfig, LLMMessageStreamParams } from '../llm.js';
import type { ChatModel, ChatCompletionChunk } from 'openai/resources/chat/index.mjs';

type OpenAiMessageStreamRequestParams = LLMMessageStreamParams<'OPENAI'>;
type OpenAiLLMProvider<
	ClientConfig extends LLMClientConfig<'OPENAI'>,
	RequestConfig extends OpenAiMessageStreamRequestParams
> = LLMApi<'OPENAI', ClientConfig, RequestConfig>;

function transformParams(params: OpenAiMessageStreamRequestParams): ChatCompletionStreamParams {
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
		model: params.model as ChatModel,
		messages: params.messages.map((message) => ({
			role: message.role as 'user' | 'assistant',
			content: message.content,
			id: message.id
		})),
		max_tokens: params.max_tokens as number,
		temperature: params.temperature,
		frequency_penalty: params.frequency_penalty,
		presence_penalty: params.presence_penalty,
		top_p: params.top_p,
		stop: params.stop ? [params.stop] : undefined,
		stream: true
	};
}

export class OpenAiProvider<
	Config extends LLMClientConfig<'OPENAI'>,
	RequestConfig extends OpenAiMessageStreamRequestParams
> implements OpenAiLLMProvider<Config, RequestConfig>
{
	config: Config;
	constructor(config: Config) {
		this.config = config;
	}
	async *streamCompletion<T extends RequestConfig>(
		config: T
	): AsyncGenerator<T extends { raw: true } ? ChatCompletionChunk : string> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { apiKey, baseUrl, timeout, fetchFn, maxRetries } = this.config;
		const url = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions?${this.config.queryParams || ''}`;
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
			...this.config.headers
		};

		const body = transformParams({
			...config,
			model: config.model || this.config.defaultModel,
			stream: true
		});

		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: this.config.signal
		});

		if (!response.ok) {
			throw new Error(`OpenAI API returned ${response.status} ${await response.text()}`);
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
					const line_contents = line.slice(6);
					if (line_contents === '[DONE]') {
						break;
					}
					const data = JSON.parse(line_contents) as ChatCompletionChunk;

					if (config.raw) {
						yield data as T extends { raw: true } ? ChatCompletionChunk : string;
						continue;
					}
					if (data.choices[0]?.delta?.content) {
						yield data.choices[0].delta.content as T extends { raw: true }
							? ChatCompletionChunk
							: string;
					}
				}
			}
		}
	}
}
