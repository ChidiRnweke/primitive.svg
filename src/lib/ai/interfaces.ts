import type { GeneratedSvg } from '$lib/domain/types';

export interface SuggestIconsInput {
	projectName: string;
	projectDescription: string;
}

export interface GenerateSvgInput {
	projectName: string;
	projectDescription: string;
	iconName: string;
}

export interface RemixSvgInput {
	projectName: string;
	projectDescription: string;
	iconName: string;
	currentSvg: string;
	remixPrompt: string;
	variant: number;
}

export interface IconSuggestionService {
	suggestIcons(input: SuggestIconsInput): Promise<string[]>;
}

export interface SvgGenerationService {
	generateSvg(input: GenerateSvgInput): Promise<string>;
	remixSvg(input: RemixSvgInput): Promise<string>;
}

export interface AiServices {
	iconSuggestionService: IconSuggestionService;
	svgGenerationService: SvgGenerationService;
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

export const cloneGeneratedSvg = (svg: GeneratedSvg): GeneratedSvg => ({
	id: svg.id,
	name: svg.name,
	code: svg.code,
	status: svg.status,
	variant: svg.variant
});
