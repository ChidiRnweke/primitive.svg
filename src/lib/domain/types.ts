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
}

export interface ProjectRecord {
	id: string;
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
