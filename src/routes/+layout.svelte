<script lang="ts">
  import './layout.css';
  import { page } from '$app/state';
  import { ModeWatcher } from 'mode-watcher';
  import favicon from '$lib/assets/favicon.svg';
  import Header from './Header.svelte';
  import Map from '$lib/components/Map/Map.svelte';
  import type { OutageEvent } from '$lib/types';

  let { children } = $props();

  // 1. Reactively track route parameters globally
  let district = $derived(page.params.district);
  let region = $derived(page.params.region);

  // 2. Fetch live events globally so they persist on the map
  let events = $state<OutageEvent[]>([]);
  let lastFetchedDistrict = $state<string | undefined>();

  $effect(() => {
    // Only fetch if we have a district and it has changed
    if (!district || district === lastFetchedDistrict) return;
    lastFetchedDistrict = district;

    fetch(`/api/events?city=${district}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch events');
        return res.json() as Promise<OutageEvent[]>;
      })
      .then((data) => {
        // TypeScript now knows `data` is strictly OutageEvent[]
        events = data;
      })
      .catch(console.error);
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />

<div class="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
  <Header />

  <main class="relative flex flex-1 flex-col overflow-hidden md:flex-row">
    
    <!-- 🗺️ THE PERSISTENT MAP -->
    <!-- Mobile: Takes up top 50vh (or absolute behind). Desktop: Takes left 2/3rds -->
    <div class="relative z-0 h-[50vh] w-full shrink-0 md:h-full md:w-2/3 lg:w-3/4">
      <!-- We pass the reactive derived state down to the map -->
      <Map {district} {region} {events} />
    </div>

    <!-- 📱 THE DYNAMIC UI OVERLAY -->
    <!-- Mobile: Scrolls below map. Desktop: Fixed sidebar on right -->
    <div class="relative z-10 flex h-full w-full flex-col overflow-y-auto bg-background/95 shadow-2xl backdrop-blur-xl md:w-1/3 md:border-l md:border-border lg:w-1/4">
      <!-- Your [[district]]/[[region]]/+page.svelte renders right here -->
      {@render children()}
    </div>
    
  </main>
</div>