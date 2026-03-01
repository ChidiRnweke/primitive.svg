<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Crosshair, FileText, FolderOpen, Key, Plus } from '@lucide/svelte';
	import OpenRouterKeyModal from '$lib/components/OpenRouterKeyModal.svelte';
	import { openRouterApiKeyStore } from '$lib/ai/factory';
	import type { ProjectRecord } from '$lib/domain/types';

	interface Props {
		projects: ProjectRecord[];
		isLoading?: boolean;
	}

	let { projects, isLoading = false }: Props = $props();
	let isKeyModalOpen = $state(false);
	let hasApiKey = $state(false);

	const refreshApiKeyState = () => {
		hasApiKey = Boolean(openRouterApiKeyStore.getKey());
	};

	onMount(refreshApiKeyState);
</script>

<div
	class="relative flex min-h-screen flex-col overflow-x-hidden bg-[#F2F2F0] font-sans text-[#0F0F0F]"
>
	<div class="bg-drafting-grid pointer-events-none fixed inset-0 z-0"></div>

	<header class="relative z-40 border-b-2 border-[#0F0F0F] bg-[#F2F2F0]">
		<div class="flex h-14 items-center justify-between px-6">
			<a class="flex cursor-pointer items-center gap-6" href="/">
				<div class="flex items-center gap-2">
					<Crosshair size={20} class="text-[#FF3E00]" />
					<span class="font-sans text-lg font-bold tracking-tight uppercase">Primitive.svg</span>
				</div>
			</a>
			<div class="flex items-center gap-4">
				<button
					type="button"
					onclick={() => (isKeyModalOpen = true)}
					class="flex items-center gap-2 border-2 border-[#0F0F0F] bg-white px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors hover:text-[#FF3E00]"
				>
					<Key size={12} />
					{hasApiKey ? 'API Key Ready' : 'Set API Key'}
				</button>
			</div>
		</div>
	</header>

	<main class="relative z-10 mx-auto w-full max-w-7xl flex-1 p-6 fade-in md:p-12">
		<div class="mb-10 flex items-end justify-between border-b-2 border-[#0F0F0F] pb-6">
			<div>
				<h1 class="mb-2 font-sans text-4xl font-bold tracking-tight uppercase">Workspace</h1>
				<p class="font-mono text-sm text-[#0F0F0F]/60">
					Select an existing specification or initialize a new project.
				</p>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<a
				href="/projects/new"
				class="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#0F0F0F]/30 bg-transparent p-12 transition-all hover:border-[#FF3E00] hover:bg-[#FF3E00]/5"
			>
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0F0F0F]/30 transition-colors group-hover:border-[#FF3E00]"
				>
					<Plus size={32} class="text-[#0F0F0F]/30 transition-colors group-hover:text-[#FF3E00]" />
				</div>
				<span
					class="font-sans text-lg font-bold uppercase transition-colors group-hover:text-[#FF3E00]"
					>New Specification</span
				>
				<span class="mt-2 font-mono text-[10px] tracking-widest text-[#0F0F0F]/50 uppercase"
					>Initialize blank canvas</span
				>
			</a>

			{#if isLoading}
				<div
					class="col-span-full border-2 border-[#0F0F0F] bg-white p-8 font-mono text-xs tracking-widest uppercase"
				>
					Loading projects...
				</div>
			{:else}
				{#each projects as project}
					<a
						href={`/projects/${project.id}`}
						class="group flex min-h-[280px] cursor-pointer flex-col border-2 border-[#0F0F0F] bg-white p-6 shadow-[4px_4px_0px_#0F0F0F] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0F0F0F]"
					>
						<div class="mb-6 flex items-start justify-between">
							<div class="border border-[#0F0F0F] bg-[#F2F2F0] p-2">
								<FolderOpen size={20} class="text-[#FF3E00]" />
							</div>
							<span
								class="font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F]/40 uppercase"
							>
								EDITED {project.lastEdited}
							</span>
						</div>

						<h3
							class="mb-3 font-sans text-2xl leading-tight font-bold uppercase transition-colors group-hover:text-[#FF3E00]"
						>
							{project.name}
						</h3>
						<p class="mb-auto line-clamp-3 font-mono text-xs leading-relaxed text-[#0F0F0F]/60">
							<span class="font-bold text-[#0F0F0F]">RULES:</span>
							{project.desc}
						</p>

						<div class="mt-6 flex items-center justify-between border-t-2 border-[#E5E5E5] pt-4">
							<div
								class="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F]/60 uppercase"
							>
								<FileText size={12} />
								{project.iconCount} GLYPHS
							</div>
							<ArrowRight
								size={16}
								class="text-[#0F0F0F] opacity-0 transition-opacity group-hover:opacity-100"
							/>
						</div>
					</a>
				{/each}
			{/if}
		</div>
	</main>
</div>

<OpenRouterKeyModal
	isOpen={isKeyModalOpen}
	onClose={() => (isKeyModalOpen = false)}
	onSaved={refreshApiKeyState}
/>
