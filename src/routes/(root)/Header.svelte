<script lang="ts">
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import ModeToggle from './ModeToggle.svelte';
</script>

<header
	class="z-10 flex items-center justify-between gap-2 border-b border-border bg-background p-4"
>
	<div>
		<h1 class="text-xl font-bold tracking-tight">Current Irukka?</h1>
		<p class="text-sm text-muted-foreground">Chennai Crowdsourced Grid Telemetry</p>
	</div>
	<div class="flex items-center gap-2">
		<LocaleSwitcher />
		<ModeToggle />
	</div>
</header>
