<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Crosshair, FileText, FolderOpen, Key, Plus, Trash2 } from '@lucide/svelte';
	import OpenRouterKeyModal from '$lib/components/OpenRouterKeyModal.svelte';
	import { openRouterApiKeyStore } from '$lib/ai/factory';
	import type { ProjectRecord } from '$lib/domain/types';

	interface Props {
		projects: ProjectRecord[];
		isLoading?: boolean;
		onDeleteProject: (project: ProjectRecord) => Promise<void>;
	}

	let { projects, isLoading = false, onDeleteProject }: Props = $props();
	let isKeyModalOpen = $state(false);
	let hasApiKey = $state(false);
	let deletingProject = $state<ProjectRecord | null>(null);
	let deleteConfirmInput = $state('');
	let isDeletingProject = $state(false);
	let deleteError = $state('');

	const refreshApiKeyState = () => {
		hasApiKey = Boolean(openRouterApiKeyStore.getKey());
	};

	const openDeleteModal = (project: ProjectRecord) => {
		deletingProject = project;
		deleteConfirmInput = '';
		deleteError = '';
	};

	const closeDeleteModal = () => {
		if (isDeletingProject) {
			return;
		}

		deletingProject = null;
		deleteConfirmInput = '';
		deleteError = '';
	};

	const handleDeleteConfirmed = async () => {
		if (!deletingProject) {
			return;
		}

		if (deleteConfirmInput.trim() !== deletingProject.name) {
			deleteError = 'Project name does not match.';
			return;
		}

		isDeletingProject = true;
		deleteError = '';

		try {
			await onDeleteProject(deletingProject);
			deletingProject = null;
			deleteConfirmInput = '';
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Failed to delete project.';
		} finally {
			isDeletingProject = false;
		}
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
					class={`flex items-center gap-2 border-2 border-[#0F0F0F] px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-[#F2F2F0] uppercase transition-colors ${hasApiKey ? 'bg-[#FF3E00] hover:bg-[#0F0F0F]' : 'bg-[#0F0F0F] hover:bg-[#FF3E00]'}`}
				>
					<Key size={12} />
					{hasApiKey ? 'API Key Connected' : 'Set API Key'}
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
						href={`/projects/${project.id}/icons`}
						class="group flex min-h-[280px] cursor-pointer flex-col border-2 border-[#0F0F0F] bg-white p-6 shadow-[4px_4px_0px_#0F0F0F] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0F0F0F]"
					>
						<div class="mb-6 flex items-start justify-between">
							<div class="border border-[#0F0F0F] bg-[#F2F2F0] p-2">
								<FolderOpen size={20} class="text-[#FF3E00]" />
							</div>
							<div class="flex items-center gap-3">
								<span
									class="font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F]/40 uppercase"
								>
									EDITED {project.lastEdited}
								</span>
								<button
									type="button"
									onclick={(event) => {
										event.preventDefault();
										event.stopPropagation();
										openDeleteModal(project);
									}}
									class="border border-[#0F0F0F]/30 bg-white p-1 text-[#0F0F0F]/40 transition-colors hover:border-[#FF3E00] hover:text-[#FF3E00]"
								>
									<Trash2 size={12} />
								</button>
							</div>
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

{#if deletingProject}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/80 p-4 backdrop-blur-sm fade-in"
	>
		<div
			class="flex w-full max-w-2xl flex-col border-2 border-[#0F0F0F] bg-[#F2F2F0] shadow-[8px_8px_0px_#FF3E00]"
		>
			<div
				class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#0F0F0F] p-4 px-6 text-white"
			>
				<h3 class="font-mono text-sm font-bold tracking-widest uppercase">Delete Project</h3>
				<button
					type="button"
					onclick={closeDeleteModal}
					disabled={isDeletingProject}
					class="text-white/60 transition-colors hover:text-white disabled:opacity-40"
				>
					✕
				</button>
			</div>

			<div class="space-y-6 bg-white p-8">
				<p class="font-mono text-xs leading-relaxed text-[#0F0F0F]/70">
					Type <span class="font-bold text-[#0F0F0F]">{deletingProject.name}</span> to confirm deletion.
				</p>
				<input
					type="text"
					bind:value={deleteConfirmInput}
					placeholder="Type project name"
					class="w-full border-2 border-[#0F0F0F] bg-[#F9F9F9] p-4 font-mono text-xs font-bold tracking-wide uppercase transition-all outline-none placeholder:text-[#0F0F0F]/30 focus:border-[#FF3E00] focus:shadow-[4px_4px_0px_#FF3E00]"
				/>

				{#if deleteError}
					<div
						class="border-2 border-[#FF3E00] bg-[#FF3E00]/10 px-4 py-3 font-mono text-[10px] font-bold tracking-widest uppercase"
					>
						{deleteError}
					</div>
				{/if}

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<button
						type="button"
						onclick={handleDeleteConfirmed}
						disabled={isDeletingProject || deleteConfirmInput.trim() !== deletingProject.name}
						class="bg-[#FF3E00] py-3 font-mono text-[11px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#0F0F0F] disabled:opacity-40"
					>
						{isDeletingProject ? 'Deleting...' : 'Delete Project'}
					</button>
					<button
						type="button"
						onclick={closeDeleteModal}
						disabled={isDeletingProject}
						class="border-2 border-[#0F0F0F] bg-white py-3 font-mono text-[11px] font-bold tracking-widest uppercase transition-colors hover:bg-[#F2F2F0] disabled:opacity-40"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
