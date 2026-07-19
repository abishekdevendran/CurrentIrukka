<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	function handleToggle(event: MouseEvent) {
		// Fallback if browser lacks support or user prefers reduced motion
		const isSupported = typeof document !== 'undefined' && 'startViewTransition' in document;
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!isSupported || prefersReducedMotion) {
			toggleMode();
			return;
		}

		// Get coordinates of the toggle button click
		const x = event.clientX;
		const y = event.clientY;

		// Calculate maximum distance to the furthest screen corner
		const endRadius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);

		// Trigger the view transition
		const transition = document.startViewTransition(async () => {
			toggleMode();
			// Wait for the Svelte state change to push to the DOM synchronously
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		// Animate the clip-path once the transition is ready
		transition.ready.then(() => {
			const isDarkNow = mode.current === 'dark';
			const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];

			document.documentElement.animate(
				{
					// Reverse the clip-path direction based on target mode
					clipPath: isDarkNow ? clipPath : [...clipPath].reverse()
				},
				{
					duration: 1000,
					easing: 'ease-in-out',
					// Specify which pseudo-element captures the circular growth
					pseudoElement: isDarkNow ? '::view-transition-new(root)' : '::view-transition-old(root)'
				}
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
