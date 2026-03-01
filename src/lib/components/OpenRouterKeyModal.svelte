<script lang="ts">
	import { Key, ShieldCheck } from '@lucide/svelte';
	import { openRouterApiKeyStore } from '$lib/ai/factory';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSaved?: () => void;
	}

	let { isOpen, onClose, onSaved }: Props = $props();

	let apiKeyInput = $state('');
	let shouldPersist = $state(false);
	let localError = $state('');

	$effect(() => {
		if (!isOpen) {
			return;
		}

		apiKeyInput = openRouterApiKeyStore.getKey() ?? '';
		shouldPersist = openRouterApiKeyStore.isPersisted();
		localError = '';
	});

	const handleSave = () => {
		if (!apiKeyInput.trim()) {
			localError = 'Enter an OpenRouter API key to continue.';
			return;
		}

		openRouterApiKeyStore.setKey(apiKeyInput, shouldPersist);
		localError = '';
		onSaved?.();
		onClose();
	};

	const handleClear = () => {
		openRouterApiKeyStore.clear();
		apiKeyInput = '';
		shouldPersist = false;
		localError = '';
		onSaved?.();
		onClose();
	};
</script>

<svelte:window onkeydown={(e) => { if (isOpen && e.key === 'Escape') onClose(); }} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/80 p-4 backdrop-blur-sm fade-in"
		onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
	>
		<div
			class="flex w-full max-w-2xl flex-col border-2 border-[#0F0F0F] bg-[#F2F2F0] shadow-[8px_8px_0px_#FF3E00]"
		>
			<div
				class="flex items-center justify-between border-b-2 border-[#0F0F0F] bg-[#0F0F0F] p-4 px-6 text-white"
			>
				<div class="flex items-center gap-3">
					<Key size={16} class="text-[#FF3E00]" />
					<h3 class="font-mono text-sm font-bold tracking-widest uppercase">OpenRouter Access</h3>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="text-white/60 transition-colors hover:text-white"
				>
					✕
				</button>
			</div>

			<div class="grid grid-cols-1 bg-white md:grid-cols-5">
				<div
					class="bg-drafting-grid relative border-b-2 border-[#0F0F0F] p-8 md:col-span-2 md:border-r-2 md:border-b-0"
				>
					<div
						class="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase"
					>
						<ShieldCheck size={12} class="text-[#FF3E00]" />
						Security Mode
					</div>
					<p class="font-mono text-xs leading-relaxed text-[#0F0F0F]/70">
						By default your key stays in memory for this session only. Enable caching if you want it
						saved in this browser.
					</p>
				</div>

				<div class="flex flex-col bg-[#F9F9F9] p-8 md:col-span-3">
					<label
						for="openrouter-key"
						class="mb-2 block font-mono text-[10px] font-bold tracking-widest text-[#0F0F0F] uppercase"
					>
						API Key
					</label>
					<input
						id="openrouter-key"
						type="password"
						autocomplete="off"
						bind:value={apiKeyInput}
						placeholder="sk-or-v1-..."
						class="mb-4 w-full border-2 border-[#0F0F0F] bg-white p-4 font-mono text-sm transition-all outline-none placeholder:text-[#0F0F0F]/30 focus:border-[#FF3E00] focus:shadow-[4px_4px_0px_#FF3E00]"
					/>

					<label class="mb-6 flex items-start gap-3">
						<input
							type="checkbox"
							bind:checked={shouldPersist}
							class="mt-[2px] h-4 w-4 rounded-none border-2 border-[#0F0F0F] accent-[#FF3E00]"
						/>
						<span class="font-mono text-xs text-[#0F0F0F]/80"> Cache key on this device </span>
					</label>

					{#if localError}
						<div
							class="mb-4 border-2 border-[#FF3E00] bg-[#FF3E00]/10 p-3 font-mono text-xs font-bold uppercase"
						>
							{localError}
						</div>
					{/if}

					<div class="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
						<button
							type="button"
							onclick={handleSave}
							class="bg-[#FF3E00] py-3 font-mono text-[11px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#0F0F0F]"
						>
							Save Key
						</button>
						<button
							type="button"
							onclick={handleClear}
							class="border-2 border-[#0F0F0F] bg-white py-3 font-mono text-[11px] font-bold tracking-widest uppercase transition-colors hover:bg-[#F2F2F0]"
						>
							Clear Key
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
