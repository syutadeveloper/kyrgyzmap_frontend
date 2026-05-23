import { centroid, simplify } from '@turf/turf';
import osmtogeojson from 'osmtogeojson';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Point, Polygon } from 'geojson';
import type { BuildingFeature, BuildingProperties, BuildingTagKey } from '../types/building';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const POLYGON_SEARCH_RADIUS_METERS = 20;
const POLYGON_BBOX_HALF_SIZE_METERS = 120;
const POI_SEARCH_RADIUS_METERS = 50;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ITEMS = 80;
const TAG_KEYS: BuildingTagKey[] = ['building', 'shop', 'amenity', 'tourism', 'office'];

type CacheEntry = {
  createdAt: number;
  buildings: BuildingFeature[];
};

const cache = new Map<string, CacheEntry>();

const roundForCache = (value: number) => Math.round(value * 2000) / 2000;

const buildBBox = (latitude: number, longitude: number) => {
  const latDelta = POLYGON_BBOX_HALF_SIZE_METERS / 111320;
  const lngDelta = POLYGON_BBOX_HALF_SIZE_METERS / (111320 * Math.cos(latitude * Math.PI / 180));

  return {
    south: latitude - latDelta,
    west: longitude - lngDelta,
    north: latitude + latDelta,
    east: longitude + lngDelta,
  };
};

const normalizeTags = (properties: Record<string, unknown>) => {
  const source = typeof properties.tags === 'object' && properties.tags !== null
    ? properties.tags as Record<string, unknown>
    : properties;

  return Object.fromEntries(
    Object.entries(source)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => [key, String(value)]),
  );
};

const buildAddress = (tags: Record<string, string>) => {
  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const city = tags['addr:city'] ?? tags['addr:place'];
  const pieces = [street, houseNumber, city].filter(Boolean);
  return pieces.length > 0 ? pieces.join(' ') : tags.address ?? '';
};

const detectCategory = (tags: Record<string, string>) => {
  for (const key of TAG_KEYS) {
    if (tags[key]) return key + ': ' + tags[key];
  }
  return 'building';
};

const extractOsmIdentity = (properties: Record<string, unknown>) => {
  const rawId = String(properties.id ?? properties['@id'] ?? '');
  if (rawId.includes('/')) {
    const [osmType, osmId] = rawId.split('/');
    return { osmType, osmId };
  }

  return {
    osmType: String(properties.type ?? properties.osm_type ?? 'way'),
    osmId: String(properties.id ?? properties.osm_id ?? ''),
  };
};

const buildProperties = (
  properties: Record<string, unknown>,
  tags: Record<string, string>,
  latitude: number,
  longitude: number,
): BuildingProperties => {
  const { osmType, osmId } = extractOsmIdentity(properties);

  return {
    osmId,
    osmType,
    name: tags.name ?? tags['name:ja'] ?? tags['name:ru'] ?? tags['name:ky'] ?? tags.brand ?? tags.operator ?? '名称なし',
    category: detectCategory(tags),
    address: buildAddress(tags),
    latitude,
    longitude,
    tags,
  };
};

const toBuildingFeature = (feature: Feature<Geometry>): BuildingFeature | null => {
  if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon' && feature.geometry.type !== 'Point') return null;

  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  const tags = normalizeTags(properties);
  if (!TAG_KEYS.some((key) => tags[key])) return null;

  if (feature.geometry.type === 'Point') {
    const [longitude, latitude] = feature.geometry.coordinates;
    return {
      ...feature,
      geometry: feature.geometry as Point,
      properties: buildProperties(properties, tags, latitude, longitude),
    };
  }

  const center = centroid(feature as Feature<Polygon | MultiPolygon>);
  const [longitude, latitude] = center.geometry.coordinates;
  const simplified = simplify(feature as Feature<Polygon | MultiPolygon>, {
    tolerance: 0.000005,
    highQuality: false,
    mutate: false,
  }) as Feature<Polygon | MultiPolygon>;

  return {
    ...simplified,
    properties: buildProperties(properties, tags, latitude, longitude),
  };
};

const trimCache = () => {
  while (cache.size > MAX_CACHE_ITEMS) {
    const oldest = cache.keys().next().value;
    if (!oldest) return;
    cache.delete(oldest);
  }
};

export class OverpassService {
  static buildQuery(latitude: number, longitude: number) {
    const quote = String.fromCharCode(34);
    const bbox = buildBBox(latitude, longitude);
    const bboxFilter = bbox.south + ',' + bbox.west + ',' + bbox.north + ',' + bbox.east;
    const tagFilter = (tag: BuildingTagKey) => '[' + quote + tag + quote + '];';
    const tagBlocks = TAG_KEYS.flatMap((tag) => [
      '  way\n    (around:' + POLYGON_SEARCH_RADIUS_METERS + ',' + latitude + ',' + longitude + ')\n    ' + tagFilter(tag),
      '  relation\n    (around:' + POLYGON_SEARCH_RADIUS_METERS + ',' + latitude + ',' + longitude + ')\n    ' + tagFilter(tag),
      '  way\n    (' + bboxFilter + ')\n    ' + tagFilter(tag),
      '  relation\n    (' + bboxFilter + ')\n    ' + tagFilter(tag),
      '  node\n    (around:' + POI_SEARCH_RADIUS_METERS + ',' + latitude + ',' + longitude + ')\n    ' + tagFilter(tag),
    ]).join('\n\n');

    return '[out:json][timeout:25];\n\n(\n' + tagBlocks + '\n);\n\nout body;\n>;\nout skel qt;';
  }

  static cacheKey(latitude: number, longitude: number) {
    return roundForCache(latitude) + ',' + roundForCache(longitude);
  }

  static async fetchBuildings(latitude: number, longitude: number, signal?: AbortSignal) {
    const key = this.cacheKey(latitude, longitude);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.buildings;

    const query = this.buildQuery(latitude, longitude);
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'data=' + encodeURIComponent(query),
      signal,
    });

    if (response.status === 429) {
      throw new Error('Overpass APIの利用制限に達しました。少し待ってから再試行してください。');
    }

    if (response.status === 504 || response.status === 408) {
      throw new Error('Overpass APIがタイムアウトしました。少し拡大してから再試行してください。');
    }

    if (!response.ok) {
      throw new Error('建物情報を取得できませんでした。通信状態を確認してください。');
    }

    const osmJson = await response.json();
    const geojson = osmtogeojson(osmJson, { flatProperties: false }) as FeatureCollection<Geometry>;
    const buildings = geojson.features
      .map(toBuildingFeature)
      .filter((feature): feature is BuildingFeature => Boolean(feature));

    cache.set(key, { createdAt: Date.now(), buildings });
    trimCache();

    return buildings;
  }
}
