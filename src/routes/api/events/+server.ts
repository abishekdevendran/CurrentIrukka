import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { outageEvents } from '$lib/server/db/schema';
import { eq, and, or, gt, desc } from 'drizzle-orm';

export const GET = async ({ url }) => {
	const district = url.searchParams.get('district');
	const region = url.searchParams.get('region'); // Optional

	if (!district) return json({ error: 'District is required' }, { status: 400 });

	try {
		const now = Date.now();
		const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
		const eightHoursAgo = new Date(now - 8 * 60 * 60 * 1000);

		// Build the base geography condition
		const geoCondition = region
			? and(eq(outageEvents.district, district), eq(outageEvents.region, region))
			: eq(outageEvents.district, district);

		const rawEvents = await db
			.select({
				cluster: outageEvents.geohashCluster,
				dbStatus: outageEvents.status,
				startedAt: outageEvents.startedAt,
				resolvedAt: outageEvents.resolvedAt
			})
			.from(outageEvents)
			.where(
				and(
					geoCondition,
					or(
						// PENDING: Show yellow unverified dots recently reported
						and(eq(outageEvents.status, 'PENDING'), gt(outageEvents.startedAt, twoHoursAgo)),
						// ACTIVE: Only show if it was verified in the last 8 hours
						and(eq(outageEvents.status, 'ACTIVE'), gt(outageEvents.lastVerifiedAt, eightHoursAgo)),
						// RESOLVED: Only show if it was restored in the last 2 hours
						and(eq(outageEvents.status, 'RESOLVED'), gt(outageEvents.resolvedAt, twoHoursAgo))
					)
				)
			)
			.orderBy(desc(outageEvents.startedAt))
			.limit(1000);

		const mappedEvents = rawEvents.map((event) => ({
			cluster: event.cluster,
			state:
				event.dbStatus === 'PENDING'
					? 'pending'
					: event.dbStatus === 'ACTIVE'
						? 'outage'
						: 'restored',
			startedAt: event.startedAt,
			resolvedAt: event.resolvedAt
		}));

		return json(mappedEvents);
	} catch (error) {
		console.error('[API/Events] Fetch Error:', error);
		return json({ error: 'Failed to fetch events' }, { status: 500 });
	}
};
