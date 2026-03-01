<script lang="ts">
	import { ArrowRight, Crosshair } from '@lucide/svelte';
	import RegistrationMark from '$lib/components/RegistrationMark.svelte';

	const steps = [
		{
			number: '01',
			title: 'Initialize Spec',
			desc: 'Define your brand voice. Name your project and provide high-level style directives to steer the generation.',
			icon: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"><rect x="25" y="15" width="45" height="70" stroke="#0F0F0F" fill="white" /><line x1="35" y1="35" x2="60" y2="35" stroke="#0F0F0F" /><line x1="35" y1="50" x2="60" y2="50" stroke="#0F0F0F" /><line x1="35" y1="65" x2="45" y2="65" stroke="#0F0F0F" /><path d="M85 20 L81 30 L71 34 L81 38 L85 48 L89 38 L99 34 L89 30 Z" fill="#FF3E00" stroke="none" /></svg>`
		},
		{
			number: '02',
			title: 'Set Rules',
			desc: 'Select your preferred AI model and define strict visual constraints like base stroke width and color palette.',
			icon: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"><line x1="50" y1="10" x2="50" y2="90" stroke="#0F0F0F" stroke-width="2" stroke-dasharray="4 4" opacity="0.3" /><line x1="20" y1="35" x2="80" y2="35" stroke="#0F0F0F" /><line x1="20" y1="65" x2="80" y2="65" stroke="#0F0F0F" /><rect x="35" y="25" width="12" height="20" fill="#FF3E00" stroke="none" /><rect x="65" y="55" width="12" height="20" fill="#FF3E00" stroke="none" /></svg>`
		},
		{
			number: '03',
			title: 'Refine & Iterate',
			desc: 'Get instant vector generations. Tweak prompts and edit style controls on individual icons until it clicks.',
			icon: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"><rect x="25" y="10" width="50" height="80" stroke="#0F0F0F" stroke-width="2" stroke-dasharray="6 6" opacity="0.2" /><path d="M40 75 L60 75 L50 25 Z" stroke="#0F0F0F" fill="white" /><line x1="50" y1="25" x2="50" y2="10" stroke="#FF3E00" /><rect x="36" y="71" width="8" height="8" fill="#FF3E00" stroke="none" /><rect x="56" y="71" width="8" height="8" fill="#FF3E00" stroke="none" /><rect x="46" y="21" width="8" height="8" fill="#FF3E00" stroke="none" /></svg>`
		},
		{
			number: '04',
			title: 'Local Privacy',
			desc: 'Your data is yours. Prompts, keys, and assets are stored exclusively in your browser\'s local database.',
			icon: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"><path d="M15 35 L35 35 L45 45 L85 45 L85 85 L15 85 Z" stroke="#0F0F0F" fill="white" /><line x1="15" y1="45" x2="85" y2="45" stroke="#0F0F0F" /><rect x="40" y="55" width="20" height="15" fill="#FF3E00" stroke="none" /><path d="M45 55 V48 A5 5 0 0 1 55 48 V55" stroke="#FF3E00" stroke-width="3" /></svg>`
		}
	];
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-[#F2F2F0] font-sans text-[#0F0F0F]">
	<div class="bg-drafting-grid pointer-events-none fixed inset-0 z-0 opacity-50"></div>

	<header class="relative z-40 border-b-2 border-[#0F0F0F] bg-[#F2F2F0]">
		<div class="flex h-20 items-center justify-between px-6 md:px-12">
			<a href="/" class="flex items-center gap-3 hover:text-[#FF3E00] transition-colors">
				<Crosshair size={24} class="text-[#FF3E00]" />
				<span class="font-sans text-2xl font-bold tracking-tight uppercase">Primitive.svg</span>
			</a>
			<a
				href="/projects"
				class="flex items-center gap-2 bg-[#0F0F0F] px-6 py-3 font-mono text-xs font-bold tracking-widest text-[#F2F2F0] uppercase transition-colors hover:bg-[#FF3E00]"
			>
				Open Workspace <ArrowRight size={14} />
			</a>
		</div>
	</header>

	<main class="relative z-10 flex flex-1 flex-col p-6 md:p-12 lg:p-20 items-center">
		<RegistrationMark className="absolute top-10 right-10 opacity-20" />
		<RegistrationMark className="absolute bottom-10 left-10 opacity-20" />

		<div class="mb-24 max-w-4xl w-full text-center">
			<div class="mb-6 inline-block border border-[#0F0F0F] bg-white px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase">
				Process Guide
			</div>
			<h1 class="mb-6 text-5xl font-bold tracking-tighter uppercase md:text-7xl">
				How it <span class="text-[#FF3E00]">Works.</span>
			</h1>
			<p class="font-mono text-xl leading-relaxed text-[#0F0F0F]/70 max-w-2xl mx-auto">
				Primitive.svg bridges the gap between natural language and precise vector graphics. 
				A browser-based utility for design system scaffolding.
			</p>
		</div>

		<div class="flex flex-col gap-16 md:gap-24 w-full max-w-5xl relative">
			<!-- Center line for larger screens to anchor the zig-zag -->
			<div class="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#0F0F0F]/10 -translate-x-1/2"></div>

			{#each steps as step, i}
				<div 
					class="flex flex-col md:flex-row items-center gap-8 md:gap-16 opacity-0"
					style="animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: {i * 0.2}s"
				>
					{#if i % 2 === 0}
						<!-- Left Side: Title & Icon -->
						<div class="w-full md:w-1/2 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-end relative z-10">
							<!-- Connector to center line -->
							<div class="hidden md:block absolute top-1/2 -right-8 w-8 border-t-2 border-dashed border-[#0F0F0F]/20"></div>
							
							<div class="text-left sm:text-right order-2 sm:order-1">
								<div class="font-mono text-xl font-bold text-[#FF3E00] mb-1">STEP {step.number}</div>
								<h3 class="font-sans text-2xl md:text-3xl font-bold uppercase">{step.title}</h3>
							</div>
							<div class="relative order-1 sm:order-2 h-24 w-24 md:h-28 md:w-28 shrink-0 border-2 border-[#0F0F0F] bg-white p-5 shadow-[6px_6px_0px_#0F0F0F] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0px_#FF3E00]">
								<RegistrationMark className="absolute top-1 left-1 opacity-20 w-3 h-3" />
								<RegistrationMark className="absolute bottom-1 right-1 opacity-20 w-3 h-3" />
								<div class="h-full w-full text-[#0F0F0F]">
									{@html step.icon}
								</div>
							</div>
						</div>
						<!-- Right Side: Text -->
						<div class="w-full md:w-1/2 relative z-10">
							<div class="border-l-4 border-[#FF3E00] bg-white p-6 shadow-sm">
								<p class="font-mono text-base leading-relaxed text-[#0F0F0F]/80">
									{step.desc}
								</p>
							</div>
						</div>
					{:else}
						<!-- Left Side: Text -->
						<div class="w-full md:w-1/2 order-2 md:order-1 relative z-10">
							<!-- Connector to center line -->
							<div class="hidden md:block absolute top-1/2 -right-16 w-8 border-t-2 border-dashed border-[#0F0F0F]/20"></div>
							<div class="border-l-4 md:border-l-0 md:border-r-4 border-[#FF3E00] bg-white p-6 shadow-sm text-left md:text-right">
								<p class="font-mono text-base leading-relaxed text-[#0F0F0F]/80">
									{step.desc}
								</p>
							</div>
						</div>
						<!-- Right Side: Title & Icon -->
						<div class="w-full md:w-1/2 order-1 md:order-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-start relative z-10">
							<div class="relative h-24 w-24 md:h-28 md:w-28 shrink-0 border-2 border-[#0F0F0F] bg-white p-5 shadow-[6px_6px_0px_#0F0F0F] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0px_#FF3E00]">
								<RegistrationMark className="absolute top-1 left-1 opacity-20 w-3 h-3" />
								<RegistrationMark className="absolute bottom-1 right-1 opacity-20 w-3 h-3" />
								<div class="h-full w-full text-[#0F0F0F]">
									{@html step.icon}
								</div>
							</div>
							<div class="text-left">
								<div class="font-mono text-xl font-bold text-[#FF3E00] mb-1">STEP {step.number}</div>
								<h3 class="font-sans text-2xl md:text-3xl font-bold uppercase">{step.title}</h3>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="mt-32 border-t-2 border-[#0F0F0F] pt-12 flex flex-col md:flex-row items-center justify-between gap-8 w-full max-w-4xl">
			<div class="max-w-md text-center md:text-left">
				<h4 class="font-sans text-xl font-bold uppercase mb-2">Ready to start?</h4>
				<p class="font-mono text-xs text-[#0F0F0F]/60">
					Create your first icon set in under 60 seconds. No signup required.
				</p>
			</div>
			<a
				href="/projects/new"
				class="flex items-center gap-3 bg-[#FF3E00] px-10 py-5 font-mono text-sm font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#0F0F0F]"
			>
				New Specification <ArrowRight size={18} />
			</a>
		</div>
	</main>
</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(30px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>