import { json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis'; // Assumes your client wrapper
import { db } from '$lib/server/db';
import { outageEvents } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET = async ({ setHeaders }) => {
	// Layer 1: Tell Cloudflare to cache this JSON payload globally at edge nodes for 15s
	setHeaders({
		'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
	});

	try {
		// Layer 2: Attempt memory read from redis
		const cachedData = await redis.get('map_state:active');
		if (cachedData) {
			return new Response(
				typeof cachedData === 'string' ? cachedData : JSON.stringify(cachedData),
				{
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Layer 3 (Fallback): Neon query if redis cache is warm-evicted
		const activeOutages = await db
			.select({
				cluster: outageEvents.geohashCluster,
				startedAt: outageEvents.startedAt
			})
			.from(outageEvents)
			.where(eq(outageEvents.status, 'ACTIVE'));

		// Rehydrate redis asynchronously so subsequent reads stay fast
		await redis.setex('map_state:active', 60, JSON.stringify(activeOutages));

		return json(activeOutages);
	} catch (error) {
		console.error('Failed to fetch outages:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
