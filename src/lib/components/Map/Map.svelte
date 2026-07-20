<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type * as L from 'leaflet';
	import { mode } from 'mode-watcher';
	import Loader2 from '@lucide/svelte/icons/loader';
	import type { OutageEvent, RegionFeature, RegionFeatureCollection } from '$lib/types';

	// Accept route context and any live outage events
	let {
		district = undefined,
		region = undefined,
		events = []
	}: {
		district?: string;
		region?: string;
		events?: OutageEvent[];
	} = $props();

	const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
	const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

	let mapElement: HTMLDivElement;
	let map: L.Map | undefined = $state.raw();
	let tileLayer: L.TileLayer | undefined = $state.raw();
	let leaflet: typeof L | undefined = $state.raw();

	let geoJsonLayer: L.GeoJSON | undefined = $state.raw();
	let isLoadingBounds = $state(false);

	// Helper to match our standard slug format
	function cleanSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	// --- 1. Map Initialization (Runs Exactly Once) ---
	$effect(() => {
		let isMounted = true;
		let resizeObserver: ResizeObserver | undefined;

		import('leaflet').then((module) => {
			if (!isMounted || !mapElement) return;
			leaflet = module;

			map = leaflet
				.map(mapElement, {
					zoomControl: false,
					attributionControl: false,
					preferCanvas: true
				})
				// Default wide view of South India before data loads
				.setView([11.1271, 78.6569], 7);

			tileLayer = leaflet.tileLayer(LIGHT_TILES, { maxZoom: 19 }).addTo(map);

			resizeObserver = new ResizeObserver(() => map?.invalidateSize());
			resizeObserver.observe(mapElement);
		});

		return () => {
			isMounted = false;
			resizeObserver?.disconnect();
			map?.remove();
		};
	});

	// --- 2. Theme Switching ---
	$effect(() => {
		if (tileLayer && mode.current) {
			tileLayer.setUrl(mode.current === 'dark' ? DARK_TILES : LIGHT_TILES);
		}
	});

	// --- 3. Dynamic Boundary Engine & Auto-Camera ---
	$effect(() => {
		// Wait until leaflet is fully loaded
		if (!map || !leaflet) return;

		// Determine target dataset based on the current URL
		let targetFile = '/boundaries/tn-districts-low.json';
		if (district && !region) targetFile = `/boundaries/${district}-regions-low.json`;
		if (district && region) targetFile = `/boundaries/${district}-regions-high.json`;

		isLoadingBounds = true;

		fetch(targetFile)
			.then((res) => {
				if (!res.ok) throw new Error(`Missing map data: ${targetFile}`);
				// Cast the return promise so the next .then() automatically infers the correct type
				return res.json() as Promise<RegionFeatureCollection>;
			})
			.then((data) => {
				if (geoJsonLayer) map!.removeLayer(geoJsonLayer);

				geoJsonLayer = leaflet!
					.geoJSON(data, {
						style: (feature) => {
							const featureSlug = cleanSlug(
								feature?.properties.name || feature?.properties['name:en'] || ''
							);
							const isTargetRegion = region && featureSlug === region;

							return {
								color: isTargetRegion ? '#ef4444' : '#64748b',
								weight: isTargetRegion ? 3 : 1,
								fillColor: isTargetRegion ? '#ef4444' : '#64748b',
								fillOpacity: isTargetRegion ? 0.2 : 0.05,
								className: isTargetRegion ? 'boundary-pulse' : 'transition-all duration-300'
							};
						}
					})
					.addTo(map!);

				// --- Camera Auto-Focus Logic ---
				let targetBounds = geoJsonLayer.getBounds();

				if (region) {
					const layers = geoJsonLayer.getLayers();

					const activeLayer = layers.find((l) => {
						// Safely intersect Leaflet's layer type with our custom Feature type
						const layerWithFeature = l as L.Polygon & { feature?: RegionFeature };
						const props = layerWithFeature.feature?.properties;

						if (!props) return false;

						const slug = cleanSlug(props.name || props['name:en'] || '');
						return slug === region;
					});

					if (activeLayer) {
						// activeLayer is officially just an unknown layer to TS at this scope level,
						// so we cast it to Polygon to access getBounds()
						targetBounds = (activeLayer as L.Polygon).getBounds();
					}
				}

				map!.flyToBounds(targetBounds, {
					padding: [40, 40],
					duration: 1.2,
					easeLinearity: 0.25
				});
			})
			.catch(console.error)
			.finally(() => {
				isLoadingBounds = false;
			});
	});

	// --- 4. Outage Event Markers (Placeholder from your original code) ---
	$effect(() => {
		// Drop your marker logic here. Because the map camera dynamically handles
		// zooming, you just need to render the dots based on the `events` prop.
	});
</script>

<div class="relative h-full w-full overflow-hidden rounded-2xl border border-border shadow-sm">
	<!-- Map Canvas -->
	<div bind:this={mapElement} class="z-0 h-full w-full bg-muted"></div>

	<!-- Loading Overlay -->
	{#if isLoadingBounds}
		<div
			class="absolute inset-0 z-1000 flex items-center justify-center bg-background/50 backdrop-blur-sm transition-opacity"
		>
			<div
				class="flex flex-col items-center gap-2 rounded-xl border border-border bg-background/90 px-6 py-4 shadow-lg"
			>
				<Loader2 class="h-8 w-8 animate-spin text-primary" />
				<span class="text-sm font-medium tracking-tight text-foreground">Rendering grid...</span>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Optional: Make the active region's border pulse slightly */
	:global(.boundary-pulse) {
		filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6));
		transition: all 0.3s ease;
	}
</style>
