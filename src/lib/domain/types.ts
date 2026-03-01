export interface PresetPack {
	name: string;
	icons: string[];
	spec: string;
}

export interface GeneratedSvg {
	id: string;
	name: string;
	code: string;
	status: 'generating' | 'done';
	variant: number;
	styleControls: SvgStyleControls;
	retryHistory: SvgRetryRecord[];
}

export interface SvgStyleControls {
	palette: string[];
	strokeWidth: number;
}

export interface SvgRetryRecord {
	phase: 'generate' | 'remix';
	errorType: string;
	message: string;
	modelId: string;
	timestamp: string;
	rawModelOutput?: string;
	correctionOutput?: string;
}

export interface ProjectRecord {
	id: string;
	modelId: string;
	name: string;
	desc: string;
	iconCount: number;
	lastEdited: string;
	createdAt: string;
	updatedAt: string;
	suggestedIcons: string[];
	selectedIcons: string[];
	generatedSVGs: GeneratedSvg[];
}
