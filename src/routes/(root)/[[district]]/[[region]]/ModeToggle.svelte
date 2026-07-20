<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { tick } from 'svelte';

	function handleToggle(event: MouseEvent) {
		const isSupported = typeof document !== 'undefined' && 'startViewTransition' in document;
		if (!isSupported) {
			toggleMode();
			return;
		}

		const button = event.currentTarget as HTMLElement;
		const rect = button.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;

		const endRadius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);

		const isDarkInitially = document.documentElement.classList.contains('dark');

		const transition = document.startViewTransition(async () => {
			toggleMode();
			await tick();
		});

		transition.ready.then(() => {
			const targetElement = isDarkInitially
				? '::view-transition-old(root)'
				: '::view-transition-new(root)';

			const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];

			document.documentElement.animate(
				{ clipPath: isDarkInitially ? [...clipPath].reverse() : clipPath },
				{ duration: 500, easing: 'ease-out', pseudoElement: targetElement }
			);
		});
	}
</script>

<Button onclick={handleToggle} variant="outline" size="icon">
	<SunIcon
		class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
	/>
	<MoonIcon
		class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
	/>
	<span class="sr-only">Toggle theme</span>
</Button>
