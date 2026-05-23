export type Visibility = 'public' | 'private';
export type OsmType = 'node' | 'way' | 'relation';
export type PlaceSourceType = 'osm' | 'user';
export type PlaceType =
  | 'building'
  | 'shop'
  | 'cafe'
  | 'restaurant'
  | 'meeting_point'
  | 'danger'
  | 'market'
  | 'temporary'
  | 'transport'
  | 'hospital'
  | 'school'
  | 'teacher'
  | 'hidden'
  | 'other';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

export type GuestAuthor = {
  id: string;
  name: string;
  email?: string;
};

export type Place = {
  id: string;
  sourceType: PlaceSourceType;
  placeType: PlaceType;
  osmType?: OsmType;
  osmId?: string;
  name: string;
  latitude: number;
  longitude: number;
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  address: string;
  googleMapsUrl: string;
  twoGisUrl: string;
  categoryIds: string[];
  aliases: PlaceAlias[];
  createdAt: string;
  updatedAt: string;
};

export type PlaceAlias = {
  id: string;
  placeId: string;
  alias: string;
  language: string;
};

export type PlaceEntry = {
  id: string;
  placeId: string;
  userId?: string;
  visibility: Visibility;
  title: string;
  description: string;
  photos: string[];
  creator: User | GuestAuthor;
  firstEditor: User | GuestAuthor;
  lastEditor: User | GuestAuthor;
  editors: Array<User | GuestAuthor>;
  createdAt: string;
  updatedAt: string;
};

export type Review = {
  id: string;
  placeId: string;
  userId?: string;
  content: string;
  rating: 1 | 2 | 3 | 4 | 5;
  visibility: Visibility;
  author: User | GuestAuthor;
  createdAt: string;
};

export type PlaceImportDraft = {
  osmType: OsmType;
  osmId: string | number;
  placeType?: PlaceType;
  name?: string;
  latitude?: number;
  longitude?: number;
  polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  address?: string;
  categoryIds?: string[];
};

export type PlaceEntryDraft = Pick<PlaceEntry, 'title' | 'description' | 'visibility' | 'photos'> & {
  guestName?: string;
};

export type UserPlaceDraft = {
  name: string;
  placeType: PlaceType;
  latitude: number;
  longitude: number;
  address?: string;
  categoryIds?: string[];
  entry?: PlaceEntryDraft;
};

export type ReviewDraft = Pick<Review, 'content' | 'rating' | 'visibility'> & {
  guestName?: string;
};

export type SearchFilters = {
  query: string;
  categoryIds: string[];
  keyword: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
};
