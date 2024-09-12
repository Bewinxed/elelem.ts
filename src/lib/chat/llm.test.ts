import { test, expect } from 'bun:test';
import {
	createChatLLMWrapper,
	type LLMApi,
	type LLMClientConfig,
	type LLMMessageStreamParams,
	type LLMProvider
} from './llm.js';

const testMessage = {
	id: '1',
	role: 'user',
	content: 'Hello, how are you?'
};

const testCompletion = async (
	llm: LLMApi<LLMProvider, LLMClientConfig<LLMProvider>, LLMMessageStreamParams<LLMProvider>>,
	name: string
) => {
	console.warn(name);
	let response = '';
	for await (const chunk of llm.streamCompletion({
		max_tokens: 4096,
		messages: [testMessage]
	})) {
		response += chunk;
	}
	console.log(response);
	expect(response).toBeTruthy();
	expect(response.length).toBeGreaterThan(0);
};

test('Anthropic LLM wrapper should stream completions', async () => {
	const anthropic = await createChatLLMWrapper('ANTHROPIC', {
		apiKey: process.env.ANTHROPIC_API_KEY,
		defaultModel: 'claude-3-5-sonnet-20240620'
	});

	await testCompletion(anthropic, 'ANTHROPIC');
});

test('OpenAI LLM wrapper should stream completions', async () => {
	const openai = await createChatLLMWrapper('OPENAI', {
		apiKey: process.env.OPENAI_API_KEY,
		defaultModel: 'gpt-4-0613'
	});

	await testCompletion(openai, 'OPENAI');
});

test('OpenAI-compatible LLM wrapper should stream completions', async () => {
	const openai = await createChatLLMWrapper('OPENAI_COMPATIBLE', {
		apiKey: process.env.OPENAI_API_KEY,
		defaultModel: 'gpt-4-0613'
	});

	await testCompletion(openai, 'OPENAI_COMPATIBLE');
});
