export interface OutageEvent {
	cluster: string; // The geohash string
	state: 'outage' | 'restored' | 'pending'; // Added 'pending' for the yellow dots!
	startedAt: string | Date;
	resolvedAt?: string | Date | null;
}

// Base OpenStreetMap properties
export interface OSMProperties {
	id?: string;
	name?: string;
	'name:en'?: string;
	admin_level?: string;
	[key: string]: string | number | undefined; // Catch-all for extra tags (population, wikidata, etc.)
}

// Strongly typed Feature
export interface RegionFeature {
	type: 'Feature';
	id: string;
	properties: OSMProperties;
	geometry: {
		type: 'Point' | 'Polygon' | 'MultiPolygon';
		coordinates: unknown[]; // Kept loose for deeply nested multi-polygon arrays
	};
}

// Strongly typed FeatureCollection
export interface RegionFeatureCollection {
	type: 'FeatureCollection';
	features: RegionFeature[];
}
