<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';

	let { refreshOutages }: { refreshOutages: () => Promise<void> } = $props();

	type ReportingState = 'idle' | 'loading' | 'error' | 'rate_limited';

	let reportingState: ReportingState = $state('idle');
	let errorKey: string = $state('');

	// Track if the user is currently in a reported outage state
	let hasActiveReport: boolean = $state(false);

	const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

	// Mount effect: Check localStorage for an active cooldown lock
	$effect(() => {
		const lastReport = localStorage.getItem('ci_last_report');
		if (lastReport) {
			const timeSince = Date.now() - parseInt(lastReport, 10);
			if (timeSince < COOLDOWN_MS) {
				hasActiveReport = true;
			} else {
				localStorage.removeItem('ci_last_report');
				hasActiveReport = false;
			}
		}
	});

	let citySlug = $derived(page.url.searchParams.get('city') || 'chennai');

	async function handleReportTap(): Promise<void> {
		if (!navigator.geolocation) {
			reportingState = 'error';
			errorKey = 'no_geolocation';
			return;
		}

		reportingState = 'loading';

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				try {
					const res = await fetch('/api/report', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							lat: position.coords.latitude,
							lng: position.coords.longitude,
							citySlug: citySlug // Pass city so the backend knows where to record
						})
					});

					if (res.status === 429) {
						reportingState = 'rate_limited';
						return;
					}

					if (res.ok) {
						hasActiveReport = true;
						reportingState = 'idle';
						localStorage.setItem('ci_last_report', Date.now().toString());
						await refreshOutages();
					} else {
						reportingState = 'error';
						errorKey = 'server_failed';
					}
				} catch (err) {
					console.error('Report broadcast failed:', err);
					reportingState = 'error';
					errorKey = 'broadcast_failed';
				}
			},
			() => {
				reportingState = 'error';
				errorKey = 'gps_denied';
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}

	async function handleResolveTap(): Promise<void> {
		reportingState = 'loading';

		// Must get position to resolve the correct geohash
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				try {
					await fetch('/api/resolve', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							lat: position.coords.latitude,
							lng: position.coords.longitude
						})
					});
				} catch (err) {
					console.error('Resolution ping failed:', err);
				} finally {
					hasActiveReport = false;
					reportingState = 'idle';
					localStorage.removeItem('ci_last_report');
					await refreshOutages();
				}
			},
			() => {
				reportingState = 'error';
				errorKey = 'gps_denied';
			}
		);
	}
</script>

<footer class="z-10 flex flex-col items-center gap-3 border-t border-border bg-background p-4">
	<!-- Dynamic Status Readout -->
	<div class="h-5 text-center text-sm font-medium text-muted-foreground">
		{#if reportingState === 'loading'}
			Communicating with server...
		{:else if reportingState === 'rate_limited'}
			<span class="text-amber-600 dark:text-amber-400">Reported recently. Please wait.</span>
		{:else if reportingState === 'error'}
			<span class="text-destructive">
				{#if errorKey === 'no_geolocation'}Browser location not supported.{/if}
				{#if errorKey === 'server_failed'}Server connectivity failed.{/if}
				{#if errorKey === 'broadcast_failed'}Failed to broadcast report.{/if}
				{#if errorKey === 'gps_denied'}Location access denied. Please enable GPS.{/if}
			</span>
		{:else if hasActiveReport}
			<span class="text-green-600 dark:text-green-400"
				>Outage registered. Let us know when it's back!</span
			>
		{:else}
			Tap below if your power is out.
		{/if}
	</div>

	<div class="w-full max-w-md">
		{#if hasActiveReport}
			<!-- POWER IS BACK BUTTON -->
			<Button
				variant="outline"
				disabled={reportingState === 'loading'}
				onclick={handleResolveTap}
				class="h-16 w-full border-green-600 text-lg font-bold text-green-600 transition-all duration-300 hover:bg-green-600/10 hover:text-green-700 dark:border-green-500 dark:text-green-500"
			>
				{#if reportingState === 'loading'}
					UPDATING...
				{:else}
					CURRENT VANDHUDUCHU 💡
				{/if}
			</Button>
		{:else}
			<!-- POWER IS OUT BUTTON -->
			<Button
				variant="destructive"
				disabled={reportingState === 'loading'}
				onclick={handleReportTap}
				class="h-16 w-full text-lg font-bold shadow-[0_0_20px_rgba(220,38,38,0.15)] transition-all duration-300 hover:scale-[0.98]"
			>
				{#if reportingState === 'loading'}
					TRANSMITTING...
				{:else}
					CURRENT ILLA ⚡️
				{/if}
			</Button>
		{/if}
	</div>
</footer>
