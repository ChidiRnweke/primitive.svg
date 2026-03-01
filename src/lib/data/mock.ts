import type { PresetPack, ProjectRecord } from '$lib/domain/types';

export const PRESET_PACKS: PresetPack[] = [
	{
		name: 'Core Navigation',
		icons: ['Home', 'Search', 'Menu', 'User', 'Settings'],
		spec: 'SYS.01'
	},
	{ name: 'Commerce Layer', icons: ['Cart', 'Store', 'Tag', 'Bag', 'Receipt'], spec: 'COM.02' },
	{ name: 'Social Graph', icons: ['Heart', 'Comment', 'Share', 'Bookmark', 'Bell'], spec: 'SOC.03' }
];

export const DEMOS = [
	{
		name: 'EcoShop Mobile App',
		prompt: 'Organic, leafy shapes, soft minimal lines, thick strokes.',
		style: 'minimal',
		icons: ['Primary Mark', 'Leaf Motif', 'Eco Badge', 'Cart (UI)', 'User (UI)', 'Menu']
	},
	{
		name: 'DevTools Pro Interface',
		prompt: 'Technical, grid-aligned, sharp geometric edges, precise.',
		style: 'technical',
		icons: ['System Logo', 'API Node', 'Terminal', 'Database', 'Settings (UI)', 'Menu']
	}
] as const;

export const MOCK_PROJECTS: Omit<
	ProjectRecord,
	'suggestedIcons' | 'selectedIcons' | 'generatedSVGs'
>[] = [
	{
		id: '1',
		name: 'EcoShop Mobile App',
		desc: 'Organic, leafy shapes, soft minimal lines, friendly.',
		iconCount: 14,
		lastEdited: '2024-10-24',
		createdAt: '2024-10-24T09:00:00.000Z',
		updatedAt: '2024-10-24T09:00:00.000Z'
	},
	{
		id: '2',
		name: 'DevTools Pro Interface',
		desc: 'Technical, grid-aligned, sharp geometric edges, precise.',
		iconCount: 32,
		lastEdited: '2024-10-22',
		createdAt: '2024-10-22T08:00:00.000Z',
		updatedAt: '2024-10-22T08:00:00.000Z'
	},
	{
		id: '3',
		name: 'Personal Portfolio',
		desc: 'High contrast, bold, brutalist primitives.',
		iconCount: 8,
		lastEdited: '2024-10-15',
		createdAt: '2024-10-15T10:00:00.000Z',
		updatedAt: '2024-10-15T10:00:00.000Z'
	}
];

export const inferSuggestions = (name: string, desc: string) => {
	const combinedContext = `${name} ${desc}`.toLowerCase();

	if (
		combinedContext.includes('eco') ||
		combinedContext.includes('plant') ||
		combinedContext.includes('organic')
	) {
		return [
			'Primary Brand Mark',
			'Leaf Emblem',
			'Sustainability Badge',
			'Growth Motif',
			'Eco Certification'
		];
	}

	if (
		combinedContext.includes('dev') ||
		combinedContext.includes('code') ||
		combinedContext.includes('tech') ||
		combinedContext.includes('data')
	) {
		return ['System Logo', 'Terminal Icon', 'API Node Badge', 'Database Cylinder', 'Logic Gate'];
	}

	if (combinedContext.includes('portfolio') || combinedContext.includes('personal')) {
		return [
			'Personal Monogram',
			'Signature Mark',
			'Resume Icon',
			'Project Placeholder',
			'Contact Badge'
		];
	}

	return [
		'Primary App Logo',
		'Secondary Mark',
		'Favicon',
		'Feature Graphic 1',
		'Empty State Graphic'
	];
};

export const inferStyleTheme = (desc: string) =>
	desc.toLowerCase().includes('minimal') ? 'minimal' : 'technical';

export const toDateStamp = (isoDate: string) => isoDate.slice(0, 10);

export const createId = () => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return Math.random().toString(36).slice(2, 11);
};

export const generateMockSVGCode = (name: string, variant = 0, styleTheme = 'technical') => {
	const hash =
		name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + Math.max(variant, 0) * 100;

	const strokeColor = '#0F0F0F';
	const highlight = '#FF3E00';
	const shapeType = hash % 4;

	let shapeHtml = '';

	if (styleTheme === 'minimal') {
		if (shapeType === 0) {
			shapeHtml = `<rect x="25" y="25" width="50" height="50" fill="none" stroke="${strokeColor}" stroke-width="3" rx="12" />`;
		} else if (shapeType === 1) {
			shapeHtml = `<circle cx="50" cy="50" r="25" fill="none" stroke="${strokeColor}" stroke-width="3" />`;
		} else if (shapeType === 2) {
			shapeHtml = `<polygon points="50,25 75,65 25,65" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round" />`;
		} else {
			shapeHtml = `<path d="M 25 50 C 40 20, 60 80, 75 50" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" fill="none" />`;
		}
	} else if (shapeType === 0) {
		shapeHtml = `
			<rect x="25" y="25" width="50" height="50" fill="none" stroke="${strokeColor}" stroke-width="2" />
			<circle cx="25" cy="25" r="3" fill="${highlight}" />
			<circle cx="75" cy="25" r="3" fill="${highlight}" />
			<circle cx="25" cy="75" r="3" fill="${highlight}" />
			<circle cx="75" cy="75" r="3" fill="${highlight}" />
		`;
	} else if (shapeType === 1) {
		shapeHtml = `
			<circle cx="50" cy="50" r="30" fill="none" stroke="${strokeColor}" stroke-width="2" />
			<line x1="50" y1="10" x2="50" y2="90" stroke="${strokeColor}" stroke-width="0.5" stroke-dasharray="2 2" />
			<line x1="10" y1="50" x2="90" y2="50" stroke="${strokeColor}" stroke-width="0.5" stroke-dasharray="2 2" />
			<circle cx="50" cy="50" r="3" fill="${highlight}" />
		`;
	} else if (shapeType === 2) {
		shapeHtml = `
			<polygon points="50,20 80,70 20,70" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round" />
			<circle cx="50" cy="20" r="3" fill="${highlight}" />
			<circle cx="80" cy="70" r="3" fill="${highlight}" />
			<circle cx="20" cy="70" r="3" fill="${highlight}" />
		`;
	} else {
		shapeHtml = `
			<path d="M 20 50 C 20 10, 80 10, 80 50 C 80 90, 20 90, 20 50" fill="none" stroke="${strokeColor}" stroke-width="2" />
			<circle cx="20" cy="10" r="2" fill="${highlight}" />
			<circle cx="80" cy="10" r="2" fill="${highlight}" />
		`;
	}

	return `
		<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
			${shapeHtml}
		</svg>
	`;
};
