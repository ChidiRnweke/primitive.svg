<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Crosshair, Key } from '@lucide/svelte';
	import { DEMOS, generateMockSVGCode } from '$lib/data/mock';

	let demoStep = $state(0);

	onMount(() => {
		const interval = window.setInterval(() => {
			demoStep = demoStep === 0 ? 1 : 0;
		}, 4500);

		return () => window.clearInterval(interval);
	});
</script>

<div
	class="relative flex min-h-screen flex-col overflow-hidden bg-[#F2F2F0] font-sans text-[#0F0F0F]"
>
	<div class="bg-drafting-grid pointer-events-none fixed inset-0 z-0 opacity-50"></div>

	<header class="relative z-40 border-b-2 border-[#0F0F0F] bg-[#F2F2F0]">
		<div class="flex h-20 items-center justify-between px-6 md:px-12">
			<div class="flex items-center gap-3">
				<Crosshair size={24} class="text-[#FF3E00]" />
				<span class="font-sans text-2xl font-bold tracking-tight uppercase">Primitive.svg</span>
			</div>
			<a
				href="/projects"
				class="flex items-center gap-2 bg-[#0F0F0F] px-6 py-3 font-mono text-xs font-bold tracking-widest text-[#F2F2F0] uppercase transition-colors hover:bg-[#FF3E00]"
			>
				Dashboard <ArrowRight size={14} />
			</a>
		</div>
	</header>

	<main class="relative z-10 flex flex-1 flex-col lg:flex-row">
		<div
			class="flex w-full flex-col justify-center border-b-2 border-[#0F0F0F] p-6 md:p-12 lg:w-1/2 lg:border-r-2 lg:border-b-0 lg:p-20"
		>
			<div
				class="mb-8 inline-block w-fit border border-[#0F0F0F] bg-white px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase"
			>
				AI SVG Generation
			</div>
			<h1 class="mb-8 text-6xl leading-[0.9] font-bold tracking-tighter uppercase md:text-8xl">
				Design <br /> Systems <br /> On Demand.
			</h1>
			<p class="mb-12 max-w-md font-mono text-xl leading-relaxed text-[#0F0F0F]/70">
				Stop searching for matching icons. Describe your project and aesthetic to generate a
				cohesive, production-ready vector library in seconds.
			</p>

			<div>
				<a
					href="/projects"
					class="mb-4 flex w-full items-center justify-center gap-3 border-2 border-transparent bg-[#FF3E00] px-8 py-5 font-mono text-sm font-bold tracking-widest text-white uppercase transition-colors hover:border-[#0F0F0F] hover:bg-[#0F0F0F] sm:w-auto"
				>
					Open Workspace <ArrowRight size={18} />
				</a>
				<div class="flex items-start gap-3 text-[#0F0F0F]/60">
					<Key size={16} class="mt-0.5" />
					<p class="max-w-sm font-mono text-xs">
						<strong>100% Free UI.</strong> Bring your own OpenRouter key to power generation.
					</p>
				</div>
			</div>
		</div>

		<div
			class="relative flex min-h-[600px] w-full flex-col justify-center overflow-hidden bg-[#0F0F0F] p-6 md:p-12 lg:w-1/2 lg:p-20"
		>
			<div class="bg-drafting-grid absolute inset-0 opacity-10 invert"></div>

			<div class="relative z-10 mx-auto w-full max-w-lg">
				<div
					class="mb-8 border border-[#333] bg-[#1A1A1A] p-6 shadow-2xl transition-all duration-500"
				>
					<div class="mb-4 border-b border-[#333] pb-4">
						<span class="mb-1 block font-mono text-[10px] tracking-widest text-[#666] uppercase"
							>Project Name</span
						>
						<p class="text-xl font-bold text-white">{DEMOS[demoStep].name}</p>
					</div>
					<div>
						<span class="mb-1 block font-mono text-[10px] tracking-widest text-[#FF3E00] uppercase"
							>Style Directives</span
						>
						<p class="h-10 font-mono text-sm leading-relaxed text-white/90">
							"{DEMOS[demoStep].prompt}"
							<span class="ml-2 inline-block h-4 w-2 animate-pulse bg-[#FF3E00] align-middle"
							></span>
						</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
					{#each DEMOS[demoStep].icons as icon, i}
						<div
							class="relative aspect-square border border-[#333] bg-[#1A1A1A] p-6 fade-in"
							style={`animation-delay: ${i * 0.1}s`}
						>
							<div
								class="absolute top-2 left-2 w-[80%] truncate font-mono text-[8px] text-[#666] uppercase"
							>
								{icon}
							</div>
							<div class="h-full w-full text-white">
								{@html generateMockSVGCode(icon, i, DEMOS[demoStep].style)}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>
</div>
