import {
	geometry,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Added PENDING (unverified crowdsource) and SCHEDULED (TNEB Cron)
export const outageStatusEnum = pgEnum('outage_status', [
	'PENDING',
	'ACTIVE',
	'RESOLVED',
	'SCHEDULED'
]);

// ==========================================
// TABLE: Raw Telemetry (Append-Only Ledger)
// ==========================================
export const outageReports = pgTable(
	'outage_reports',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
		geohash: varchar('geohash', { length: 12 }).notNull(),
		hashedIp: varchar('hashed_ip', { length: 64 }).notNull(),
		reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull()
	},
	(table) => [
		index('idx_outage_reports_reported_at').on(table.reportedAt),
		index('idx_outage_reports_location').using('gist', table.location),
		index('idx_outage_reports_geohash').on(table.geohash)
	]
);

// ==========================================
// TABLE: Verified Events (Stateful Timeline)
// ==========================================
export const outageEvents = pgTable(
	'outage_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		geohashCluster: varchar('geohash_cluster', { length: 12 }).notNull(),

		// New Geographic Hierarchy
		district: varchar('district', { length: 100 }).notNull(),
		region: varchar('region', { length: 100 }), // Nullable for fallback reports outside specific OSM polygons

		// Defaulting to PENDING ensures new reports go to peer-review state first
		status: outageStatusEnum('status').default('PENDING').notNull(),

		startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
		lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true, mode: 'date' })
			.defaultNow()
			.notNull(),
		resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' })
	},
	(table) => [
		index('idx_outage_events_status').on(table.status, table.geohashCluster),

		// Fast geographic routing lookups
		index('idx_outage_events_district').on(table.district),
		index('idx_outage_events_region').on(table.region),

		index('idx_outage_events_started_at').on(table.startedAt),
		index('idx_outage_events_resolved_at').on(table.resolvedAt),

		// Enforces the state machine: A specific micro-cluster can only have
		// ONE active issue at a time, whether it is pending review or verified active.
		uniqueIndex('unique_ongoing_outage')
			.on(table.geohashCluster)
			.where(sql`status IN ('ACTIVE', 'PENDING')`)
	]
);
