<script lang="ts">
	import AppGenerator from '$lib/components/AppGenerator.svelte';

	let { data } = $props();
</script>

<AppGenerator projectId={data.id} view="icons" />
