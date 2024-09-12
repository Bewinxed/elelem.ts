import { createChatLLMWrapper } from './llm.js';

const anthropic = await createChatLLMWrapper('ANTHROPIC', {
	apiKey: process.env.ANTHROPIC_API_KEY,
	defaultModel: 'claude-3-5-sonnet-20240620'
});

console.log(anthropic);

console.warn('ANTHROPIC');
for await (const chunk of anthropic.streamCompletion({
	max_tokens: 4096,
	messages: [
		{
			id: '1',
			role: 'user',
			content: 'Hello, how are you?'
		}
	]
})) {
	console.log(chunk);
}

console.warn('OPENAI');
const openai = await createChatLLMWrapper('OPENAI', {
	apiKey: process.env.OPENAI_API_KEY,
	defaultModel: 'gpt-4-0613'
});

for await (const chunk of openai.streamCompletion({
	max_tokens: 4096,
	messages: [
		{
			id: '1',
			role: 'user',
			content: 'Hello, how are you?'
		}
	]
})) {
	console.log(chunk);
}
