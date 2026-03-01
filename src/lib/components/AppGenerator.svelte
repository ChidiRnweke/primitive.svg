<script module lang="ts">
	const projectViewCache = new Map<string, unknown>();
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import JSZip from 'jszip';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import {
		CheckSquare,
		Code,
		Download,
		Key,
		Layers,
		MousePointer2,
		PenTool,
		Plus,
		RotateCcw,
		Settings2,
		Square,
		HelpCircle
	} from '@lucide/svelte';
	import { DEFAULT_MODEL_ID } from '$lib/ai/models';
	import { createAiServices, openRouterApiKeyStore } from '$lib/ai/factory';
	import { AiResponseValidationError, MissingApiKeyError } from '$lib/ai/interfaces';
	import type { ModelInfo } from '$lib/ai/interfaces';
	import ModelPicker from '$lib/components/ModelPicker.svelte';
	import OpenRouterKeyModal from '$lib/components/OpenRouterKeyModal.svelte';
	import RegistrationMark from '$lib/components/RegistrationMark.svelte';
	import type {
		GeneratedSvg,
		ProjectRecord,
		SvgRetryRecord,
		SvgStyleControls
	} from '$lib/domain/types';
	import { PRESET_PACKS, createId } from '$lib/data/mock';
	import { createProject, getProjectById, updateProject } from '$lib/data/projects';
	import {
		extractColorsFromSvg,
		extractStrokeWidthFromSvg,
		normalizeHex,
		normalizeSvgWithStyleVariables,
		styleControlsToCssVars
	} from '$lib/svg/styleControls';
	import {
		exportFormatExtension,
		exportFormatLabel,
		svgToJsxComponent,
		svgToSvelteComponent,
		svgToVueComponent,
		toComponentName
	} from '$lib/svg/exportFormats';
	import type { ExportFormat } from '$lib/svg/exportFormats';

	interface Props {
		projectId?: string | null;
		view?: 'icons' | 'results' | 'all';
	}

	let { projectId = null, view = 'all' }: Props = $props();
	const getInitialProjectId = () => projectId;
	const initialProjectId = getInitialProjectId();
	let initialCachedProject: ProjectRecord | undefined;
	if (initialProjectId) {
		initialCachedProject = projectViewCache.get(initialProjectId) as ProjectRecord | undefined;
	}

	let step = $state(1);
	let appName = $state('');
	let appDesc = $state('');
	let manualIconInput = $state('');
	let keywordBatchInput = $state('');

	let isLoadingProject = $state(false);
	let projectNotFound = $state(false);

	let isSuggesting = $state(false);
	let isKeywordSuggesting = $state(false);
	let suggestedIcons = $state<string[]>([]);
	let selectedIcons = $state(new Set<string>());

	let isGenerating = $state(false);
	let generatedSVGs = $state<GeneratedSvg[]>([]);

	let remixingSvg = $state<GeneratedSvg | null>(null);
	let remixPrompt = $state('');

	let currentProjectId = $state<string | null>(null);
	let hasApiKey = $state(false);
	let isApiKeyModalOpen = $state(false);
	let isModelPickerOpen = $state(false);
	let generationError = $state('');
	let actionNotice = $state('');
	let actionNoticeTone = $state<'success' | 'error'>('success');
	let selectedModelId = $state(DEFAULT_MODEL_ID);
	let availableModels = $state<ModelInfo[]>([]);
	let isLoadingModels = $state(false);
	let modelListError = $state('');
	let remixColors = $state<string[]>(['#0F0F0F', '#FF3E00']);
	let remixStrokeWidth = $state(2);
	let exportFormat = $state<ExportFormat>('svg');

	const aiServices = createAiServices();
	const isIconsPage = $derived(view === 'icons');
	const isResultsPage = $derived(view === 'results');

	if (initialProjectId) {
		currentProjectId = initialProjectId;
		isLoadingProject = !initialCachedProject;
	}

	const ERROR_SVG = `
		<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
			<rect x="12" y="12" width="76" height="76" stroke="#0F0F0F" stroke-width="3" />
			<path d="M30 30 L70 70" stroke="#FF3E00" stroke-width="4" stroke-linecap="round" />
			<path d="M70 30 L30 70" stroke="#FF3E00" stroke-width="4" stroke-linecap="round" />
		</svg>
	`;

	const defaultStyleControls = (): SvgStyleControls => ({
		palette: ['#0F0F0F', '#FF3E00'],
		strokeWidth: 2
	});

	const ensureSvgDefaults = (svg: GeneratedSvg): GeneratedSvg => {
		const normalized = normalizeSvgWithStyleVariables(svg.code || ERROR_SVG);
		const styleControls = svg.styleControls ?? normalized.styleControls;

		return {
			...svg,
			code: svg.code ? normalized.svg : normalized.svg,
			styleControls,
			retryHistory: svg.retryHistory ?? []
		};
	};

	const makeRetryRecord = (
		phase: 'generate' | 'remix',
		error: unknown,
		modelId: string
	): SvgRetryRecord => {
		if (error instanceof AiResponseValidationError) {
			return {
				phase,
				errorType: error.errorType,
				message: error.message,
				modelId,
				timestamp: new Date().toISOString(),
				rawModelOutput: error.rawModelOutput,
				correctionOutput: error.correctionOutput
			};
		}

		return {
			phase,
			errorType: 'request_error',
			message: error instanceof Error ? error.message : 'Unknown error',
			modelId,
			timestamp: new Date().toISOString()
		};
	};

	const withRetryRecord = (svg: GeneratedSvg, record: SvgRetryRecord): GeneratedSvg => ({
		...svg,
		retryHistory: [...svg.retryHistory, record].slice(-5)
	});

	const getRetryContext = (svg: GeneratedSvg) =>
		svg.retryHistory.slice(-3).map((entry) => ({
			errorType: entry.errorType,
			message: entry.message,
			rawModelOutput: entry.rawModelOutput,
			correctionOutput: entry.correctionOutput,
			timestamp: entry.timestamp
		}));

	const refreshApiKeyState = () => {
		hasApiKey = Boolean(openRouterApiKeyStore.getKey());
	};

	const toUserFacingError = (error: unknown, fallback: string) => {
		if (error instanceof MissingApiKeyError) {
			isApiKeyModalOpen = true;
			return 'Set your OpenRouter API key to continue.';
		}

		if (error instanceof Error && error.message.trim().length > 0) {
			return error.message;
		}

		return fallback;
	};

	const setActionNotice = (message: string, tone: 'success' | 'error') => {
		actionNotice = message;
		actionNoticeTone = tone;
		window.setTimeout(() => {
			actionNotice = '';
		}, 2400);
	};

	const selectedModelLabel = $derived.by(() => {
		const selected = availableModels.find((model) => model.id === selectedModelId);
		return selected?.id ?? selectedModelId;
	});

	const loadModels = async () => {
		if (!hasApiKey) {
			modelListError = 'Set your OpenRouter API key to load model catalog.';
			return;
		}

		isLoadingModels = true;
		modelListError = '';

		try {
			const models = await aiServices.modelCatalogService.listModels();
			availableModels = models;

			if (!models.some((model) => model.id === selectedModelId)) {
				availableModels = [
					{
						id: selectedModelId,
						name: selectedModelId,
						provider: selectedModelId.split('/')[0] ?? 'other'
					},
					...models
				];
			}
		} catch (error) {
			modelListError = toUserFacingError(error, 'Failed to load model catalog.');
		} finally {
			isLoadingModels = false;
		}
	};

	const hydrateFromProject = (project: ProjectRecord) => {
		if (project.id) {
			projectViewCache.set(project.id, project);
		}

		selectedModelId = project.modelId;
		if (!availableModels.some((model) => model.id === project.modelId)) {
			availableModels = [
				{
					id: project.modelId,
					name: project.modelId,
					provider: project.modelId.split('/')[0] ?? 'other'
				},
				...availableModels
			];
		}

		appName = project.name;
		appDesc = project.desc;
		suggestedIcons = [...project.suggestedIcons];
		selectedIcons = new Set(project.selectedIcons);
		generatedSVGs = project.generatedSVGs.map(ensureSvgDefaults);

		const inferredStep =
			project.generatedSVGs.length > 0 ? 3 : project.suggestedIcons.length > 0 ? 2 : 1;
		step = isIconsPage ? 2 : isResultsPage ? 3 : inferredStep;
	};

	if (initialCachedProject) {
		hydrateFromProject(initialCachedProject);
	}

	const startTour = () => {
		const steps: any[] = [];

		if (step === 1 && !isResultsPage) {
			steps.push(
				{
					element: '#project-name',
					popover: { title: 'Project Name', description: 'Give your design system a clear name.', side: 'bottom', align: 'start' }
				},
				{
					element: '#project-rules',
					popover: { title: 'Aesthetic Rules', description: 'Define the visual style here (e.g. minimalist, 2px stroke, brutalist). This steers the AI.', side: 'bottom', align: 'start' }
				}
			);
		} else if (step === 2 && !isResultsPage) {
			steps.push(
				{
					element: '#tour-suggested-assets',
					popover: { title: 'Suggested Assets', description: 'Select the icons you want to generate. You can add more manually or generate a batch based on a keyword.', side: 'bottom', align: 'start' }
				},
				{
					element: '#tour-generate-btn',
					popover: { title: 'Generate SVGs', description: 'Once you selected your icons, click here to render them using your connected AI model.', side: 'top', align: 'end' }
				}
			);
		} else if (step === 3 || isResultsPage) {
			steps.push(
				{
					element: '#tour-generated-vectors',
					popover: { title: 'Generated Vectors', description: 'Here are your results. You can hover over any icon to edit its style or retry the generation.', side: 'bottom', align: 'start' }
				},
				{
					element: '#tour-export-pack',
					popover: { title: 'Export Pack', description: 'Download your entire icon set as a ZIP file in your preferred format (SVG, JSX, Svelte, Vue).', side: 'bottom', align: 'end' }
				}
			);
		}

		if (steps.length === 0) return;

		const driverObj = driver({ showProgress: true, steps });
		driverObj.drive();
	};

	onMount(async () => {
		refreshApiKeyState();
		if (hasApiKey) {
			await loadModels();
		}

		// Auto-start tour logic
		const tourKey = `primitive_app_tour_step_${step}`;
		if (localStorage.getItem(tourKey) !== 'true') {
			setTimeout(() => {
				startTour();
				localStorage.setItem(tourKey, 'true');
			}, 1000);
		}

		if (!currentProjectId) {
			step = isResultsPage ? 3 : 1;
			return;
		}

		const cached =
			initialCachedProject ??
			(projectViewCache.get(currentProjectId) as ProjectRecord | undefined) ??
			undefined;
		if (cached && !initialCachedProject) {
			hydrateFromProject(cached);
		}

		isLoadingProject = !cached;
		const existing = await getProjectById(currentProjectId);
		isLoadingProject = false;

		if (!existing) {
			projectNotFound = true;
			return;
		}

		hydrateFromProject(existing);
	});

	const persist = async (navigateOnCreate = false) => {
		if (!appName || !appDesc) {
			return;
		}

		const payload = {
			modelId: selectedModelId,
			name: appName,
			desc: appDesc,
			suggestedIcons,
			selectedIcons: Array.from(selectedIcons),
			generatedSVGs
		};

		if (currentProjectId) {
			await updateProject(currentProjectId, payload);
			return;
		}

		const created = await createProject(payload);
		currentProjectId = created.id;
		if (navigateOnCreate) {
			const suffix = isResultsPage ? 'results' : 'icons';
			await goto(`/projects/${created.id}/${suffix}`);
		}
	};

	const mergeIcons = (icons: string[]) => {
		const merged = new Set([...suggestedIcons, ...icons]);
		suggestedIcons = Array.from(merged);
		const next = new Set(selectedIcons);
		for (const icon of icons) {
			next.add(icon);
		}
		selectedIcons = next;
	};

	const handleSuggest = async () => {
		if (!appName || !appDesc) {
			return;
		}
		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before generating suggestions.';
			isApiKeyModalOpen = true;
			return;
		}

		generationError = '';
		isSuggesting = true;
		try {
			const dynamicSuggestions = await aiServices.iconSuggestionService.suggestIcons({
				projectName: appName,
				projectDescription: appDesc,
				modelId: selectedModelId
			});

			suggestedIcons = dynamicSuggestions;
			selectedIcons = new Set(dynamicSuggestions.slice(0, 3));
			step = 2;
			await persist(!projectId);
		} catch (error) {
			generationError = toUserFacingError(error, 'Failed to fetch icon suggestions.');
		} finally {
			isSuggesting = false;
		}
	};

	const handleAddManualIcon = () => {
		const normalized = manualIconInput.trim();
		if (!normalized) {
			return;
		}

		mergeIcons([normalized]);
		manualIconInput = '';
		void persist();
	};

	const handleKeywordBatch = async () => {
		if (!keywordBatchInput.trim()) {
			return;
		}
		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before generating keyword icons.';
			isApiKeyModalOpen = true;
			return;
		}

		isKeywordSuggesting = true;
		generationError = '';
		try {
			const icons = await aiServices.iconSuggestionService.suggestIcons({
				projectName: `${appName} · ${keywordBatchInput.trim()}`,
				projectDescription: `${appDesc}\nFocus keyword: ${keywordBatchInput.trim()}\nReturn icon ideas tightly related to this keyword.`,
				modelId: selectedModelId
			});
			mergeIcons(icons);
			keywordBatchInput = '';
			await persist();
		} catch (error) {
			generationError = toUserFacingError(error, 'Failed to generate keyword icon batch.');
		} finally {
			isKeywordSuggesting = false;
		}
	};

	const toggleIconSelection = (icon: string) => {
		const next = new Set(selectedIcons);
		if (next.has(icon)) {
			next.delete(icon);
		} else {
			next.add(icon);
		}
		selectedIcons = next;
		void persist();
	};

	const applyPreset = (icons: string[]) => {
		mergeIcons(icons);
		void persist();
	};

	const normalizeGeneratedSvg = (rawCode: string) => normalizeSvgWithStyleVariables(rawCode);

	const createSvgRecord = (name: string): GeneratedSvg => ({
		id: createId(),
		name,
		code: '',
		status: 'generating',
		variant: 0,
		styleControls: defaultStyleControls(),
		retryHistory: []
	});

	const goToResultsRoute = async () => {
		if (!currentProjectId) {
			return;
		}
		await goto(`/projects/${currentProjectId}/results`);
	};

	const handleGenerate = async () => {
		if (selectedIcons.size === 0) {
			return;
		}
		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before generating SVGs.';
			isApiKeyModalOpen = true;
			return;
		}

		generationError = '';
		step = 3;
		isGenerating = true;

		const newSVGs = Array.from(selectedIcons).map(createSvgRecord);
		generatedSVGs = newSVGs;
		await persist();

		for (const svg of newSVGs) {
			try {
				const code = await aiServices.svgGenerationService.generateSvg({
					projectName: appName,
					projectDescription: appDesc,
					iconName: svg.name,
					modelId: selectedModelId,
					retryContext: getRetryContext(svg)
				});
				const normalized = normalizeGeneratedSvg(code);
				generatedSVGs = generatedSVGs.map((item) =>
					item.id === svg.id
						? {
								...item,
								status: 'done',
								code: normalized.svg,
								styleControls: normalized.styleControls
							}
						: item
				);
			} catch (error) {
				generationError = toUserFacingError(error, 'Failed to generate one or more SVGs.');
				const fallback = normalizeGeneratedSvg(ERROR_SVG);
				const retryRecord = makeRetryRecord('generate', error, selectedModelId);
				generatedSVGs = generatedSVGs.map((item) =>
					item.id === svg.id
						? withRetryRecord(
								{
									...item,
									status: 'done',
									code: fallback.svg,
									styleControls: fallback.styleControls
								},
								retryRecord
							)
						: item
				);
			}
			await persist();
		}

		isGenerating = false;
		if (isIconsPage) {
			await goToResultsRoute();
		}
	};

	const openRemixEditor = (svg: GeneratedSvg) => {
		remixingSvg = ensureSvgDefaults(svg);
		remixPrompt = '';
		remixColors = [...(svg.styleControls?.palette ?? extractColorsFromSvg(svg.code))];
		remixStrokeWidth = svg.styleControls?.strokeWidth ?? extractStrokeWidthFromSvg(svg.code);
	};

	const updateRemixColor = (index: number, value: string) => {
		const next = [...remixColors];
		next[index] = value;
		remixColors = next;
	};

	const addRemixColor = () => {
		if (remixColors.length >= 8) {
			return;
		}
		remixColors = [...remixColors, '#000000'];
	};

	const removeRemixColor = (index: number) => {
		if (remixColors.length <= 1) {
			return;
		}
		remixColors = remixColors.filter((_, i) => i !== index);
	};

	const handleRemix = async () => {
		if (!remixingSvg) {
			return;
		}
		const targetId = remixingSvg.id;
		const previousCode = remixingSvg.code;
		const nextVariant = remixingSvg.variant + 1;
		const remixInput = remixPrompt.trim();
		const normalizedPalette = remixColors
			.map((color) => normalizeHex(color) ?? '')
			.filter((color) => color.length > 0)
			.slice(0, 8);
		const clampedStrokeWidth = Math.max(1, Math.min(8, Math.round(remixStrokeWidth)));

		generatedSVGs = generatedSVGs.map((item) =>
			item.id === targetId
				? {
						...item,
						styleControls: {
							palette:
								normalizedPalette.length > 0 ? normalizedPalette : item.styleControls.palette,
							strokeWidth: clampedStrokeWidth
						}
					}
				: item
		);

		if (!remixInput) {
			remixingSvg = null;
			await persist();
			setActionNotice('Style controls updated without regeneration.', 'success');
			return;
		}

		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before remixing SVGs.';
			isApiKeyModalOpen = true;
			return;
		}

		generationError = '';
		generatedSVGs = generatedSVGs.map((item) =>
			item.id === targetId ? { ...item, status: 'generating' } : item
		);
		remixingSvg = null;
		remixPrompt = '';

		try {
			const targetSvg = generatedSVGs.find((item) => item.id === targetId);
			const code = await aiServices.svgGenerationService.remixSvg({
				projectName: appName,
				projectDescription: appDesc,
				iconName: targetSvg?.name ?? 'Icon',
				currentSvg: previousCode,
				remixPrompt: remixInput,
				variant: nextVariant,
				modelId: selectedModelId,
				colorPalette: normalizedPalette,
				strokeWidth: clampedStrokeWidth,
				retryContext: targetSvg ? getRetryContext(targetSvg) : []
			});

			const normalized = normalizeGeneratedSvg(code);
			generatedSVGs = generatedSVGs.map((item) =>
				item.id === targetId
					? {
							...item,
							status: 'done',
							variant: nextVariant,
							code: normalized.svg,
							styleControls: {
								palette:
									normalizedPalette.length > 0
										? normalizedPalette
										: normalized.styleControls.palette,
								strokeWidth: clampedStrokeWidth
							}
						}
					: item
			);
		} catch (error) {
			generationError = toUserFacingError(error, 'Failed to remix SVG.');
			const retryRecord = makeRetryRecord('remix', error, selectedModelId);
			generatedSVGs = generatedSVGs.map((item) =>
				item.id === targetId
					? withRetryRecord(
							{
								...item,
								status: 'done',
								code: previousCode,
								styleControls: {
									palette:
										normalizedPalette.length > 0 ? normalizedPalette : item.styleControls.palette,
									strokeWidth: clampedStrokeWidth
								}
							},
							retryRecord
						)
					: item
			);
		}

		await persist();
	};

	const handleRetryIcon = async (svg: GeneratedSvg) => {
		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before retrying an icon.';
			isApiKeyModalOpen = true;
			return;
		}

		generationError = '';
		const previousCode = svg.code;
		const nextVariant = svg.variant + 1;
		generatedSVGs = generatedSVGs.map((item) =>
			item.id === svg.id ? { ...item, status: 'generating' } : item
		);

		try {
			const code = await aiServices.svgGenerationService.generateSvg({
				projectName: appName,
				projectDescription: appDesc,
				iconName: svg.name,
				modelId: selectedModelId,
				retryContext: getRetryContext(svg)
			});
			const normalized = normalizeGeneratedSvg(code);
			generatedSVGs = generatedSVGs.map((item) =>
				item.id === svg.id
					? {
							...item,
							status: 'done',
							variant: nextVariant,
							code: normalized.svg,
							styleControls: item.styleControls
						}
					: item
			);
		} catch (error) {
			generationError = toUserFacingError(error, `Failed to retry ${svg.name}.`);
			const retryRecord = makeRetryRecord('generate', error, selectedModelId);
			generatedSVGs = generatedSVGs.map((item) =>
				item.id === svg.id
					? withRetryRecord({ ...item, status: 'done', code: previousCode }, retryRecord)
					: item
			);
		}

		await persist();
	};

	const handleCopySvg = async (svg: GeneratedSvg) => {
		if (!svg.code) {
			return;
		}

		try {
			await navigator.clipboard.writeText(svg.code);
			setActionNotice(`Copied ${svg.name} SVG code.`, 'success');
		} catch {
			setActionNotice('Copy failed. Clipboard access is unavailable.', 'error');
		}
	};

	const toSafeFileName = (value: string) =>
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'icon';

	const toUniqueFileName = (baseName: string, extension: string, used = new Set<string>()) => {
		let candidate = `${baseName}${extension}`;
		let index = 1;
		while (used.has(candidate)) {
			candidate = `${baseName}-${index}${extension}`;
			index += 1;
		}

		used.add(candidate);
		return candidate;
	};

	const handleExportPack = async () => {
		const doneSvgs = generatedSVGs.filter(
			(svg) => svg.status === 'done' && svg.code.trim().length > 0
		);
		if (doneSvgs.length === 0) {
			setActionNotice('No generated SVGs available for export.', 'error');
			return;
		}

		try {
			const zip = new JSZip();
			const meta = {
				projectId: currentProjectId,
				projectName: appName,
				projectDescription: appDesc,
				modelId: selectedModelId,
				exportFormat,
				exportedAt: new Date().toISOString(),
				iconCount: doneSvgs.length,
				selectedIcons: Array.from(selectedIcons)
			};

			zip.file('manifest.json', JSON.stringify(meta, null, 2));
			const iconsFolder = zip.folder('icons');
			if (!iconsFolder) {
				throw new Error('Failed to initialize zip folder');
			}

			const extension = exportFormatExtension(exportFormat);
			const usedFileNames = new Set<string>();

			for (const svg of doneSvgs) {
				const rawName =
					exportFormat === 'svg' ? toSafeFileName(svg.name) : toComponentName(svg.name);
				const fileName = toUniqueFileName(rawName, extension, usedFileNames);

				if (exportFormat === 'svg') {
					iconsFolder.file(fileName, svg.code);
					continue;
				}

				if (exportFormat === 'jsx') {
					iconsFolder.file(fileName, svgToJsxComponent(svg.name, svg.code));
					continue;
				}

				if (exportFormat === 'svelte') {
					iconsFolder.file(fileName, svgToSvelteComponent(svg.code));
					continue;
				}

				iconsFolder.file(fileName, svgToVueComponent(svg.code));
			}

			const blob = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			const exportSuffix = exportFormat === 'svg' ? '' : `-${exportFormat}`;
			link.download = `${toSafeFileName(appName)}${exportSuffix}-pack.zip`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);

			setActionNotice(
				`Exported ${doneSvgs.length} ${exportFormatLabel(exportFormat)} files as zip.`,
				'success'
			);
		} catch (error) {
			setActionNotice(
				error instanceof Error ? error.message : 'Failed to export zip pack.',
				'error'
			);
		}
	};

	const handleApiKeySaved = () => {
		refreshApiKeyState();
		generationError = '';
		void loadModels();
	};

	const openModelPicker = async () => {
		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before selecting a model.';
			isApiKeyModalOpen = true;
			return;
		}
		isModelPickerOpen = true;
		if (availableModels.length === 0) {
			await loadModels();
		}
	};

	const handleModelSelected = (modelId: string) => {
		selectedModelId = modelId;
		isModelPickerOpen = false;
		void persist();
	};

	const goToIconsPage = async () => {
		if (currentProjectId) {
			await goto(`/projects/${currentProjectId}/icons`);
		}
	};

	const goToResultsPage = async () => {
		if (currentProjectId) {
			await goto(`/projects/${currentProjectId}/results`);
		}
	};

	const cssVarsForSvg = (svg: GeneratedSvg) => styleControlsToCssVars(svg.styleControls);
	const cssVarsForModal = () =>
		styleControlsToCssVars({
			palette: remixColors.map((color) => normalizeHex(color) ?? color),
			strokeWidth: remixStrokeWidth
		});
