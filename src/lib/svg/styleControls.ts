import type { SvgStyleControls } from '$lib/domain/types';

const DEFAULT_PALETTE = ['#0F0F0F', '#FF3E00'];
const DEFAULT_STROKE_WIDTH = 2;

export const normalizeHex = (input: string) => {
	const value = input.trim();
	if (!value) {
		return null;
	}

	const prefixed = value.startsWith('#') ? value : `#${value}`;
	if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(prefixed)) {
		return null;
	}

	if (prefixed.length === 4) {
		const [r, g, b] = prefixed.slice(1).split('');
		return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
	}

	return prefixed.toUpperCase();
};

export const extractColorsFromSvg = (svg: string) => {
	const colorPattern = /(stroke|fill)\s*=\s*"(#[0-9a-fA-F]{3,6})"/g;
	const discovered: string[] = [];
	let match = colorPattern.exec(svg);

	while (match) {
		const normalized = normalizeHex(match[2]);
		if (normalized && !discovered.includes(normalized)) {
			discovered.push(normalized);
		}

		match = colorPattern.exec(svg);
	}

	return discovered.length > 0 ? discovered.slice(0, 8) : [...DEFAULT_PALETTE];
};

export const extractStrokeWidthFromSvg = (svg: string) => {
	const strokeWidthMatch = svg.match(/stroke-width\s*=\s*"([0-9.]+)"/i);
	if (!strokeWidthMatch) {
		return DEFAULT_STROKE_WIDTH;
	}

	const parsed = Number(strokeWidthMatch[1]);
	if (!Number.isFinite(parsed)) {
		return DEFAULT_STROKE_WIDTH;
	}

	return Math.max(1, Math.min(8, Math.round(parsed)));
};

export const normalizeSvgWithStyleVariables = (svg: string) => {
	const colorMap = new Map<string, number>();
	let nextIndex = 1;

	const colorized = svg.replace(/\b(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, (full, attr, hex) => {
		const normalized = normalizeHex(hex);
		if (!normalized) {
			return full;
		}

		if (!colorMap.has(normalized)) {
			colorMap.set(normalized, nextIndex);
			nextIndex += 1;
		}

		const index = colorMap.get(normalized) ?? 1;
		return `${attr}="var(--icon-color-${index}, ${normalized})"`;
	});

	const width = extractStrokeWidthFromSvg(colorized);
	const withVariableStroke = colorized.replace(/\bstroke-width="[0-9.]+"/g, () => {
		return `stroke-width="var(--icon-stroke-width, ${width})"`;
	});

	const palette = Array.from(colorMap.keys());
	if (palette.length === 0) {
		palette.push(...extractColorsFromSvg(svg));
	}

	return {
		svg: withVariableStroke,
		styleControls: {
			palette: palette.slice(0, 8),
			strokeWidth: width
		} satisfies SvgStyleControls
	};
};

export const styleControlsToCssVars = (controls: SvgStyleControls) => {
	const tokens: string[] = [];

	controls.palette.forEach((color, index) => {
		const normalized = normalizeHex(color);
		if (normalized) {
			tokens.push(`--icon-color-${index + 1}: ${normalized}`);
		}
	});

	tokens.push(`--icon-stroke-width: ${Math.max(1, Math.min(8, Math.round(controls.strokeWidth)))}`);
	return tokens.join('; ');
};
