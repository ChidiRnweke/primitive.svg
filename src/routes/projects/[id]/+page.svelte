<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		void goto(`${base}/projects/${data.id}/icons`);
	});
</script>

<div class="bg-drafting-grid flex min-h-screen items-center justify-center bg-[#F2F2F0] p-8">
	<div class="w-full max-w-3xl border-2 border-[#0F0F0F] bg-white p-8">
		<div class="h-4 w-44 animate-pulse bg-[#0F0F0F]/20"></div>
		<div class="mt-4 h-12 w-full animate-pulse bg-[#0F0F0F]/10"></div>
		<div class="mt-3 h-12 w-full animate-pulse bg-[#0F0F0F]/10"></div>
	</div>
</div>
