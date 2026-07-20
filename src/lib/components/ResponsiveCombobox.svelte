<script lang="ts">
  import * as Command from '$lib/components/ui/command/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import * as Drawer from '$lib/components/ui/drawer/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    items = [],
    selectedValue = '',
    placeholder = 'Search...',
    fallbackLabel = 'Select...',
    disabled = false,
    onSelect
  }: {
    items: { value: string; label: string }[];
    selectedValue?: string;
    placeholder?: string;
    fallbackLabel?: string;
    disabled?: boolean;
    onSelect: (value: string) => void;
  } = $props();

  let open = $state(false);
  let isDesktop = $state(true);

  // Viewport tracking isolated to the component
  $effect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    isDesktop = mql.matches;
    const onChange = (e: MediaQueryListEvent) => (isDesktop = e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  });

  let currentLabel = $derived(
    items.find((i) => i.value === selectedValue)?.label ?? fallbackLabel
  );
</script>

<!-- The single source of truth for the list -->
{#snippet commandList()}
  <Command.Root>
    <Command.Input {placeholder} />
    <Command.List>
      <Command.Empty>No results found.</Command.Empty>
      <Command.Group>
        {#each items as item (item.value)}
          <Command.Item
            value={item.label}
            onSelect={() => {
              open = false;
              onSelect(item.value);
            }}
          >
            {item.label}
          </Command.Item>
        {/each}
      </Command.Group>
    </Command.List>
  </Command.Root>
{/snippet}

<!-- Responsive Wrappers -->
{#if isDesktop}
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="outline" {disabled} class="w-50 justify-start capitalize">
          <span class="truncate">{currentLabel}</span>
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-50 p-0" align="start">
      {@render commandList()}
    </Popover.Content>
  </Popover.Root>
{:else}
  <Drawer.Root bind:open>
    <Drawer.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="outline" {disabled} class="w-50 justify-start capitalize">
          <span class="truncate">{currentLabel}</span>
        </Button>
      {/snippet}
    </Drawer.Trigger>
    <Drawer.Content>
      <div class="mt-4 border-t">
        {@render commandList()}
      </div>
    </Drawer.Content>
  </Drawer.Root>
{/if}