import { browser } from '$app/environment';
import { OpenRouter } from '@openrouter/sdk';
import type {
	AiServices,
	ApiKeyStore,
	GenerateSvgInput,
	IconSuggestionService,
	RemixSvgInput,
	SuggestIconsInput,
	SvgGenerationService
} from '$lib/ai/interfaces';
import { MissingApiKeyError } from '$lib/ai/interfaces';

const DEFAULT_MODEL = 'openai/gpt-4.1-mini';
const APP_TITLE = 'Primitive.svg';

const readAssistantContent = (content: unknown) => {
	if (typeof content === 'string') {
		return content;
	}

	if (!Array.isArray(content)) {
		return '';
	}

	return content
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return '';
			}

			if (
				'type' in item &&
				item.type === 'text' &&
				'text' in item &&
				typeof item.text === 'string'
			) {
				return item.text;
			}

			return '';
		})
		.filter(Boolean)
		.join('\n');
};

const parseFirstJsonObject = (raw: string) => {
	const trimmed = raw.trim();

	try {
		return JSON.parse(trimmed) as Record<string, unknown>;
	} catch {
		// continue with extraction
	}

	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced && fenced[1]) {
		try {
			return JSON.parse(fenced[1]) as Record<string, unknown>;
		} catch {
			// continue with extraction
		}
	}

	const firstBrace = trimmed.indexOf('{');
	const lastBrace = trimmed.lastIndexOf('}');
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		const candidate = trimmed.slice(firstBrace, lastBrace + 1);
		return JSON.parse(candidate) as Record<string, unknown>;
	}

	throw new Error('Model did not return JSON content');
};

const extractSvgMarkup = (raw: string) => {
	const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
	if (!svgMatch) {
		throw new Error('Model did not return SVG markup');
	}

	const svg = svgMatch[0].trim();
	const lower = svg.toLowerCase();
	if (lower.includes('<script') || /\son\w+\s*=/.test(lower) || lower.includes('javascript:')) {
		throw new Error('SVG contains blocked markup');
	}

	return svg;
};

const ensureApiKey = (apiKeyStore: ApiKeyStore) => {
	const key = apiKeyStore.getKey();
	if (!key) {
		throw new MissingApiKeyError();
	}

	return key;
};

const createClient = (apiKey: string) =>
	new OpenRouter({
		apiKey,
		xTitle: APP_TITLE,
		httpReferer: browser ? window.location.origin : undefined
	});

class OpenRouterIconSuggestionService implements IconSuggestionService {
	constructor(private readonly apiKeyStore: ApiKeyStore) {}

	async suggestIcons(input: SuggestIconsInput) {
		const apiKey = ensureApiKey(this.apiKeyStore);
		const client = createClient(apiKey);

		const response = await client.chat.send({
			chatGenerationParams: {
				model: DEFAULT_MODEL,
				temperature: 0.25,
				messages: [
					{
						role: 'system',
						content:
							'You generate concise icon naming plans. Return ONLY JSON: {"icons": string[]}. Provide 6-12 icon names, title case, no numbering, no extra keys.'
					},
					{
						role: 'user',
						content: `Project name: ${input.projectName}\nStyle rules: ${input.projectDescription}`
					}
				]
			}
		});

		const rawContent = readAssistantContent(response.choices[0]?.message?.content);
		if (!rawContent) {
			throw new Error('No icon suggestions returned');
		}

		const parsed = parseFirstJsonObject(rawContent);
		const icons = Array.isArray(parsed.icons)
			? parsed.icons
					.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
					.filter((entry) => entry.length > 0)
			: [];

		if (icons.length === 0) {
			throw new Error('Could not parse icon suggestions');
		}

		return Array.from(new Set(icons)).slice(0, 12);
	}
}

class OpenRouterSvgGenerationService implements SvgGenerationService {
	constructor(private readonly apiKeyStore: ApiKeyStore) {}

	private async requestSvg(systemPrompt: string, userPrompt: string) {
		const apiKey = ensureApiKey(this.apiKeyStore);
		const client = createClient(apiKey);

		const response = await client.chat.send({
			chatGenerationParams: {
				model: DEFAULT_MODEL,
				temperature: 0.3,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				]
			}
		});

		const rawContent = readAssistantContent(response.choices[0]?.message?.content);
		if (!rawContent) {
			throw new Error('No SVG response returned');
		}

		const parsed = parseFirstJsonObject(rawContent);
		const svgRaw = typeof parsed.svg === 'string' ? parsed.svg : rawContent;
		return extractSvgMarkup(svgRaw);
	}

	generateSvg(input: GenerateSvgInput) {
		return this.requestSvg(
			'You are an SVG icon generator. Return ONLY JSON: {"svg": "<svg ...>...</svg>"}. Keep SVG valid, standalone, no markdown, no script, no external resources. Use viewBox 0 0 100 100 and fill="none" by default.',
			`Create one icon for "${input.iconName}".\nProject: ${input.projectName}\nStyle rules: ${input.projectDescription}`
		);
	}

	remixSvg(input: RemixSvgInput) {
		return this.requestSvg(
			'You are an SVG icon editor. Return ONLY JSON: {"svg": "<svg ...>...</svg>"}. Keep original intent while applying requested style edits. Keep SVG safe and standalone.',
			`Update icon "${input.iconName}" for project "${input.projectName}".\nStyle rules: ${input.projectDescription}\nRevision: ${input.variant + 1}\nRequested edits: ${input.remixPrompt}\nCurrent SVG:\n${input.currentSvg}`
		);
	}
}

export const createOpenRouterAiServices = (apiKeyStore: ApiKeyStore): AiServices => ({
	iconSuggestionService: new OpenRouterIconSuggestionService(apiKeyStore),
	svgGenerationService: new OpenRouterSvgGenerationService(apiKeyStore)
});
