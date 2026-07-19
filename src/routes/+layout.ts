import { locales, type Locale } from '../locales/data.js';
import { browser } from '$app/environment';
import { loadLocale } from 'wuchale/load-utils';
// so that the loaders are registered, only here, not required in nested ones (below)
import '../locales/main.loader.svelte.js';
import '../locales/js.loader.js';

/** @type {import('./$types').LayoutLoad} */
let activeLocale: string | undefined;

export const load = async ({ url }) => {
	console.log('[layout load] rerun, locale=', url.searchParams.get('locale'));
	const locale = url.searchParams.get('locale') ?? 'en';
	if (browser && locales.includes(locale as unknown as Locale) && locale !== activeLocale) {
		activeLocale = locale;
		await loadLocale(locale);
	}
};
