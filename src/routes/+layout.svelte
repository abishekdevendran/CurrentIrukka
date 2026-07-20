<script lang="ts">
  import './layout.css';
  import { page } from '$app/state';
  import { ModeWatcher } from 'mode-watcher';
  import favicon from '$lib/assets/favicon.svg';
  import Header from './Header.svelte';
  import Map from '$lib/components/Map/Map.svelte';
  import type { OutageEvent } from '$lib/types';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

  let { children } = $props();

  let district = $derived(page.params.district);
  let region = $derived(page.params.region);

  let events = $state<OutageEvent[]>([]);

  // Refetch events whenever the geographic scope changes
  $effect(() => {
    if (!district) {
      events = [];
      return; 
    }

    // Build standard URL parameters dynamically
    const params = new SvelteURLSearchParams({ district });
    if (region) params.set('region', region);

    fetch(`/api/events?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch events');
        return res.json() as Promise<OutageEvent[]>;
      })
      .then((data) => {
        events = data;
      })
      .catch(console.error);
  });
</script>

<svelte:head><link rel="icon" href={favicon} />
<title>Current Irukka - Live Grid Status{district ? ` in ${district?.[0].toUpperCase() + district?.slice(1)}` : ''}</title>
</svelte:head>
<ModeWatcher />

<!-- The rest of your layout template remains exactly the same! -->
<div class="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
  <Header />
  <main class="relative flex flex-1 flex-col overflow-hidden md:flex-row">
    <div class="relative z-0 h-[50vh] w-full shrink-0 md:h-full md:w-2/3 lg:w-3/4">
      <Map {district} {region} {events} />
    </div>
    <div class="relative z-10 flex h-full w-full flex-col overflow-y-auto bg-background/95 shadow-2xl backdrop-blur-xl md:w-1/3 md:border-l md:border-border lg:w-1/4">
      {@render children()}
    </div>
  </main>
</div>