</script>

{#if isLoadingProject}
	<div class="relative flex min-h-screen flex-col overflow-hidden bg-[#F2F2F0]">
		<div class="bg-drafting-grid pointer-events-none fixed inset-0 z-0"></div>
		<header class="relative z-10 border-b-2 border-[#0F0F0F] bg-[#F2F2F0]">
			<div class="flex h-14 items-center justify-between px-6">
				<div class="h-4 w-28 animate-pulse bg-[#0F0F0F]/20"></div>
				<div class="h-8 w-40 animate-pulse bg-[#0F0F0F]/20"></div>
			</div>
		</header>
		<div
			class="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 border-x-2 border-[#0F0F0F] bg-white"
		>
			<aside class="w-[320px] shrink-0 border-r-2 border-[#0F0F0F] bg-[#F9F9F9] p-6">
				<div class="h-5 w-24 animate-pulse bg-[#0F0F0F]/20"></div>
				<div class="mt-4 h-8 w-full animate-pulse bg-[#0F0F0F]/10"></div>
				<div class="mt-2 h-20 w-full animate-pulse bg-[#0F0F0F]/10"></div>
			</aside>
			<div class="flex-1 p-8">
				<div class="h-8 w-64 animate-pulse bg-[#0F0F0F]/20"></div>
				<div class="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
					{#each Array.from({ length: 6 }) as _, index}
						<div
							class="aspect-square border-2 border-[#0F0F0F]/20 bg-[#F9F9F9]"
							style={`animation-delay:${index * 0.05}s`}
						></div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{:else if projectNotFound}
	<div class="bg-drafting-grid flex min-h-screen items-center justify-center bg-[#F2F2F0] p-8">
		<div
			class="max-w-md border-2 border-[#0F0F0F] bg-white p-8 text-center shadow-[6px_6px_0px_#0F0F0F]"
		>
			<h1 class="mb-3 font-sans text-3xl font-bold uppercase">Project Missing</h1>
			<p class="mb-6 font-mono text-sm text-[#0F0F0F]/70">
				No project with this ID exists in IndexedDB on this device.
			</p>
			<a
				href="/projects"
				class="inline-flex items-center justify-center bg-[#0F0F0F] px-6 py-3 font-mono text-xs font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#FF3E00]"
			>
				Return to Workspace
			</a>
		</div>
	</div>
{:else}
	<div
		class="relative flex min-h-screen flex-col overflow-x-hidden bg-[#F2F2F0] font-sans text-[#0F0F0F]"
	>
		<div class="bg-drafting-grid pointer-events-none fixed inset-0 z-0"></div>

		<header class="relative z-40 border-b-2 border-[#0F0F0F] bg-[#F2F2F0]">
			<div class="flex h-14 items-center justify-between px-6">
				<a class="flex cursor-pointer items-center gap-6" href="/projects">
					<div
						class="flex items-center gap-2 text-[#0F0F0F]/50 transition-colors hover:text-[#0F0F0F]"
					>
						<span class="font-mono text-xs font-bold tracking-tight uppercase">← Workspace</span>
					</div>
				</a>
				{#if currentProjectId}
					<div class="hidden items-center gap-2 md:flex">
						<button
							type="button"
							onclick={goToIconsPage}
							class={`border-2 px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors ${isIconsPage ? 'border-[#0F0F0F] bg-[#0F0F0F] text-white' : 'border-[#0F0F0F] bg-white text-[#0F0F0F] hover:text-[#FF3E00]'}`}
						>
							Icons
						</button>
						<button
							type="button"
							onclick={goToResultsPage}
							class={`border-2 px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors ${isResultsPage ? 'border-[#0F0F0F] bg-[#0F0F0F] text-white' : 'border-[#0F0F0F] bg-white text-[#0F0F0F] hover:text-[#FF3E00]'}`}
						>
							Results
						</button>
					</div>
				{/if}
				<div
					class="flex items-center gap-6 font-mono text-[11px] font-bold tracking-wider uppercase"
				>
					<button
						type="button"
						onclick={startTour}
						class="text-[#0F0F0F]/60 transition-colors hover:text-[#FF3E00]"
						title="Show Help Tour"
					>
						<HelpCircle size={20} />
					</button>
					<button
						id="tour-api-key"
						type="button"
						onclick={() => (isApiKeyModalOpen = true)}
						class={`flex items-center gap-2 px-4 py-2 text-[#F2F2F0] transition-colors ${hasApiKey ? 'bg-[#FF3E00] hover:bg-[#0F0F0F]' : 'bg-[#0F0F0F] hover:bg-[#FF3E00]'}`}
					>
						<Key size={14} />
						{hasApiKey ? 'API Key Connected' : 'Set API Key'}
					</button>
					<button
						type="button"
						onclick={openModelPicker}
						class="flex max-w-[320px] items-center gap-2 border-2 border-[#0F0F0F] px-4 py-2 text-[#0F0F0F] transition-colors hover:bg-[#0F0F0F] hover:text-[#F2F2F0]"
					>
						<Layers size={14} />
						<span class="truncate">{selectedModelLabel}</span>
					</button>
				</div>
			</div>
		</header>

		<main class="relative z-10 flex flex-1 flex-col items-center">
			{#if generationError}
				<div class="w-full max-w-5xl px-6 pt-6 fade-in">
					<div
						class="border-2 border-[#FF3E00] bg-[#FF3E00]/10 px-5 py-3 font-mono text-xs font-bold tracking-wide uppercase"
					>
						{generationError}
					</div>
				</div>
			{/if}

			{#if actionNotice}
				<div class="w-full max-w-5xl px-6 pt-3 fade-in">
					<div
						class={`border-2 px-5 py-3 font-mono text-xs font-bold tracking-wide uppercase ${actionNoticeTone === 'success' ? 'border-[#0F0F0F] bg-[#0F0F0F]/10 text-[#0F0F0F]' : 'border-[#FF3E00] bg-[#FF3E00]/10 text-[#0F0F0F]'}`}
					>
						{actionNotice}
					</div>
				</div>
			{/if}

			{#if step === 1 && !isResultsPage}
				<div class="my-20 w-full max-w-3xl px-6">
					<div class="mb-12 flex items-end justify-between">
						<div>
							<h1 class="mb-2 font-sans text-5xl font-bold tracking-tight uppercase md:text-6xl">
								Design Prompt
							</h1>
							<p class="font-mono text-sm text-[#0F0F0F]/60">
								Describe your project and style to generate a cohesive icon set.
							</p>
						</div>
						<RegistrationMark className="hidden opacity-30 md:block" />
					</div>

					<div class="border-2 border-[#0F0F0F] bg-[#F2F2F0] p-1 shadow-[6px_6px_0px_#0F0F0F]">
						<div class="relative border-2 border-[#0F0F0F] bg-white p-8 md:p-10">
							<div class="space-y-8">
								<div>
									<label
										for="project-name"
										class="mb-2 block font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F] uppercase"
										>Project Name</label
									>
									<input
										id="project-name"
										type="text"
										bind:value={appName}
										placeholder="e.g. Acme Dashboard"
										class="w-full rounded-none border-b-2 border-[#E5E5E5] bg-transparent py-3 font-sans text-2xl font-medium transition-colors outline-none placeholder:text-[#0F0F0F]/20 focus:border-[#FF3E00]"
									/>
								</div>

								<div>
									<label
										for="project-rules"
										class="mb-2 block font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F] uppercase"
										>Aesthetic & Style Rules</label
									>
									<textarea
										id="project-rules"
										bind:value={appDesc}
										placeholder="e.g. Technical drafting style, sharp corners, 2px stroke width, minimal."
										rows={4}
										class="w-full resize-none rounded-none border-2 border-[#E5E5E5] bg-[#F9F9F9] p-4 font-sans text-base transition-colors outline-none placeholder:text-[#0F0F0F]/30 focus:border-[#FF3E00]"
									></textarea>
								</div>

								<div class="border-t-2 border-[#E5E5E5] pt-4">
									<button
										type="button"
										onclick={handleSuggest}
										disabled={!appName || !appDesc || isSuggesting}
										class="flex w-full items-center justify-center gap-2 border-2 border-transparent bg-[#FF3E00] py-4 font-mono text-sm font-bold tracking-wider text-white uppercase transition-colors hover:border-[#0F0F0F] hover:bg-[#0F0F0F] disabled:pointer-events-none disabled:opacity-50"
									>
										{#if isSuggesting}
											Analyzing Request
											<div
												class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
											></div>
										{:else}
											Draft Icon Plan
										{/if}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if step > 1 || isResultsPage}
				<div
					class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col border-x-2 border-[#0F0F0F] bg-white lg:flex-row"
				>
					<aside
						class="flex w-full shrink-0 flex-col border-b-2 border-[#0F0F0F] bg-[#F9F9F9] lg:w-[320px] lg:border-r-2 lg:border-b-0"
					>
						<div class="border-b-2 border-[#0F0F0F] p-6">
							<div class="mb-4 flex items-center justify-between opacity-50">
								<span class="font-mono text-[10px] font-bold tracking-widest uppercase"
									>Active Project</span
								>
								<MousePointer2 size={12} />
							</div>
							<h3 class="mb-2 truncate font-sans text-xl leading-tight font-bold uppercase">
								{appName}
							</h3>
							<p class="line-clamp-3 font-mono text-xs leading-relaxed text-[#0F0F0F]/60">
								"{appDesc}"
							</p>
							<button
								type="button"
								onclick={() => {
									if (isResultsPage) {
										void goToIconsPage();
										return;
									}
									step = 1;
								}}
								class="mt-4 font-mono text-[10px] font-bold tracking-widest text-[#FF3E00] uppercase hover:text-[#0F0F0F]"
							>
								{isResultsPage ? 'Edit Icons' : 'Edit Prompt'}
							</button>
						</div>

						<div class="border-b-2 border-[#0F0F0F] bg-[#F2F2F0] p-6">
							<div
								class="mb-2 flex justify-between font-mono text-[10px] tracking-widest uppercase"
							>
								<span class="font-bold">Select Icons</span>
								<span class={step === 3 ? 'font-bold' : 'text-[#0F0F0F]/40'}>Render</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="h-1 flex-1 bg-[#0F0F0F]"></div>
								<div class={`h-1 flex-1 ${step === 3 ? 'bg-[#0F0F0F]' : 'bg-[#E5E5E5]'}`}></div>
							</div>
						</div>

						{#if step === 2 && !isResultsPage}
							<div class="flex-1 overflow-y-auto p-6">
								<h3
									class="mb-4 font-mono text-[10px] font-bold tracking-widest text-[#FF3E00] uppercase"
								>
									Enrich with Standard UI
								</h3>
								<div class="space-y-3">
									{#each PRESET_PACKS as pack}
										<button
											type="button"
											onclick={() => applyPreset(pack.icons)}
											class="group flex w-full items-center justify-between border-2 border-[#E5E5E5] bg-white p-3 text-left transition-colors hover:border-[#FF3E00]"
										>
											<span class="font-sans text-sm font-bold text-[#0F0F0F]">{pack.name}</span>
											<Plus size={16} class="text-[#0F0F0F]/30 group-hover:text-[#FF3E00]" />
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</aside>

					<div class="relative flex flex-1 flex-col bg-white">
						{#if step === 2 && !isResultsPage}
							<div class="max-w-4xl p-8 md:p-12">
								<div class="mb-10">
									<h2 class="mb-2 font-sans text-3xl font-bold tracking-tight uppercase">
										Suggested Brand Assets
									</h2>
									<p class="font-mono text-sm text-[#0F0F0F]/60">
										Based on your project context, we recommend generating these custom brand
										primitives.
									</p>
								</div>

								<div id="tour-suggested-assets" class="border-2 border-[#0F0F0F] shadow-[4px_4px_0px_#0F0F0F]">
									<div
										class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#F2F2F0] p-4"
									>
										<span class="font-mono text-[10px] font-bold tracking-widest uppercase"
											>Target Vector List</span
										>
										<span
											class="font-mono text-[10px] font-bold tracking-widest text-[#FF3E00] uppercase"
											>{selectedIcons.size} Selected</span
										>
									</div>

									<div class="bg-white p-6">
										<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
											<div class="border-2 border-[#E5E5E5] p-4">
												<div class="mb-2 font-mono text-[10px] font-bold tracking-widest uppercase">
													Add One-by-One
												</div>
												<div class="flex gap-2">
													<input
														type="text"
														bind:value={manualIconInput}
														placeholder="e.g. Bell"
														class="w-full border-2 border-[#0F0F0F] px-3 py-2 font-mono text-xs outline-none focus:border-[#FF3E00]"
													/>
													<button
														type="button"
														onclick={handleAddManualIcon}
														class="bg-[#0F0F0F] px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-white uppercase hover:bg-[#FF3E00]"
													>
														Add
													</button>
												</div>
											</div>

											<div class="border-2 border-[#E5E5E5] p-4">
												<div class="mb-2 font-mono text-[10px] font-bold tracking-widest uppercase">
													Keyword Batch
												</div>
												<div class="flex gap-2">
													<input
														type="text"
														bind:value={keywordBatchInput}
														placeholder="e.g. Payments"
														class="w-full border-2 border-[#0F0F0F] px-3 py-2 font-mono text-xs outline-none focus:border-[#FF3E00]"
													/>
													<button
														type="button"
														onclick={handleKeywordBatch}
														disabled={isKeywordSuggesting}
														class="bg-[#0F0F0F] px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-white uppercase hover:bg-[#FF3E00] disabled:opacity-50"
													>
														{isKeywordSuggesting ? 'Working' : 'Generate'}
													</button>
												</div>
											</div>
										</div>

										<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
											{#each suggestedIcons as icon}
												<button
													type="button"
													onclick={() => toggleIconSelection(icon)}
													class={`flex cursor-pointer items-center gap-3 border-2 p-4 transition-all ${selectedIcons.has(icon) ? 'border-[#FF3E00] bg-[#FF3E00]/5' : 'border-[#E5E5E5] hover:border-[#0F0F0F]'}`}
												>
													{#if selectedIcons.has(icon)}
														<CheckSquare size={18} class="text-[#FF3E00]" />
													{:else}
														<Square size={18} class="text-[#0F0F0F]/30" />
													{/if}
													<span class="truncate font-mono text-sm font-bold">{icon}</span>
												</button>
											{/each}
										</div>
									</div>

									<div class="flex justify-end border-t-2 border-[#0F0F0F] bg-[#F9F9F9] p-6">
										<button
											id="tour-generate-btn"
											type="button"
											onclick={handleGenerate}
											disabled={selectedIcons.size === 0}
											class="bg-[#0F0F0F] px-8 py-4 font-mono text-sm font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#FF3E00] disabled:opacity-50"
										>
											Generate SVGs →
										</button>
									</div>
								</div>
							</div>
						{/if}

						{#if step === 3 || isResultsPage}
							<div id="tour-generated-vectors" class="flex h-full flex-col">
								<div
									class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#F9F9F9] px-8 py-5"
								>
									<div class="flex items-center gap-6">
										<button
											type="button"
											onclick={() => {
												if (isResultsPage) {
													void goToIconsPage();
													return;
												}
												step = 2;
											}}
											class="font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:text-[#FF3E00]"
										>
											← Add More
										</button>
										<span class="h-4 w-[2px] bg-[#0F0F0F]/20"></span>
										<h2 class="font-sans text-xl font-bold uppercase">Generated Vectors</h2>
									</div>

									{#if !isGenerating && generatedSVGs.length === 0 && selectedIcons.size > 0}
										<button
											type="button"
											onclick={handleGenerate}
											class="flex items-center gap-2 bg-[#0F0F0F] px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#FF3E00]"
										>
											Generate SVGs
										</button>
									{:else if !isGenerating}
										<div class="flex items-center gap-3">
											<label
												for="export-format"
												class="font-mono text-[10px] font-bold tracking-widest uppercase"
												>Format</label
											>
											<select
												id="export-format"
												bind:value={exportFormat}
												class="border-2 border-[#0F0F0F] bg-white px-2 py-2 font-mono text-[10px] font-bold tracking-widest uppercase"
											>
												<option value="svg">.svg</option>
												<option value="jsx">.jsx</option>
												<option value="svelte">.svelte</option>
												<option value="vue">.vue</option>
											</select>
											<button
												id="tour-export-pack"
												type="button"
												onclick={() => void handleExportPack()}
												disabled={generatedSVGs.filter((svg) => svg.status === 'done').length === 0}
												class="flex items-center gap-2 border-2 border-[#0F0F0F] bg-white px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase shadow-[2px_2px_0px_#0F0F0F] transition-colors hover:text-[#FF3E00] disabled:opacity-40"
											>
												<Download size={14} /> Export Pack
											</button>
										</div>
									{/if}
								</div>

								<div class="bg-drafting-grid flex-1 p-8">
									{#if generatedSVGs.length === 0}
										<div
											class="mx-auto max-w-2xl border-2 border-[#0F0F0F] bg-white p-8 text-center"
										>
											<p class="mb-4 font-mono text-xs font-bold tracking-widest uppercase">
												No vectors generated yet.
											</p>
											<button
												type="button"
												onclick={() => {
													if (isResultsPage) {
														void goToIconsPage();
														return;
													}
													step = 2;
												}}
												class="bg-[#0F0F0F] px-6 py-3 font-mono text-[10px] font-bold tracking-widest text-white uppercase hover:bg-[#FF3E00]"
											>
												Choose Icons
											</button>
										</div>
									{:else}
										<div class="grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-4">
											{#each generatedSVGs as svg}
												<div
													class="group relative flex flex-col border-2 border-[#0F0F0F] bg-white shadow-[4px_4px_0px_#E5E5E5] transition-all duration-200 hover:shadow-[4px_4px_0px_#FF3E00]"
												>
													<div
														class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#F2F2F0] p-2"
													>
														<span
															class="font-mono text-[10px] font-bold text-[#0F0F0F]/60 uppercase"
															>#{svg.id.slice(0, 4)}</span
														>
														<span class="font-mono text-[10px] font-bold text-[#FF3E00] uppercase">
															{svg.status === 'generating' ? 'DRAWING...' : `v${svg.variant + 1}`}
														</span>
													</div>

													<div
														class="relative flex aspect-square items-center justify-center bg-white p-8"
													>
														{#if svg.status === 'generating'}
															<div
																class="h-10 w-10 animate-spin rounded-full border-[3px] border-[#0F0F0F]/10 border-t-[#FF3E00]"
															></div>
														{:else}
															<button
																type="button"
																onclick={() => openRemixEditor(svg)}
																class="h-full w-full cursor-pointer text-left text-[#0F0F0F]"
																style={cssVarsForSvg(svg)}
															>
																{@html svg.code}
															</button>
														{/if}

														{#if svg.status === 'done'}
															<div
																class="absolute inset-0 flex flex-col items-center justify-center gap-3 border-[4px] border-[#FF3E00] bg-[#F9F9F9]/95 p-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
															>
																<button
																	type="button"
																	onclick={() => openRemixEditor(svg)}
																	class="flex w-full items-center justify-center gap-2 bg-[#0F0F0F] py-3 font-mono text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#FF3E00]"
																>
																	<PenTool size={12} /> Edit Style
																</button>
																<button
																	type="button"
																	onclick={() => void handleRetryIcon(svg)}
																	class="flex w-full items-center justify-center gap-2 border-2 border-[#0F0F0F] bg-[#F2F2F0] py-3 font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F] uppercase transition-colors hover:bg-white disabled:opacity-50"
																>
																	<RotateCcw size={12} /> Retry Icon
																</button>
																{#if svg.retryHistory.length > 0}
																	<div
																		class="w-full border-2 border-[#0F0F0F]/20 bg-white px-3 py-2 text-center font-mono text-[10px] font-bold tracking-widest uppercase"
																	>
																		Retries: {svg.retryHistory.length}
																	</div>
																{/if}
																<button
																	type="button"
																	onclick={() => void handleCopySvg(svg)}
																	class="flex w-full items-center justify-center gap-2 border-2 border-[#0F0F0F] bg-white py-3 font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F] uppercase transition-colors hover:bg-[#F2F2F0]"
																>
																	<Code size={12} /> Copy SVG
																</button>
															</div>
														{/if}
													</div>

													<div class="border-t-2 border-[#0F0F0F] bg-white p-3 text-center">
														<div class="truncate font-sans text-sm font-bold uppercase">
															{svg.name}
														</div>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</main>

		{#if remixingSvg}
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/80 p-4 backdrop-blur-sm fade-in"
			>
				<div
					class="flex w-full max-w-3xl flex-col border-2 border-[#0F0F0F] bg-[#F2F2F0] shadow-[8px_8px_0px_#FF3E00]"
				>
					<div
						class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#0F0F0F] p-4 px-6 text-white"
					>
						<div class="flex items-center gap-3">
							<Settings2 size={16} class="text-[#FF3E00]" />
							<h3 class="font-mono text-sm font-bold tracking-widest uppercase">
								Edit: {remixingSvg.name}
							</h3>
						</div>
						<button
							type="button"
							onclick={() => (remixingSvg = null)}
							class="text-white/60 transition-colors hover:text-white"
						>
							✕
						</button>
					</div>

					<div class="grid grid-cols-1 bg-white md:grid-cols-5">
						<div
							class="bg-drafting-grid relative flex aspect-square items-center justify-center border-b-2 border-[#0F0F0F] p-12 md:col-span-2 md:border-r-2 md:border-b-0"
						>
							<RegistrationMark className="absolute left-4 top-4 opacity-30" />
							<RegistrationMark className="absolute bottom-4 right-4 opacity-30" />
							<div class="h-full w-full text-[#0F0F0F]" style={cssVarsForModal()}>
								{@html remixingSvg.code}
							</div>
						</div>

						<div class="flex flex-col bg-[#F9F9F9] p-8 md:col-span-3">
							<h4 class="mb-2 font-sans text-xl font-bold uppercase">Refine Design</h4>
							<p class="mb-6 font-mono text-xs text-[#0F0F0F]/50">
								Describe how you want to alter this specific icon.
							</p>

							<textarea
								bind:value={remixPrompt}
								placeholder="e.g. Make the lines thicker, change the shape to be more rounded..."
								rows={4}
								class="w-full resize-none border-2 border-[#0F0F0F] bg-white p-4 font-mono text-sm transition-all outline-none placeholder:text-[#0F0F0F]/30 focus:border-[#FF3E00] focus:shadow-[4px_4px_0px_#FF3E00]"
							></textarea>

							<div class="mt-5 border-2 border-[#0F0F0F] bg-white p-4">
								<div
									class="mb-3 font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F] uppercase"
								>
									Color Palette
								</div>
								<div class="space-y-2">
									{#each remixColors as color, index}
										<div class="flex items-center gap-2">
											<input
												type="color"
												value={normalizeHex(color) ?? '#000000'}
												onchange={(event) =>
													updateRemixColor(index, (event.currentTarget as HTMLInputElement).value)}
												class="h-9 w-10 border border-[#0F0F0F] bg-white"
											/>
											<input
												type="text"
												value={color}
												oninput={(event) =>
													updateRemixColor(index, (event.currentTarget as HTMLInputElement).value)}
												placeholder="#0F0F0F"
												class="flex-1 border border-[#0F0F0F] px-3 py-2 font-mono text-[11px] font-bold tracking-wider uppercase outline-none focus:border-[#FF3E00]"
											/>
											<button
												type="button"
												onclick={() => removeRemixColor(index)}
												disabled={remixColors.length <= 1}
												class="border border-[#0F0F0F] px-2 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-[#F2F2F0] disabled:opacity-40"
											>
												Del
											</button>
										</div>
									{/each}
								</div>
								<button
									type="button"
									onclick={addRemixColor}
									disabled={remixColors.length >= 8}
									class="mt-3 border-2 border-[#0F0F0F] px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-[#F2F2F0] disabled:opacity-40"
								>
									Add Color
								</button>
							</div>

							<div class="mt-4 border-2 border-[#0F0F0F] bg-white p-4">
								<div class="mb-3 font-mono text-[10px] font-bold tracking-widest uppercase">
									Line Thickness
								</div>
								<div class="flex items-center gap-3">
									<input
										type="range"
										min="1"
										max="8"
										step="1"
										bind:value={remixStrokeWidth}
										class="w-full accent-[#FF3E00]"
									/>
									<input
										type="number"
										min="1"
										max="8"
										bind:value={remixStrokeWidth}
										class="w-16 border border-[#0F0F0F] px-2 py-1 font-mono text-xs font-bold outline-none"
									/>
								</div>
							</div>
							<button
								type="button"
								onclick={handleRemix}
								class="mt-6 w-full bg-[#FF3E00] py-4 font-mono text-sm font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#0F0F0F] disabled:opacity-50"
							>
								Apply Changes
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<OpenRouterKeyModal
			isOpen={isApiKeyModalOpen}
			onClose={() => (isApiKeyModalOpen = false)}
			onSaved={handleApiKeySaved}
		/>

		<ModelPicker
			isOpen={isModelPickerOpen}
			models={availableModels}
			isLoading={isLoadingModels}
			error={modelListError}
			{selectedModelId}
			onClose={() => (isModelPickerOpen = false)}
			onSelect={handleModelSelected}
			onRetry={loadModels}
		/>
	</div>
{/if}
