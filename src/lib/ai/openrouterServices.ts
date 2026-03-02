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
	SvgGenerationService,
	ColorSuggestionService,
	SuggestColorsInput
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
				// @ts-expect-error - response_format is supported by OpenRouter but might be missing from SDK types
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: 'icon_suggestions',
						strict: true,
						schema: {
							type: 'object',
							properties: {
								icons: {
									type: 'array',
									items: { type: 'string' }
								}
							},
							required: ['icons'],
							additionalProperties: false
						}
					}
				},
				messages: [
					{
						role: 'system',
						content:
							'You generate concise icon naming plans. Provide 6-12 icon names, title case, no numbering, no extra keys.'
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
					// @ts-expect-error - response_format is supported by OpenRouter but might be missing from SDK types
					response_format: {
						type: 'json_schema',
						json_schema: {
							name: 'svg_response',
							strict: true,
							schema: {
								type: 'object',
								properties: {
									svg: {
										type: 'string',
										description: 'The valid, standalone SVG markup.'
									}
								},
								required: ['svg'],
								additionalProperties: false
							}
						}
					},
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
		const colorLine =
			input.colorPalette && input.colorPalette.length > 0
				? `Color palette constraint (use ONLY these exact hex colors for strokes/fills): ${input.colorPalette.join(', ')}`
				: 'Use standard hex colors. Usually, prefer fill="none" and stroke="currentColor" or specific hex codes unless the aesthetic dictates filled shapes.';
		const strokeLine =
			typeof input.strokeWidth === 'number'
				? `Line thickness constraint: strictly use stroke-width="${input.strokeWidth}" for all strokes.`
				: '';

		return this.requestSvg(
			`You are an expert SVG icon designer and developer. 
Your goal is to create beautiful, crisp, and highly optimized scalable vector graphics.

Guidelines:
1. Use a strict viewBox="0 0 100 100".
2. Use clean, semantic geometric primitives (<path>, <circle>, <rect>, <line>, <polyline>, <polygon>). Avoid <text> or embedded images.
3. Keep the design minimalist but highly recognizable. Ensure perfect alignment and balance.
4. ${colorLine}
5. ${strokeLine ? strokeLine + '\n6. ' : ''}Do NOT include <script>, event handlers, or external references.`,
			`Create a high-quality icon for the concept: "${input.iconName}".\nProject Context: ${input.projectName}\nAesthetic & Style Rules: ${input.projectDescription}`,
			input.modelId,
			input.retryContext
		);
	}

	remixSvg(input: RemixSvgInput) {
		const colorLine =
			input.colorPalette && input.colorPalette.length > 0
				? `Color palette constraint (use ONLY these exact hex colors for strokes/fills): ${input.colorPalette.join(', ')}`
				: 'Color palette: preserve existing colors unless requested otherwise.';
		const strokeLine =
			typeof input.strokeWidth === 'number'
				? `Line thickness constraint: strictly use stroke-width="${input.strokeWidth}" for all strokes.`
				: 'Line thickness: keep visually consistent with the current icon.';

		return this.requestSvg(
			`You are an expert SVG icon editor and designer.
Your task is to modify an existing SVG icon based on user requests while adhering strictly to style guidelines.

Guidelines:
1. Maintain the viewBox="0 0 100 100".
2. Keep the SVG valid, standalone, and strictly semantic.
3. Apply the requested changes gracefully without losing the core recognizable shape, unless a total redesign is requested.
4. Do NOT include <script>, event handlers, or external references.`,
			`Update the icon "${input.iconName}" for project "${input.projectName}".\nStyle rules: ${input.projectDescription}\nRevision iteration: ${input.variant + 1}\n\nRequested structural/thematic edits: ${input.remixPrompt || 'No structural edits requested; apply the style constraints below strictly.'}\n${colorLine}\n${strokeLine}\n\nCurrent SVG to modify:\n${input.currentSvg}`,
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

class OpenRouterColorSuggestionService implements ColorSuggestionService {
	constructor(private readonly apiKeyStore: ApiKeyStore) {}

	async suggestColors(input: SuggestColorsInput) {
		const apiKey = ensureApiKey(this.apiKeyStore);
		const client = createClient(apiKey);

		const response = await client.chat.send({
			chatGenerationParams: {
				model: input.modelId,
				temperature: 0.3,
				// @ts-expect-error - response_format is supported by OpenRouter but might be missing from SDK types
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: 'color_suggestions',
						strict: true,
						schema: {
							type: 'object',
							properties: {
								colors: {
									type: 'array',
									items: { type: 'string' },
									description: 'Array of hex color codes'
								}
							},
							required: ['colors'],
							additionalProperties: false
						}
					}
				},
				messages: [
					{
						role: 'system',
						content:
							'You are a color palette generator. Given a theme or description, generate an array of 2 to 6 hex color codes that best represent it. Only output valid hex codes (e.g. "#FF3E00").'
					},
					{
						role: 'user',
						content: input.prompt
					}
				]
			}
		});

		const rawContent = readAssistantContent(response.choices[0]?.message?.content);
		if (!rawContent) {
			throw new Error('No color suggestions returned');
		}

		let parsed: Record<string, unknown> = {};
		try {
			parsed = parseFirstJsonObject(rawContent);
		} catch {
			// If JSON parsing fails (e.g. streaming issues), fallback to extracting hex codes directly via regex
			const hexMatches = rawContent.match(/#[0-9A-F]{6}/gi);
			if (hexMatches) {
				parsed = { colors: hexMatches };
			}
		}

		const colors = Array.isArray(parsed.colors)
			? parsed.colors
					.map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : ''))
					.filter((entry) => /^#[0-9A-F]{6}$/i.test(entry))
			: [];

		if (colors.length === 0) {
			throw new Error('Could not parse valid hex colors from response');
		}

		return colors;
	}
}

export const createOpenRouterAiServices = (apiKeyStore: ApiKeyStore): AiServices => ({
	iconSuggestionService: new OpenRouterIconSuggestionService(apiKeyStore),
	svgGenerationService: new OpenRouterSvgGenerationService(apiKeyStore),
	modelCatalogService: new OpenRouterModelCatalogService(apiKeyStore),
	colorSuggestionService: new OpenRouterColorSuggestionService(apiKeyStore)
});
