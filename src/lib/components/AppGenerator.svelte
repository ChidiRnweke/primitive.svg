<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		CheckSquare,
		Code,
		Download,
		Key,
		Layers,
		MousePointer2,
		PenTool,
		Plus,
		Settings2,
		Square
	} from '@lucide/svelte';
	import { createAiServices, openRouterApiKeyStore } from '$lib/ai/factory';
	import { MissingApiKeyError } from '$lib/ai/interfaces';
	import OpenRouterKeyModal from '$lib/components/OpenRouterKeyModal.svelte';
	import RegistrationMark from '$lib/components/RegistrationMark.svelte';
	import type { GeneratedSvg, ProjectRecord } from '$lib/domain/types';
	import { PRESET_PACKS, createId } from '$lib/data/mock';
	import { createProject, getProjectById, updateProject } from '$lib/data/projects';

	interface Props {
		projectId?: string | null;
	}

	let { projectId = null }: Props = $props();

	let step = $state(1);
	let appName = $state('');
	let appDesc = $state('');

	let isLoadingProject = $state(false);
	let projectNotFound = $state(false);

	let isSuggesting = $state(false);
	let suggestedIcons = $state<string[]>([]);
	let selectedIcons = $state(new Set<string>());

	let isGenerating = $state(false);
	let generatedSVGs = $state<GeneratedSvg[]>([]);

	let remixingSvg = $state<GeneratedSvg | null>(null);
	let remixPrompt = $state('');

	let currentProjectId = $state<string | null>(null);
	let hasApiKey = $state(false);
	let isApiKeyModalOpen = $state(false);
	let generationError = $state('');

	const aiServices = createAiServices();

	const ERROR_SVG = `
		<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
			<rect x="12" y="12" width="76" height="76" stroke="#0F0F0F" stroke-width="3" />
			<path d="M30 30 L70 70" stroke="#FF3E00" stroke-width="4" stroke-linecap="round" />
			<path d="M70 30 L30 70" stroke="#FF3E00" stroke-width="4" stroke-linecap="round" />
		</svg>
	`;

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

	const hydrateFromProject = (project: ProjectRecord) => {
		appName = project.name;
		appDesc = project.desc;
		suggestedIcons = [...project.suggestedIcons];
		selectedIcons = new Set(project.selectedIcons);
		generatedSVGs = [...project.generatedSVGs];

		if (project.generatedSVGs.length > 0) {
			step = 3;
		} else if (project.suggestedIcons.length > 0) {
			step = 2;
		} else {
			step = 1;
		}
	};

	onMount(async () => {
		refreshApiKeyState();
		currentProjectId = projectId;

		if (!currentProjectId) {
			return;
		}

		isLoadingProject = true;
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
			await goto(`/projects/${created.id}`);
		}
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
				projectDescription: appDesc
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
		const merged = new Set([...suggestedIcons, ...icons]);
		suggestedIcons = Array.from(merged);

		const next = new Set(selectedIcons);
		for (const icon of icons) {
			next.add(icon);
		}
		selectedIcons = next;

		void persist();
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

		const newSVGs: GeneratedSvg[] = Array.from(selectedIcons).map((name) => ({
			id: createId(),
			name,
			code: '',
			status: 'generating',
			variant: 0
		}));

		generatedSVGs = newSVGs;
		await persist();

		for (const svg of newSVGs) {
			try {
				const code = await aiServices.svgGenerationService.generateSvg({
					projectName: appName,
					projectDescription: appDesc,
					iconName: svg.name
				});

				generatedSVGs = generatedSVGs.map((item) =>
					item.id === svg.id ? { ...item, status: 'done', code } : item
				);
			} catch (error) {
				generationError = toUserFacingError(error, 'Failed to generate one or more SVGs.');
				generatedSVGs = generatedSVGs.map((item) =>
					item.id === svg.id ? { ...item, status: 'done', code: ERROR_SVG } : item
				);
			}

			await persist();
		}

		isGenerating = false;
	};

	const handleRemix = async () => {
		if (!remixPrompt || !remixingSvg) {
			return;
		}

		if (!hasApiKey) {
			generationError = 'Set your OpenRouter API key before remixing SVGs.';
			isApiKeyModalOpen = true;
			return;
		}

		generationError = '';

		const targetId = remixingSvg.id;
		const previousCode = remixingSvg.code;
		const nextVariant = remixingSvg.variant + 1;
		const remixInput = remixPrompt;
		generatedSVGs = generatedSVGs.map((item) =>
			item.id === targetId ? { ...item, status: 'generating' } : item
		);
		remixingSvg = null;
		remixPrompt = '';

		try {
			const code = await aiServices.svgGenerationService.remixSvg({
				projectName: appName,
				projectDescription: appDesc,
				iconName: generatedSVGs.find((item) => item.id === targetId)?.name ?? 'Icon',
				currentSvg: previousCode,
				remixPrompt: remixInput,
				variant: nextVariant
			});

			generatedSVGs = generatedSVGs.map((item) => {
				if (item.id !== targetId) {
					return item;
				}

				return {
					...item,
					status: 'done',
					variant: nextVariant,
					code
				};
			});
		} catch (error) {
			generationError = toUserFacingError(error, 'Failed to remix SVG.');
			generatedSVGs = generatedSVGs.map((item) =>
				item.id === targetId
					? {
							...item,
							status: 'done',
							code: previousCode
						}
					: item
			);
		}

		await persist();
	};

	const handleApiKeySaved = () => {
		refreshApiKeyState();
		generationError = '';
	};
