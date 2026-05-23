import type { Feature, MultiPolygon, Point, Polygon } from 'geojson';

export type BuildingTagKey = 'building' | 'amenity' | 'shop' | 'tourism' | 'office';
export type OsmFeatureGeometry = Point | Polygon | MultiPolygon;

export type BuildingProperties = {
  osmId: string;
  osmType: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: Record<string, string>;
};

export type BuildingFeature = Feature<OsmFeatureGeometry, BuildingProperties>;

export type BuildingSelection = {
  feature: BuildingFeature;
  distanceMeters: number;
  isInside: boolean;
  geometryKind: 'polygon' | 'point';
};

export type BuildingSelectorStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
