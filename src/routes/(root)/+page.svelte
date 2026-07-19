<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Map from '$lib/components/Map/Map.svelte';
	import * as Select from '$lib/components/ui/select';
	import type { OutageEvent, CityData } from '$lib/types';
	import Header from './Header.svelte';
	import ReportFooter from './ReportFooter.svelte';
	import { resolve } from '$app/paths';
	import type { GeoJsonObject } from 'geojson';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const SUPPORTED_CITIES: Record<string, CityData> = {
		chennai: {
			slug: 'chennai',
			name: 'Chennai',
			center: [13.0827, 80.2707],
			zoom: 12,
			minZoom: 10, // Prevents zooming out to state-level
			maxZoom: 15, // Prevents zooming down to individual blades of grass
			maxBounds: [
				[12.7, 79.9],
				[13.4, 80.4]
			] // SW to NE corners boxing in Chennai
		},
		coimbatore: {
			slug: 'coimbatore',
			name: 'Coimbatore',
			center: [11.0168, 76.9558],
			zoom: 12,
			minZoom: 10,
			maxZoom: 15,
			maxBounds: [
				[8.7, 72.7],
				[14.3, 79.2]
			] // SW to NE corners boxing in Coimbatore
		}
	};

	let currentCitySlug = $derived(page.url.searchParams.get('city') || 'chennai');
	let currentCity = $derived(SUPPORTED_CITIES[currentCitySlug] || SUPPORTED_CITIES['chennai']);

	let events: OutageEvent[] = $state([]);
	let boundaryGeoJSON: GeoJsonObject | null = $state(null);

	// Abstract the fetch into a reusable, strictly typed async function
	async function refreshOutages(): Promise<void> {
		try {
			const res = await fetch(`/api/events?city=${currentCity.slug}`);
			if (res.ok) {
				events = await res.json();
			} else {
				console.error('Failed to fetch events:', res.statusText);
			}
		} catch (err: unknown) {
			console.error('Network error fetching grid events:', err);
		}
	}

	let lastFetchedSlug: string | undefined = $state();
	$effect(() => {
		const citySlug = currentCity.slug;

		// Bail out entirely if the slug hasn't changed
		if (citySlug === lastFetchedSlug) return;
		lastFetchedSlug = citySlug;

		refreshOutages();

		fetch(`/boundaries/${citySlug}.json`)
			.then((res) => res.json())
			.then((data) => (boundaryGeoJSON = data as GeoJsonObject))
			.catch(console.error);
	});

	async function updateCity(newSlug: string): Promise<void> {
		const query = new SvelteURLSearchParams(page.url.searchParams);
		query.set('city', newSlug);
		await goto(resolve(`/?${query.toString()}`), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}
</script>

<div class="flex min-h-screen flex-col bg-background font-sans text-foreground">
	<!-- Ensure you drop the LocaleSwitcher back into the Header -->
	<Header />

	<main class="mx-auto w-full max-w-5xl flex-1 space-y-8 p-4 md:p-6">
		<!-- Action Bar / City Switcher using Shadcn -->
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-bold tracking-tight">Live Grid Status</h2>
			<Select.Root type="single" value={currentCity.slug} onValueChange={updateCity}>
				<Select.Trigger class="w-45">
					{currentCity.name}
				</Select.Trigger>
				<Select.Content>
					{#each Object.values(SUPPORTED_CITIES) as city (city.slug)}
						<Select.Item value={city.slug}>{city.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- The 50vh Map Layout -->
		<section class="space-y-6">
			<div class="z-0 h-[50vh] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
				<Map
					{events}
					center={currentCity.center}
					zoom={currentCity.zoom}
					minZoom={currentCity.minZoom}
					maxZoom={currentCity.maxZoom}
					maxBounds={currentCity.maxBounds}
					boundaries={boundaryGeoJSON}
				/>
			</div>

			<div class="mx-auto w-full max-w-md">
				<!-- Passes the function down to refresh state after reporting -->
				<ReportFooter {refreshOutages} />
			</div>
		</section>
	</main>
</div>
