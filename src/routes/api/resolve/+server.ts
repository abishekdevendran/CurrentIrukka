import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redis } from '$lib/server/redis';

export const POST: RequestHandler = async ({ getClientAddress }) => {
	try {
		const rawIp = getClientAddress();
		const textAsBuffer = new TextEncoder().encode(rawIp);
		const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
		const hashedIp = Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		const rateLimitKey = `limit:ip:${hashedIp}`;
		await redis.del(rateLimitKey);

		return json({ success: true });
	} catch (err: unknown) {
		console.error('Resolution endpoint error:', err);
		return json({ error: 'Failed to process resolution' }, { status: 500 });
	}
};
