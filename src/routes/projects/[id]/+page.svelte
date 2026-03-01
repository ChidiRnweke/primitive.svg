<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		void goto(`/projects/${data.id}/icons`);
	});
</script>

<div class="bg-drafting-grid flex min-h-screen items-center justify-center bg-[#F2F2F0] p-8">
	<div
		class="border-2 border-[#0F0F0F] bg-white px-8 py-6 font-mono text-xs font-bold tracking-widest uppercase"
	>
		Redirecting to icons...
	</div>
</div>
