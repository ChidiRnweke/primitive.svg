<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectsDashboard from '$lib/components/ProjectsDashboard.svelte';
	import type { ProjectRecord } from '$lib/domain/types';
	import { listProjects } from '$lib/data/projects';

	let projects = $state<ProjectRecord[]>([]);
	let isLoading = $state(true);

	onMount(async () => {
		projects = await listProjects();
		isLoading = false;
	});
</script>

<ProjectsDashboard {projects} {isLoading} />
