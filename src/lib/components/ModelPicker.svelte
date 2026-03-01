<script lang="ts">
	import { ChevronDown, Layers, Search } from '@lucide/svelte';
	import { POPULAR_PROVIDERS } from '$lib/ai/models';
	import type { ModelInfo } from '$lib/ai/interfaces';

	interface Props {
		isOpen: boolean;
		models: ModelInfo[];
		isLoading: boolean;
		error: string;
		selectedModelId: string;
		onClose: () => void;
		onSelect: (modelId: string) => void;
		onRetry: () => void;
	}

	let { isOpen, models, isLoading, error, selectedModelId, onClose, onSelect, onRetry }: Props =
		$props();

	let searchQuery = $state('');
	let openProviders = $state<Set<string>>(new Set());

	$effect(() => {
		if (!isOpen) {
			searchQuery = '';
			openProviders = new Set();
		}
	});

	const normalizedQuery = $derived(searchQuery.trim().toLowerCase());
	const filteredModels = $derived.by(() =>
		models.filter((model) => {
			if (!normalizedQuery) {
				return true;
			}

			return (
				model.id.toLowerCase().includes(normalizedQuery) ||
				model.name.toLowerCase().includes(normalizedQuery) ||
				model.provider.toLowerCase().includes(normalizedQuery)
			);
		})
	);

	const groupedModels = $derived.by(() => {
		const grouped = new Map<string, ModelInfo[]>();

		for (const model of filteredModels) {
			const existing = grouped.get(model.provider);
			if (existing) {
				existing.push(model);
				continue;
			}

			grouped.set(model.provider, [model]);
		}

		for (const provider of POPULAR_PROVIDERS) {
			if (!grouped.has(provider)) {
				grouped.set(provider, []);
			}
		}

		return grouped;
	});

	const providerSections = $derived.by(() => {
		const sectionByProvider = new Map<
			string,
			{ provider: string; models: ModelInfo[]; popular: boolean }
		>();

		for (const provider of POPULAR_PROVIDERS) {
			sectionByProvider.set(provider, {
				provider,
				models: groupedModels.get(provider) ?? [],
				popular: true
			});
		}

		const otherProviders = Array.from(groupedModels.keys())
			.filter(
				(provider) => !POPULAR_PROVIDERS.includes(provider as (typeof POPULAR_PROVIDERS)[number])
			)
			.sort((a, b) => a.localeCompare(b));

		for (const provider of otherProviders) {
			sectionByProvider.set(provider, {
				provider,
				models: groupedModels.get(provider) ?? [],
				popular: false
			});
		}

		const orderedProviders = [...POPULAR_PROVIDERS, ...otherProviders];
		const sections = orderedProviders
			.map((provider) => sectionByProvider.get(provider))
			.filter((section): section is { provider: string; models: ModelInfo[]; popular: boolean } =>
				Boolean(section)
			);

		if (!normalizedQuery) {
			return sections;
		}

		return sections.filter((section) => section.models.length > 0);
	});

	const hasAnyVisibleModels = $derived(
		providerSections.some((section) => section.models.length > 0)
	);

	const toggleProvider = (provider: string) => {
		const next = new Set(openProviders);
		if (next.has(provider)) {
			next.delete(provider);
		} else {
			next.add(provider);
		}

		openProviders = next;
	};

	const isProviderOpen = (provider: string) => openProviders.has(provider);
</script>

<svelte:window
	onkeydown={(e) => {
		if (isOpen && e.key === 'Escape') onClose();
	}}
/>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/80 p-4 backdrop-blur-sm fade-in"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
	>
		<div
			class="flex h-[85vh] w-full max-w-5xl flex-col border-2 border-[#0F0F0F] bg-[#F2F2F0] shadow-[8px_8px_0px_#FF3E00]"
		>
			<div
				class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#0F0F0F] p-4 px-6 text-white"
			>
				<div class="flex items-center gap-3">
					<Layers size={16} class="text-[#FF3E00]" />
					<h3 class="font-mono text-sm font-bold tracking-widest uppercase">Model Catalog</h3>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="text-white/60 transition-colors hover:text-white"
				>
					✕
				</button>
			</div>

			<div class="border-b-2 border-[#0F0F0F] bg-white p-6">
				<div class="relative">
					<Search
						size={16}
						class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#0F0F0F]/40"
					/>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search models or providers"
						class="w-full border-2 border-[#0F0F0F] bg-[#F9F9F9] py-3 pr-4 pl-11 font-mono text-xs font-bold tracking-wide uppercase transition-all outline-none placeholder:text-[#0F0F0F]/30 focus:border-[#FF3E00] focus:shadow-[4px_4px_0px_#FF3E00]"
					/>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto bg-[#F9F9F9] p-6">
				{#if isLoading}
					<div
						class="border-2 border-[#0F0F0F] bg-white p-6 font-mono text-xs font-bold tracking-widest uppercase"
					>
						Loading models...
					</div>
				{:else if error}
					<div class="border-2 border-[#FF3E00] bg-[#FF3E00]/10 p-6">
						<p class="mb-4 font-mono text-xs font-bold tracking-widest uppercase">{error}</p>
						<button
							type="button"
							onclick={onRetry}
							class="border-2 border-[#0F0F0F] bg-white px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-[#0F0F0F] hover:text-white"
						>
							Retry
						</button>
					</div>
				{:else if !hasAnyVisibleModels}
					<div
						class="border-2 border-[#0F0F0F] bg-white p-6 font-mono text-xs font-bold tracking-widest uppercase"
					>
						No models match this search.
					</div>
				{:else}
					<div class="space-y-6">
						{#each providerSections as section}
							<div class="border-2 border-[#0F0F0F] bg-white">
								<button
									type="button"
									onclick={() => toggleProvider(section.provider)}
									class="flex w-full items-center justify-between border-b-2 border-[#0F0F0F] bg-[#F2F2F0] px-4 py-3 text-left font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-[#EFEFEA]"
								>
									<div class="flex items-center gap-2">
										<ChevronDown
											size={14}
											class={`transition-transform ${isProviderOpen(section.provider) ? 'rotate-0' : '-rotate-90'}`}
										/>
										<span>{section.provider}</span>
										{#if section.popular}
											<span class="text-[#FF3E00]">POPULAR</span>
										{/if}
									</div>
									<span>{section.models.length}</span>
								</button>

								{#if isProviderOpen(section.provider)}
									<div class="max-h-56 overflow-y-auto">
										{#if section.models.length === 0}
											<div
												class="p-4 font-mono text-[10px] tracking-widest text-[#0F0F0F]/50 uppercase"
											>
												No models in this provider.
											</div>
										{:else}
											{#each section.models as model}
												<button
													type="button"
													onclick={() => onSelect(model.id)}
													class={`flex w-full items-center justify-between border-b border-[#E5E5E5] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#FF3E00]/5 ${selectedModelId === model.id ? 'bg-[#FF3E00]/10' : 'bg-white'}`}
												>
													<div>
														<div class="font-mono text-[11px] font-bold tracking-wider uppercase">
															{model.id}
														</div>
														<div class="font-sans text-xs text-[#0F0F0F]/60">{model.name}</div>
													</div>
													{#if selectedModelId === model.id}
														<div
															class="font-mono text-[10px] font-bold tracking-widest text-[#FF3E00] uppercase"
														>
															Selected
														</div>
													{/if}
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
