import { browser } from '$app/environment';
import { OpenRouter } from '@openrouter/sdk';
import type {
	AiServices,
	ApiKeyStore,
	GenerateSvgInput,
	IconSuggestionService,
	ModelCatalogService,
	ModelInfo,
	RemixSvgInput,
	RetryContextEntry,
	SuggestIconsInput,
	SvgGenerationService
} from '$lib/ai/interfaces';
import { MissingApiKeyError } from '$lib/ai/interfaces';
import { AiResponseValidationError as ValidationError } from '$lib/ai/interfaces';

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
				model: input.modelId,
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

	private buildRetryContext(context: RetryContextEntry[] | undefined) {
		if (!context || context.length === 0) {
			return '';
		}

		const compact = context
			.slice(-3)
			.map((entry, index) => {
				const base = `Attempt ${index + 1}: ${entry.errorType} - ${entry.message}`;
				const raw = entry.rawModelOutput ? ` Raw: ${entry.rawModelOutput.slice(0, 300)}` : '';
				const correction = entry.correctionOutput
					? ` Correction: ${entry.correctionOutput.slice(0, 300)}`
					: '';
				return `${base}${raw}${correction}`;
			})
			.join('\n');

		return `\nPrior failures to avoid:\n${compact}`;
	}

	private async requestSvg(
		systemPrompt: string,
		userPrompt: string,
		modelId: string,
		retryContext?: RetryContextEntry[]
	) {
		const apiKey = ensureApiKey(this.apiKeyStore);
		const client = createClient(apiKey);
		const contextSuffix = this.buildRetryContext(retryContext);
		const originalUserPrompt = `${userPrompt}${contextSuffix}`;

		const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: originalUserPrompt }
		];

		const executeTurn = async () => {
			const response = await client.chat.send({
				chatGenerationParams: {
					model: modelId,
					temperature: 0.3,
					messages
				}
			});

			const content = readAssistantContent(response.choices[0]?.message?.content);
			if (!content) {
				throw new ValidationError({
					errorType: 'empty_output',
					message: 'No SVG response returned',
					modelId,
					rawModelOutput: ''
				});
			}

			return content;
		};

		const attemptParse = (rawContent: string) => {
			const parsed = parseFirstJsonObject(rawContent);
			const svgRaw = typeof parsed.svg === 'string' ? parsed.svg : rawContent;
			return extractSvgMarkup(svgRaw);
		};

		const firstOutput = await executeTurn();
		try {
			return attemptParse(firstOutput);
		} catch (firstError) {
			const message = firstError instanceof Error ? firstError.message : 'Invalid SVG response';
			messages.push({ role: 'assistant', content: firstOutput });
			messages.push({
				role: 'user',
				content: `Validation failed: ${message}. Return a corrected response now. Output MUST be strict JSON only: {"svg":"<svg ...>...</svg>"}. No markdown or explanation.`
			});
		}

		const correctionOutput = await executeTurn();
		try {
			return attemptParse(correctionOutput);
		} catch (secondError) {
			const message =
				secondError instanceof Error ? secondError.message : 'Invalid corrected SVG response';
			throw new ValidationError({
				errorType: 'invalid_svg_payload',
				message,
				modelId,
				rawModelOutput: firstOutput.slice(0, 2000),
				correctionOutput: correctionOutput.slice(0, 2000)
			});
		}
	}

	generateSvg(input: GenerateSvgInput) {
		return this.requestSvg(
			'You are an SVG icon generator. Return ONLY JSON: {"svg": "<svg ...>...</svg>"}. Keep SVG valid, standalone, no markdown, no script, no external resources. Use viewBox 0 0 100 100 and fill="none" by default.',
			`Create one icon for "${input.iconName}".\nProject: ${input.projectName}\nStyle rules: ${input.projectDescription}`,
			input.modelId,
			input.retryContext
		);
	}

	remixSvg(input: RemixSvgInput) {
		const colorLine =
			input.colorPalette && input.colorPalette.length > 0
				? `Color palette (use only these hex colors where possible): ${input.colorPalette.join(', ')}`
				: 'Color palette: keep existing colors unless user asks otherwise';
		const strokeLine =
			typeof input.strokeWidth === 'number'
				? `Preferred line thickness: stroke-width ${input.strokeWidth}`
				: 'Preferred line thickness: keep visually consistent with current icon';

		return this.requestSvg(
			'You are an SVG icon editor. Return ONLY JSON: {"svg": "<svg ...>...</svg>"}. Keep original intent while applying requested style edits. Keep SVG safe and standalone.',
			`Update icon "${input.iconName}" for project "${input.projectName}".\nStyle rules: ${input.projectDescription}\nRevision: ${input.variant + 1}\nRequested edits: ${input.remixPrompt || 'No freeform edits provided; apply style controls only.'}\n${colorLine}\n${strokeLine}\nCurrent SVG:\n${input.currentSvg}`,
			input.modelId,
			input.retryContext
		);
	}
}

class OpenRouterModelCatalogService implements ModelCatalogService {
	constructor(private readonly apiKeyStore: ApiKeyStore) {}

	async listModels(): Promise<ModelInfo[]> {
		const apiKey = ensureApiKey(this.apiKeyStore);
		const client = createClient(apiKey);
		const response = await client.models.list();

		return response.data
			.map((model) => {
				const id = model.id.trim();
				const provider = id.includes('/') ? id.split('/')[0] : 'other';

				return {
					id,
					name: model.name.trim() || id,
					provider: provider.toLowerCase()
				};
			})
			.filter((model) => model.id.length > 0)
			.sort((a, b) => a.id.localeCompare(b.id));
	}
}

export const createOpenRouterAiServices = (apiKeyStore: ApiKeyStore): AiServices => ({
	iconSuggestionService: new OpenRouterIconSuggestionService(apiKeyStore),
	svgGenerationService: new OpenRouterSvgGenerationService(apiKeyStore),
	modelCatalogService: new OpenRouterModelCatalogService(apiKeyStore)
});
