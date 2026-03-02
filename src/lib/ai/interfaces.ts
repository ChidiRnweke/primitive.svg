import type { GeneratedSvg } from '$lib/domain/types';

export interface SuggestIconsInput {
	projectName: string;
	projectDescription: string;
	modelId: string;
}

export interface GenerateSvgInput {
	projectName: string;
	projectDescription: string;
	iconName: string;
	modelId: string;
	colorPalette?: string[];
	strokeWidth?: number;
	retryContext?: RetryContextEntry[];
}

export interface RemixSvgInput {
	projectName: string;
	projectDescription: string;
	iconName: string;
	currentSvg: string;
	remixPrompt: string;
	variant: number;
	modelId: string;
	colorPalette?: string[];
	strokeWidth?: number;
	retryContext?: RetryContextEntry[];
}

export interface RetryContextEntry {
	errorType: string;
	message: string;
	rawModelOutput?: string;
	correctionOutput?: string;
	timestamp: string;
}

export interface ModelInfo {
	id: string;
	name: string;
	provider: string;
}

export interface IconSuggestionService {
	suggestIcons(input: SuggestIconsInput): Promise<string[]>;
}

export interface ModelCatalogService {
	listModels(): Promise<ModelInfo[]>;
}

export interface SvgGenerationService {
	generateSvg(input: GenerateSvgInput): Promise<string>;
	remixSvg(input: RemixSvgInput): Promise<string>;
}

export interface SuggestColorsInput {
	prompt: string;
	modelId: string;
}

export interface ColorSuggestionService {
	suggestColors(input: SuggestColorsInput): Promise<string[]>;
}

export interface AiServices {
	iconSuggestionService: IconSuggestionService;
	svgGenerationService: SvgGenerationService;
	modelCatalogService: ModelCatalogService;
	colorSuggestionService: ColorSuggestionService;
}

export interface ApiKeyStore {
	getKey(): string | null;
	setKey(key: string, persist: boolean): void;
	clear(): void;
	isPersisted(): boolean;
}

export class MissingApiKeyError extends Error {
	constructor() {
		super('Missing OpenRouter API key');
		this.name = 'MissingApiKeyError';
	}
}

export class AiResponseValidationError extends Error {
	errorType: string;
	modelId: string;
	rawModelOutput: string;
	correctionOutput: string;

	constructor(params: {
		errorType: string;
		message: string;
		modelId: string;
		rawModelOutput: string;
		correctionOutput?: string;
	}) {
		super(params.message);
		this.name = 'AiResponseValidationError';
		this.errorType = params.errorType;
		this.modelId = params.modelId;
		this.rawModelOutput = params.rawModelOutput;
		this.correctionOutput = params.correctionOutput ?? '';
	}
}

export const cloneGeneratedSvg = (svg: GeneratedSvg): GeneratedSvg => ({
	id: svg.id,
	name: svg.name,
	code: svg.code,
	status: svg.status,
	variant: svg.variant,
	styleControls: {
		palette: [...svg.styleControls.palette],
		strokeWidth: svg.styleControls.strokeWidth
	},
	retryHistory: svg.retryHistory.map((entry) => ({ ...entry }))
});
