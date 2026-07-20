<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { TN_DISTRICTS } from '$lib/constants';
  import type { RegionFeatureCollection } from '$lib/types';
  import ResponsiveCombobox from '$lib/components/ResponsiveCombobox.svelte';
  import ReportFooter from './ReportFooter.svelte'; // Assuming this still exists!
	import { SvelteURL } from 'svelte/reactivity';

  let district = $derived(page.params.district);
  let region = $derived(page.params.region);

  function cleanSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  const districtItems = TN_DISTRICTS.map((d) => ({ value: cleanSlug(d), label: d }));

  async function fetchRegions(districtName: string): Promise<{ value: string; label: string }[]> {
    const res = await fetch(`/boundaries/${cleanSlug(districtName)}-regions-low.json`);
    if (!res.ok) throw new Error('No region data available');

    const data = (await res.json()) as RegionFeatureCollection;
    const extractedNames = data.features
      .map((f) => f.properties.name || f.properties['name:en'])
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(extractedNames))
      .sort()
      .map((r) => ({ value: cleanSlug(r), label: r }));
  }

  let regionsPromise = $derived(district ? fetchRegions(district) : Promise.resolve([]));
</script>

<div class="flex h-full flex-col space-y-8 p-6">
  
  <!-- Header / Breadcrumbs -->
  <header class="space-y-2">
    <h1 class="text-2xl font-bold tracking-tight">Grid Status</h1>
    <p class="text-sm text-muted-foreground">
      {#if region}
        Viewing <span class="font-medium capitalize text-foreground">{region.replace('-', ' ')}</span>, {district}
      {:else if district}
        Viewing <span class="font-medium capitalize text-foreground">{district}</span> District
      {:else}
        Select an area to view live power status.
      {/if}
    </p>
  </header>

  <!-- Navigation Comboboxes -->
  <div class="flex flex-col gap-4">
    <ResponsiveCombobox
      items={districtItems}
      selectedValue={district}
      placeholder="Search districts..."
      fallbackLabel="Select District"
      onSelect={(val) => {
        const url = new SvelteURL(page.url);
        // transfer all existing query params to the new URL
        page.url.searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        url.pathname = `/${val}`;
        goto(url.toString(), { keepFocus: true, noScroll: true, replaceState: true });
      }}
    />

    {#if district}
      {#await regionsPromise}
        <ResponsiveCombobox items={[]} disabled fallbackLabel="Loading regions..." onSelect={() => {}} />
      {:then regions}
        <ResponsiveCombobox
          items={regions}
          selectedValue={region}
          placeholder="Search regions..."
          fallbackLabel={regions.length === 0 ? 'No regions' : 'Select Region'}
          disabled={regions.length === 0}
          onSelect={(val) => {
            goto(`/${cleanSlug(district!)}/${val}`, {
              keepFocus: true,
              noScroll: true,
              replaceState: true
            });
          }}
        />
      {:catch}
        <ResponsiveCombobox items={[]} disabled fallbackLabel="Failed to load regions" onSelect={() => {}} />
      {/await}
    {/if}
  </div>

  <!-- Spacer to push footer to bottom -->
  <div class="flex-1"></div>

  <!-- Your Reporting Component -->
  <div class="mt-auto pt-6 border-t border-border">
    <!-- E.g., <ReportFooter refreshOutages={...} /> -->
  </div>
</div>