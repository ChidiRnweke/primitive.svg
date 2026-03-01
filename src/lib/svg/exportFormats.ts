const SVG_TAG_PATTERN = /<svg[\s\S]*<\/svg>/i;
const ROOT_SVG_OPEN_TAG_PATTERN = /<svg\b([^>]*)>/i;

export type ExportFormat = 'svg' | 'jsx' | 'svelte' | 'vue';

const JSX_RESERVED_ATTRS = new Map<string, string>([
	['class', 'className'],
	['for', 'htmlFor']
]);

const FORMAT_LABELS: Record<ExportFormat, string> = {
	svg: 'SVG',
	jsx: 'JSX',
	svelte: 'Svelte',
	vue: 'Vue'
};

const toPascalCase = (value: string) => {
	const words = value
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (words.length === 0) {
		return 'Icon';
	}

	const merged = words
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('');

	if (/^[0-9]/.test(merged)) {
		return `Icon${merged}`;
	}

	return merged;
};

export const toComponentName = (value: string) => {
	const base = toPascalCase(value);
	return base.endsWith('Icon') ? base : `${base}Icon`;
};

export const exportFormatLabel = (format: ExportFormat) => FORMAT_LABELS[format];

export const exportFormatExtension = (format: ExportFormat) => `.${format}`;

const extractSvgMarkup = (code: string) => {
	const match = code.match(SVG_TAG_PATTERN);
	return (match?.[0] ?? code).trim();
};

const normalizeRootClass = (svgMarkup: string) => {
	const openTagMatch = svgMarkup.match(ROOT_SVG_OPEN_TAG_PATTERN);
	if (!openTagMatch) {
		return svgMarkup;
	}

	const attributes = openTagMatch[1] ?? '';
	const classMatch = attributes.match(/\sclass="([^"]*)"/i);
	if (!classMatch) {
		return svgMarkup;
	}

	const remainingClasses = classMatch[1]
		.split(/\s+/)
		.filter((token) => token && token !== 'w-full' && token !== 'h-full');

	const normalizedAttributes =
		remainingClasses.length > 0
			? attributes.replace(/\sclass="([^"]*)"/i, ` class="${remainingClasses.join(' ')}"`)
			: attributes.replace(/\sclass="([^"]*)"/i, '');

	return svgMarkup.replace(ROOT_SVG_OPEN_TAG_PATTERN, `<svg${normalizedAttributes}>`);
};

const camelizeAttributeName = (attributeName: string) => {
	if (attributeName.startsWith('data-') || attributeName.startsWith('aria-')) {
		return attributeName;
	}

	if (JSX_RESERVED_ATTRS.has(attributeName)) {
		return JSX_RESERVED_ATTRS.get(attributeName) ?? attributeName;
	}

	return attributeName.replace(/[-:]([a-z])/g, (_, char: string) => char.toUpperCase());
};

const toJsxSvgMarkup = (svgMarkup: string) =>
	svgMarkup
		.replace(/<svg\b([^>]*)>/i, '<svg$1 {...props}>')
		.replace(/<([a-zA-Z][^\s/>]*)([^>]*)>/g, (_, tagName: string, attributes: string) => {
			const normalizedAttributes = attributes.replace(
				/(\s+)([a-zA-Z_:][a-zA-Z0-9_.:-]*)(=)/g,
				(_, spacing: string, attrName: string, equals: string) => {
					return `${spacing}${camelizeAttributeName(attrName)}${equals}`;
				}
			);

			return `<${tagName}${normalizedAttributes}>`;
		});

const indentMultiline = (value: string, indent = '    ') =>
	value
		.split('\n')
		.map((line) => `${indent}${line}`)
		.join('\n');

export const svgToJsxComponent = (iconName: string, svgCode: string) => {
	const componentName = toComponentName(iconName);
	const svgMarkup = normalizeRootClass(extractSvgMarkup(svgCode));
	const jsxSvgMarkup = toJsxSvgMarkup(svgMarkup);

	return `import * as React from 'react';

export default function ${componentName}(props) {
  return (
${indentMultiline(jsxSvgMarkup, '    ')}
  );
}
`;
};

export const svgToSvelteComponent = (svgCode: string) => {
	const svgMarkup = normalizeRootClass(extractSvgMarkup(svgCode));

	return `${svgMarkup}
`;
};

export const svgToVueComponent = (svgCode: string) => {
	const svgMarkup = normalizeRootClass(extractSvgMarkup(svgCode)).replace(
		/<svg\b([^>]*)>/i,
		'<svg$1 v-bind="$attrs">'
	);

	return `<template>
${indentMultiline(svgMarkup, '  ')}
</template>
`;
};