</script>

{#if isLoadingProject}
	<div class="bg-drafting-grid flex min-h-screen items-center justify-center bg-[#F2F2F0] p-8">
		<div
			class="border-2 border-[#0F0F0F] bg-white px-8 py-6 font-mono text-xs font-bold tracking-widest uppercase"
		>
			Loading project...
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
				<div
					class="flex items-center gap-6 font-mono text-[11px] font-bold tracking-wider uppercase"
				>
					<button
						type="button"
						onclick={() => (isApiKeyModalOpen = true)}
						class="flex items-center gap-2 bg-[#0F0F0F] px-4 py-2 text-[#F2F2F0] transition-colors hover:bg-[#FF3E00]"
					>
						<Key size={14} />
						{hasApiKey ? 'API Connected' : 'Set API Key'}
					</button>
					<button
						type="button"
						class="flex items-center gap-2 border-2 border-[#0F0F0F] px-4 py-2 text-[#0F0F0F] transition-colors hover:bg-[#0F0F0F] hover:text-[#F2F2F0]"
					>
						<Layers size={14} /> Spec Options
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

			{#if step === 1}
				<div class="my-20 w-full max-w-3xl px-6 fade-in">
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

			{#if step > 1}
				<div
					class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col border-x-2 border-[#0F0F0F] bg-white fade-in lg:flex-row"
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
								onclick={() => (step = 1)}
								class="mt-4 font-mono text-[10px] font-bold tracking-widest text-[#FF3E00] uppercase hover:text-[#0F0F0F]"
							>
								Edit Prompt
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

						{#if step === 2}
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
						{#if step === 2}
							<div class="max-w-4xl p-8 fade-in md:p-12">
								<div class="mb-10">
									<h2 class="mb-2 font-sans text-3xl font-bold tracking-tight uppercase">
										Suggested Brand Assets
									</h2>
									<p class="font-mono text-sm text-[#0F0F0F]/60">
										Based on your project context, we recommend generating these custom brand
										primitives.
									</p>
								</div>

								<div class="border-2 border-[#0F0F0F] shadow-[4px_4px_0px_#0F0F0F]">
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

						{#if step === 3}
							<div class="flex h-full flex-col fade-in">
								<div
									class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#F9F9F9] px-8 py-5"
								>
									<div class="flex items-center gap-6">
										<button
											type="button"
											onclick={() => (step = 2)}
											class="font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:text-[#FF3E00]"
										>
											← Add More
										</button>
										<span class="h-4 w-[2px] bg-[#0F0F0F]/20"></span>
										<h2 class="font-sans text-xl font-bold uppercase">Generated Vectors</h2>
									</div>

									{#if !isGenerating}
										<button
											type="button"
											class="flex items-center gap-2 border-2 border-[#0F0F0F] bg-white px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase shadow-[2px_2px_0px_#0F0F0F] transition-colors hover:text-[#FF3E00]"
										>
											<Download size={14} /> Export Pack
										</button>
									{/if}
								</div>

								<div class="bg-drafting-grid flex-1 p-8">
									<div class="grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-4">
										{#each generatedSVGs as svg}
											<div
												class="group relative flex flex-col border-2 border-[#0F0F0F] bg-white shadow-[4px_4px_0px_#E5E5E5] transition-all duration-200 hover:shadow-[4px_4px_0px_#FF3E00]"
											>
												<div
													class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#F2F2F0] p-2"
												>
													<span class="font-mono text-[10px] font-bold text-[#0F0F0F]/60 uppercase"
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
														<div class="h-full w-full text-[#0F0F0F]">{@html svg.code}</div>
													{/if}

													{#if svg.status === 'done'}
														<div
															class="absolute inset-0 flex flex-col items-center justify-center gap-3 border-[4px] border-[#FF3E00] bg-[#F9F9F9]/95 p-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
														>
															<button
																type="button"
																onclick={() => (remixingSvg = svg)}
																class="flex w-full items-center justify-center gap-2 bg-[#0F0F0F] py-3 font-mono text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#FF3E00]"
															>
																<PenTool size={12} /> Edit Style
															</button>
															<button
																type="button"
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
							<div class="h-full w-full text-[#0F0F0F]">{@html remixingSvg.code}</div>
						</div>

						<div class="flex flex-col bg-[#F9F9F9] p-8 md:col-span-3">
							<h4 class="mb-2 font-sans text-xl font-bold uppercase">Refine Design</h4>
							<p class="mb-6 font-mono text-xs text-[#0F0F0F]/50">
								Describe how you want to alter this specific icon.
							</p>

							<textarea
								bind:value={remixPrompt}
								placeholder="e.g. Make the lines thicker, change the shape to be more rounded..."
								rows={5}
								class="mb-auto w-full resize-none border-2 border-[#0F0F0F] bg-white p-4 font-mono text-sm transition-all outline-none placeholder:text-[#0F0F0F]/30 focus:border-[#FF3E00] focus:shadow-[4px_4px_0px_#FF3E00]"
							></textarea>
							<button
								type="button"
								onclick={handleRemix}
								disabled={!remixPrompt}
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
	</div>
{/if}
