export type GridState = 'outage' | 'restored';

export type OutageEvent = {
	cluster: string; // D6 Geohash
	state: GridState;
	startedAt: string;
	resolvedAt?: string;
};

// Expanded to hold constraints
export type CityData = {
	slug: string;
	name: string;
	center: [number, number];
	zoom: number;
	minZoom: number;
	maxZoom: number;
	maxBounds: [[number, number], [number, number]]; // [SouthWest Lat/Lng, NorthEast Lat/Lng]
};
