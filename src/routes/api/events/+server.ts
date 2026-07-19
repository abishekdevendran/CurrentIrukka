import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { outageEvents } from '$lib/server/db/schema';
import { eq, and, or, gt, desc } from 'drizzle-orm';

export const GET = async ({ url }) => {
	const citySlug = url.searchParams.get('city');

	if (!citySlug) return json({ error: 'City is required' }, { status: 400 });

	try {
		const now = Date.now();
		const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
		const eightHoursAgo = new Date(now - 8 * 60 * 60 * 1000);

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
					eq(outageEvents.citySlug, citySlug),
					or(
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
			state: event.dbStatus === 'ACTIVE' ? 'outage' : 'restored',
			startedAt: event.startedAt,
			resolvedAt: event.resolvedAt
		}));

		return json(mappedEvents);
	} catch (error) {
		console.error(error);
		return json({ error: 'Failed to fetch events' }, { status: 500 });
	}
};
