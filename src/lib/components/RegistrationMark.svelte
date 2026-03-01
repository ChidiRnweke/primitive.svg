<script lang="ts">
	interface Props {
		className?: string;
	}

	let { className = '' }: Props = $props();
</script>

<div class={`relative h-4 w-4 ${className}`}>
	<div class="absolute top-1/2 left-0 h-[1px] w-full bg-[#0F0F0F]"></div>
	<div class="absolute top-0 left-1/2 h-full w-[1px] bg-[#0F0F0F]"></div>
	<div
		class="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0F0F0F]"
	></div>
</div>
