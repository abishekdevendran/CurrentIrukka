import { json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import { db } from '$lib/server/db';
import { outageReports, outageEvents } from '$lib/server/db/schema';
import { sql, eq } from 'drizzle-orm';
import defaultGeohash from 'ngeohash';

export const POST = async ({ request, getClientAddress }) => {
	try {
		// Extract citySlug to satisfy the schema constraints
		const { lat, lng, citySlug } = await request.json() as { lat: number; lng: number; citySlug: string };

		if (!lat || !lng || !citySlug) {
			return json({ error: 'Missing location payload' }, { status: 400 });
		}

		// Hash the IP address cleanly to guarantee privacy before doing anything
		const rawIp = getClientAddress();
		const textAsBuffer = new TextEncoder().encode(rawIp);
		const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
		const hashedIp = Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		// Compute the distinct geohashes
		const geohashD7 = defaultGeohash.encode(lat, lng, 7);
		const geohashD6 = geohashD7.slice(0, 6);

		// --- Redis Edge Shielding & Rate Limiting ---
		const rateLimitKey = `limit:ip:${hashedIp}`;
		const dedupeKey = `report:${hashedIp}:${geohashD6}`;

		// Block if user has sent any report within the last 5 minutes globally
		const isRateLimited = await redis.get(rateLimitKey);
		if (isRateLimited) {
			return json({ error: 'Tomb, konjam porunga. Too many requests.' }, { status: 429 });
		}

		// Block if user has already reported this neighborhood cluster in the last 15 minutes
		const isDuplicate = await redis.get(dedupeKey);
		if (isDuplicate) {
			return json({ message: 'Report already captured for this cycle.' }, { status: 200 });
		}

		// Set transactional window states in Redis
		await redis.setex(rateLimitKey, 300, 'true'); // 5m global rate limit
		await redis.setex(dedupeKey, 900, 'true'); // 15m neighborhood deduplication

		// --- PostGIS & Neon Telemetry Write ---
		await db.insert(outageReports).values({
			location: { x: lng, y: lat },
			geohash: geohashD7,
			hashedIp: hashedIp
		});

		// Run PostGIS 2km rolling spatial radius consensus check
		const consensusQuery = sql`
      SELECT COUNT(DISTINCT ${outageReports.hashedIp}) as unique_reporters
      FROM ${outageReports}
      WHERE 
        ${outageReports.reportedAt} >= NOW() - INTERVAL '15 minutes'
        AND ST_DWithin(
          ${outageReports.location}::geography, 
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 
          2000
        )
    `;
		const consensusResult = await db.execute(consensusQuery);

		const uniqueReporters = Number(consensusResult.rows[0]?.unique_reporters || 0);

		// If consensus hits >= 3 unique users, promote/update the live event cluster
		if (uniqueReporters >= 3) {
			await db
				.insert(outageEvents)
				.values({
					geohashCluster: geohashD6,
					citySlug: citySlug,
					status: 'ACTIVE',
					startedAt: new Date(),
					lastVerifiedAt: new Date()
				})
				.onConflictDoUpdate({
					target: outageEvents.geohashCluster,
					targetWhere: sql`status = 'ACTIVE'`, // Explicitly target the partial unique index
					set: {
						lastVerifiedAt: new Date(),
						// Auto-decay logic: If the active event is stale, treat this consensus as a new outage
						startedAt: sql`
              CASE 
                WHEN ${outageEvents.lastVerifiedAt} < NOW() - INTERVAL '8 hours' 
                THEN NOW() 
                ELSE ${outageEvents.startedAt} 
              END
            `
					}
				});

			// Instantly rebuild the active Redis read-cache view so the next user sees it immediately
			const updatedActiveOutages = await db
				.select({ cluster: outageEvents.geohashCluster, startedAt: outageEvents.startedAt })
				.from(outageEvents)
				.where(eq(outageEvents.status, 'ACTIVE'));

			await redis.set('map_state:active', JSON.stringify(updatedActiveOutages));
		}

		return json({ success: true, consensusAchieved: uniqueReporters >= 3 });
	} catch (error) {
		console.error('Error recording telemetry:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
