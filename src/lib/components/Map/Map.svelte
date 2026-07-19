<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import geohash from 'ngeohash';
	import type * as L from 'leaflet';
	import { mode } from 'mode-watcher';
	import type { OutageEvent } from '$lib/types';
	import type { GeoJsonObject } from 'geojson';
	import { mount, unmount } from 'svelte';
	import PopupContent from '$lib/components/Map/PopupContent.svelte';

	let {
		events = [],
		center = [13.0827, 80.2707],
		zoom = 12,
		minZoom = 10,
		maxZoom = 18,
		maxBounds = null,
		boundaries = null
	}: {
		events: OutageEvent[];
		center: [number, number];
		zoom: number;
		minZoom: number;
		maxZoom: number;
		maxBounds: [[number, number], [number, number]] | null;
		boundaries: GeoJsonObject | null;
	} = $props();

	const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
	const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

	let mapElement: HTMLDivElement;

	// Use $state.raw to prevent Svelte from proxying Leaflet internals
	let map: L.Map | undefined = $state.raw();
	let markerGroup: L.LayerGroup | undefined = $state.raw();
	let tileLayer: L.TileLayer | undefined = $state.raw();
	let leaflet: typeof L | undefined = $state.raw();

	// Plain (non-reactive) variable: only this one effect ever reads or writes it,
	// purely to track what to clean up between runs. Making it $state caused the
	// effect to read-then-write its own dependency every run -> infinite loop
	// (effect_update_depth_exceeded), which crashed the whole component's
	// reactivity and was the real reason nothing -- map, tiles, or markers -- rendered.
	let geoJsonLayer: L.GeoJSON | undefined;

	// --- Map init ---------------------------------------------------------
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
					maxBoundsViscosity: 1.0
				})
				.setView(center, zoom);

			markerGroup = leaflet.layerGroup().addTo(map);
			// Seed with a real URL immediately (light) so there's never a blank/broken tile state
			// before the theme effect below has a chance to run.
			tileLayer = leaflet.tileLayer(LIGHT_TILES, { maxZoom: 19 }).addTo(map);

			map.invalidateSize();

			// Leaflet only sizes itself correctly if it knows the container resized.
			// If the map's parent gets its height from a flex/grid layout that settles
			// after this effect runs, the map (and every marker in it) can end up
			// rendered into a 0x0 box. This keeps it in sync.
			resizeObserver = new ResizeObserver(() => map?.invalidateSize());
			resizeObserver.observe(mapElement);
		});

		return () => {
			isMounted = false;
			resizeObserver?.disconnect();
			map?.remove();
		};
	});

	// --- Theme (dark/light tiles) ------------------------------------------
	$effect(() => {
		if (tileLayer && mode.current) {
			tileLayer.setUrl(mode.current === 'dark' ? DARK_TILES : LIGHT_TILES);
		}
	});

	// --- Camera constraints --------------------------------------------------
	$effect(() => {
		if (!map) return;
		if (maxBounds) map.setMaxBounds(maxBounds as L.LatLngBoundsExpression);
		map.setMinZoom(minZoom);
		map.setMaxZoom(maxZoom);
		map.flyTo(center, zoom, { duration: 1.5 });
	});

	// --- Boundaries ------------------------------------------------------
	$effect(() => {
		if (!map || !boundaries || !leaflet) return;
		if (geoJsonLayer) map.removeLayer(geoJsonLayer);

		geoJsonLayer = leaflet
			.geoJSON(boundaries as GeoJsonObject, {
				style: {
					color: '#ef4444',
					weight: 2,
					fillOpacity: 0,
					interactive: false,
					className: 'boundary-glow'
				}
			})
			.addTo(map);
	});

	// --- Markers -----------------------------------------------------------
	$effect(() => {
		if (!map || !markerGroup || !leaflet) return;

		markerGroup.clearLayers();

		let failed = 0;

		events.forEach((event) => {
			try {
				const coords = geohash.decode(event.cluster);
				if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
					throw new Error(`Invalid geohash "${event.cluster}"`);
				}

				const markerClass =
					event.state === 'restored'
						? 'marker-pulse marker-restored'
						: 'marker-pulse marker-active';

				const icon = leaflet!.divIcon({
					className: '',
					html: `<div class="${markerClass}"></div>`,
					iconSize: [20, 20],
					iconAnchor: [10, 10]
				});

				const marker = leaflet!
					.marker([coords.latitude, coords.longitude], { icon })
					.addTo(markerGroup!);

				const popupContainer = document.createElement('div');
				marker.bindPopup(popupContainer, { closeButton: false });

				marker.on('popupopen', () => {
					const component = mount(PopupContent, {
						target: popupContainer,
						props: { state: event.state, startedAt: event.startedAt }
					});
					marker.once('popupclose', () => unmount(component));
				});

				marker.on('mouseover', () => marker.openPopup());
				marker.on('mouseout', () => marker.closePopup());
			} catch (e) {
				failed++;
				console.error('Marker render failed for event:', event, e);
			}
		});

		// Loud, hard-to-miss signal for the exact bug you're chasing right now:
		// if every event fails to decode, you'll see this instead of silently
		// wondering why nothing showed up.
		if (events.length > 0 && failed === events.length) {
			console.warn(
				`[Map] All ${events.length} events failed to render as markers. ` +
					`Check that "event.cluster" actually contains a valid geohash string ` +
					`(logged event shape above).`
			);
		} else if (failed > 0) {
			console.warn(`[Map] ${failed}/${events.length} markers failed to render.`);
		}
	});
</script>

<div bind:this={mapElement} class="z-0 h-full w-full bg-muted"></div>

<style>
	/* Use :global() so Leaflet markers can see these classes */
	:global(.marker-pulse) {
		display: block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid white;
		box-sizing: border-box;
		animation: pulse-glow 2s infinite ease-in-out;
	}

	:global(.marker-active) {
		background-color: #ef4444;
		box-shadow: 0 0 10px 2px rgba(239, 68, 68, 0.6);
	}

	:global(.marker-restored) {
		background-color: #10b981;
		box-shadow: 0 0 10px 2px rgba(16, 185, 129, 0.6);
	}

	@keyframes pulse-glow {
		0% {
			transform: scale(0.9);
			opacity: 1;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.7;
		}
		100% {
			transform: scale(0.9);
			opacity: 1;
		}
	}

	:global(.boundary-glow) {
		filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
		transition: filter 0.3s ease;
	}

	/* Strip the Leaflet defaults */
	:global(.leaflet-popup-content-wrapper) {
		background: transparent !important;
		box-shadow: none !important;
		padding: 0 !important;
		border-radius: 0 !important;
	}

	:global(.leaflet-popup-tip) {
		display: none !important;
	}

	:global(.leaflet-popup-content) {
		margin: 0 !important;
		width: auto !important;
	}
</style>
