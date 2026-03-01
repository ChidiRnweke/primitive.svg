<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectsDashboard from '$lib/components/ProjectsDashboard.svelte';
	import type { ProjectRecord } from '$lib/domain/types';
	import { deleteProject, listProjects } from '$lib/data/projects';

	let projects = $state<ProjectRecord[]>([]);
	let isLoading = $state(true);

	onMount(async () => {
		projects = await listProjects();
		isLoading = false;
	});

	const handleDeleteProject = async (project: ProjectRecord) => {
		await deleteProject(project.id);
		projects = projects.filter((item) => item.id !== project.id);
	};
</script>

<ProjectsDashboard {projects} {isLoading} onDeleteProject={handleDeleteProject} />
