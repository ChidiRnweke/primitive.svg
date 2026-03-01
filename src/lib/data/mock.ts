import type { PresetPack, ProjectRecord } from '$lib/domain/types';
import { DEFAULT_MODEL_ID } from '$lib/ai/models';

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
		modelId: DEFAULT_MODEL_ID,
		name: 'EcoShop Mobile App',
		desc: 'Organic, leafy shapes, soft minimal lines, friendly.',
		iconCount: 14,
		lastEdited: '2024-10-24',
		createdAt: '2024-10-24T09:00:00.000Z',
		updatedAt: '2024-10-24T09:00:00.000Z'
	},
	{
		id: '2',
		modelId: DEFAULT_MODEL_ID,
		name: 'DevTools Pro Interface',
		desc: 'Technical, grid-aligned, sharp geometric edges, precise.',
		iconCount: 32,
		lastEdited: '2024-10-22',
		createdAt: '2024-10-22T08:00:00.000Z',
		updatedAt: '2024-10-22T08:00:00.000Z'
	},
	{
		id: '3',
		modelId: DEFAULT_MODEL_ID,
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
	const key = name.toLowerCase();
	const strokeColor = '#F7F5F2';
	const highlight = '#FF3E00';
	const lineWidth = styleTheme === 'minimal' ? 3 : 2;
	const lineCap = styleTheme === 'minimal' ? 'round' : 'square';
	const lineJoin = styleTheme === 'minimal' ? 'round' : 'miter';
	const cornerRadius = styleTheme === 'minimal' ? 8 : 0;

	const iconMap: Record<string, string> = {
		'primary mark':
			styleTheme === 'minimal'
				? `<path d="M50 15 C20 15 20 50 20 50 C20 80 50 80 50 80 C80 80 80 50 80 50 C80 15 50 15 50 15 Z" stroke="${strokeColor}" stroke-width="${lineWidth}" stroke-linejoin="${lineJoin}" /><path d="M50 15 C65 40 65 60 50 80" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" />`
				: `<rect x="25" y="25" width="50" height="50" stroke="${strokeColor}" stroke-width="${lineWidth}" /><circle cx="50" cy="50" r="12" fill="${highlight}" /><path d="M50 20 V80 M20 50 H80" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="2 2" />`,
		'leaf motif': `<path d="M25 75 C25 45 45 25 75 25 C75 50 55 75 25 75 Z" stroke="${strokeColor}" stroke-width="${lineWidth}" stroke-linejoin="${lineJoin}" /><path d="M25 75 C45 60 55 45 75 25" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" />`,
		'eco badge': `<circle cx="50" cy="50" r="30" stroke="${strokeColor}" stroke-width="${lineWidth}" /><path d="M35 55 L45 65 L65 35" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" /><circle cx="50" cy="50" r="22" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4 4" />`,
		'cart (ui)': `<path d="M30 40 H70 V70 C70 75 65 80 60 80 H40 C35 80 30 75 30 70 V40 Z" stroke="${strokeColor}" stroke-width="${lineWidth}" stroke-linejoin="${lineJoin}" /><path d="M40 40 V30 C40 22 60 22 60 30 V40" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" />`,
		'user (ui)': `<circle cx="50" cy="35" r="15" stroke="${strokeColor}" stroke-width="${lineWidth}" /><path d="M20 80 C20 60 35 55 50 55 C65 55 80 60 80 80" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" />`,
		menu: `<path d="M30 35 H70 M30 50 H55 M30 65 H70" stroke="${strokeColor}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" /><circle cx="70" cy="50" r="3" fill="${highlight}" />`,
		'system logo': `<rect x="20" y="20" width="60" height="60" stroke="${strokeColor}" stroke-width="${lineWidth}" /><path d="M20 40 H80 M20 60 H80 M40 20 V80 M60 20 V80" stroke="${highlight}" stroke-width="1" stroke-dasharray="3 3" />`,
		'api node': `<rect x="40" y="40" width="20" height="20" stroke="${highlight}" stroke-width="${lineWidth}" /><path d="M50 20 V40 M50 60 V80 M20 50 H40 M60 50 H80" stroke="${strokeColor}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" /><circle cx="50" cy="20" r="4" fill="${strokeColor}" /><circle cx="50" cy="80" r="4" fill="${strokeColor}" /><circle cx="20" cy="50" r="4" fill="${strokeColor}" /><circle cx="80" cy="50" r="4" fill="${strokeColor}" />`,
		terminal: `<rect x="20" y="25" width="60" height="50" rx="${cornerRadius}" stroke="${strokeColor}" stroke-width="${lineWidth}" /><path d="M32 42 L40 50 L32 58" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" /><line x1="45" y1="58" x2="55" y2="58" stroke="${strokeColor}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" />`,
		database: `<path d="M30 30 C30 20 70 20 70 30 V70 C70 80 30 80 30 70 V30 Z" stroke="${strokeColor}" stroke-width="${lineWidth}" /><ellipse cx="50" cy="30" rx="20" ry="8" stroke="${strokeColor}" stroke-width="${lineWidth}" fill="none" /><path d="M30 50 C30 60 70 60 70 50" stroke="${highlight}" stroke-width="${lineWidth}" fill="none" />`,
		'settings (ui)': `<circle cx="50" cy="50" r="12" stroke="${strokeColor}" stroke-width="${lineWidth}" /><path d="M50 20 V30 M50 70 V80 M20 50 H30 M70 50 H80 M29 29 L36 36 M64 64 L71 71 M71 29 L64 36 M36 64 L29 71" stroke="${highlight}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" />`
	};

	const shapeHtml =
		iconMap[key] ??
		`<rect x="26" y="26" width="48" height="48" fill="none" stroke="${strokeColor}" stroke-width="${lineWidth}" /><circle cx="50" cy="50" r="4" fill="${highlight}" />`;

	return `
		<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
			${shapeHtml}
		</svg>
	`;
};
