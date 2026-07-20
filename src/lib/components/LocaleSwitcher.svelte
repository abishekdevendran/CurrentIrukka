<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const locales = [
		{ code: 'en', label: 'EN' },
		{ code: 'ta', label: 'த' }
	];
	let currentLocale = $derived(page.url.searchParams.get('locale') || 'en');

	async function switchLocale(code: string): Promise<void> {
		const query = new SvelteURLSearchParams(page.url.searchParams);
		query.set('locale', code);

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(`${page.url.pathname}?${query.toString()}`, {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<Button
	variant="outline"
	size="icon"
	onclick={() =>
		switchLocale(locales.find((locale) => locale.code !== currentLocale)?.code || 'en')}
>
	EN
</Button>
