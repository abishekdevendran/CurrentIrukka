<!-- src/lib/components/Map/PopupContent.svelte -->
<script lang="ts">
	let { state, startedAt }: { state: string; startedAt: string } = $props();
	const isRestored = state === 'restored';
	const color = isRestored ? 'text-emerald-500' : 'text-red-500';
	const bgColor = isRestored ? 'bg-emerald-50' : 'bg-red-50';
	const borderColor = isRestored ? 'border-emerald-200' : 'border-red-200';
</script>

<!-- This Card looks exactly like a Shadcn component -->
<div class="w-48 rounded-xl border p-3 {borderColor} {bgColor} shadow-lg backdrop-blur-sm">
	<div class="flex flex-col gap-1">
		<span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
			Grid Status
		</span>
		<b class="{color} text-lg">
			{isRestored ? 'Vandhuduchu 💡' : 'Current Illa ⚡'}
		</b>
		<span class="text-xs text-muted-foreground">
			Started: {new Date(startedAt).toLocaleTimeString('en-IN', {
				hour: '2-digit',
				minute: '2-digit'
			})}
		</span>
	</div>
</div>
