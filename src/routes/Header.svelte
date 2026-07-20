<script lang="ts">
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import ModeToggle from './(root)/[[district]]/[[region]]/ModeToggle.svelte';
</script>

<header class="sticky top-0 z-50 w-full bg-background">
	<div
		class="container-wrapper 3xl:fixed:px-0 px-6 group-has-data-[slot=designer]/layout:max-w-none flex items-center justify-between border-b py-2"
	>
		<div class="flex flex-col">
			<h1 class="text-xl font-bold tracking-tight">Current Irukka?</h1>
			<p class="text-sm text-muted-foreground">Chennai Crowdsourced Grid Telemetry</p>
		</div>
		<div class="flex items-center gap-2">
			<LocaleSwitcher />
			<ModeToggle />
		</div>
	</div>
</header>
