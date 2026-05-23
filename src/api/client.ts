import {
  categories as fallbackCategories,
  currentUser,
  entries as fallbackEntries,
  places as fallbackPlaces,
  reviews as fallbackReviews,
} from '../data/mockData';
import type {
  Category,
  Place,
  PlaceEntry,
  PlaceEntryDraft,
  PlaceImportDraft,
  Review,
  ReviewDraft,
  SearchFilters,
  User,
  UserPlaceDraft,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const shouldUseMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

let mockPlaces = [...fallbackPlaces];
let mockEntries = [...fallbackEntries];
let mockReviews = [...fallbackReviews];
let activeUser: User | null = currentUser;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const buildMapLinks = (latitude: number, longitude: number) => ({
  googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  twoGisUrl: `https://2gis.kg/search/${latitude}%2C${longitude}`,
});

const userCanSee = (visibility: 'public' | 'private', userId?: string) =>
  visibility === 'public' || Boolean(activeUser && userId === activeUser.id);

const distanceMeters = (a: Pick<Place, 'latitude' | 'longitude'>, b: Pick<Place, 'latitude' | 'longitude'>) => {
  const earthRadius = 6371000;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const deltaLat = (b.latitude - a.latitude) * Math.PI / 180;
  const deltaLng = (b.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const normalizeName = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();

const nameLooksSimilar = (a: string, b: string) => {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = right.split(' ');
  return rightTokens.some((token) => token.length >= 4 && leftTokens.has(token));
};

const placeText = (place: Place) => {
  const entries = mockEntries.filter((entry) => entry.placeId === place.id && userCanSee(entry.visibility, entry.userId));
  const reviews = mockReviews.filter((review) => review.placeId === place.id && userCanSee(review.visibility, review.userId));
  return [
    place.name,
    place.address,
    ...place.aliases.map((alias) => alias.alias),
    ...entries.flatMap((entry) => [entry.title, entry.description]),
    ...reviews.map((review) => review.content),
  ].join(' ').toLowerCase();
};

const keywordMatch = (place: Place, filters: SearchFilters) => {
  const text = placeText(place);
  const query = filters.query.trim().toLowerCase();
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesQuery = !query || text.includes(query);
  const matchesKeyword = !keyword || text.includes(keyword);
  const matchesCategory = filters.categoryIds.length === 0 || filters.categoryIds.some((id) => place.categoryIds.includes(id));
  const matchesBounds = !filters.bounds || (
    place.latitude <= filters.bounds.north &&
    place.latitude >= filters.bounds.south &&
    place.longitude <= filters.bounds.east &&
    place.longitude >= filters.bounds.west
  );

  return matchesQuery && matchesKeyword && matchesCategory && matchesBounds;
};

const normalizeOsmId = (value: string | number) => String(value);

const sortPlacesForDisplay = (items: Place[]) =>
  [...items].sort((a, b) => Number(a.sourceType === 'user') - Number(b.sourceType === 'user'));

const enforceEntryUniqueness = (placeId: string, draft: PlaceEntryDraft) => {
  const userId = activeUser?.id;
  if (draft.visibility === 'public') {
    return !mockEntries.some((entry) => entry.placeId === placeId && entry.visibility === 'public');
  }

  return Boolean(userId) && !mockEntries.some((entry) => entry.placeId === placeId && entry.visibility === 'private' && entry.userId === userId);
};

const api = {
  async me() {
    if (shouldUseMock) return activeUser;
    return request<User | null>('/me');
  },
  async login(email: string) {
    if (shouldUseMock) {
      activeUser = { ...currentUser, email, name: email.split('@')[0] || currentUser.name };
      return activeUser;
    }
    return request<User>('/login', { method: 'POST', body: JSON.stringify({ email }) });
  },
  async register(name: string, email: string) {
    if (shouldUseMock) {
      activeUser = { id: 'user-local', name, email };
      return activeUser;
    }
    return request<User>('/register', { method: 'POST', body: JSON.stringify({ name, email }) });
  },
  async logout() {
    if (shouldUseMock) {
      activeUser = null;
      return;
    }
    await request('/logout', { method: 'POST' });
  },
  async forgotPassword(email: string) {
    if (shouldUseMock) return { ok: true, email };
    return request('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },
  async resetPassword(token: string, password: string) {
    if (shouldUseMock) return { ok: true, token, passwordLength: password.length };
    return request('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
  },
  async categories(): Promise<Category[]> {
    if (shouldUseMock) return fallbackCategories;
    return request<Category[]>('/categories');
  },
  async places(filters: SearchFilters): Promise<Place[]> {
    if (shouldUseMock) return sortPlacesForDisplay(mockPlaces.filter((place) => keywordMatch(place, filters)));
    const params = new URLSearchParams({
      q: filters.query,
      keyword: filters.keyword,
      categories: filters.categoryIds.join(','),
    });
    if (filters.bounds) {
      params.set('north', String(filters.bounds.north));
      params.set('south', String(filters.bounds.south));
      params.set('east', String(filters.bounds.east));
      params.set('west', String(filters.bounds.west));
    }
    return request<Place[]>(`/places?${params.toString()}`);
  },
  async place(id: string): Promise<Place | undefined> {
    if (shouldUseMock) return mockPlaces.find((place) => place.id === id);
    return request<Place>(`/places/${id}`);
  },
  async placeByOsm(osmType: string, osmId: string | number): Promise<Place | undefined> {
    if (shouldUseMock) return mockPlaces.find((place) => place.sourceType === 'osm' && place.osmType === osmType && place.osmId === normalizeOsmId(osmId));
    return request<Place>(`/places/osm/${osmType}/${osmId}`);
  },
  async importOsmPlace(draft: PlaceImportDraft): Promise<Place> {
    if (shouldUseMock) {
      const existing = await this.placeByOsm(draft.osmType, draft.osmId);
      if (existing) return existing;

      const latitude = draft.latitude ?? 0;
      const longitude = draft.longitude ?? 0;
      const place: Place = {
        id: `place-${Date.now()}`,
        sourceType: 'osm',
        placeType: draft.placeType ?? 'building',
        osmType: draft.osmType,
        osmId: normalizeOsmId(draft.osmId),
        name: draft.name || `${draft.osmType}/${draft.osmId}`,
        latitude,
        longitude,
        polygon: draft.polygon ?? null,
        address: draft.address ?? '',
        categoryIds: draft.categoryIds ?? ['other'],
        aliases: [],
        ...buildMapLinks(latitude, longitude),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPlaces = [place, ...mockPlaces];
      return place;
    }
    return request<Place>('/places/import-osm', { method: 'POST', body: JSON.stringify(draft) });
  },
  async nearbyPlaces(latitude: number, longitude: number, radiusMeters = 20, name?: string): Promise<Place[]> {
    if (shouldUseMock) {
      return sortPlacesForDisplay(mockPlaces.filter((place) => {
        const close = distanceMeters(place, { latitude, longitude }) <= radiusMeters;
        const similar = name ? nameLooksSimilar(place.name, name) || place.aliases.some((alias) => nameLooksSimilar(alias.alias, name)) : false;
        return close || similar;
      }));
    }
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      radius: String(radiusMeters),
    });
    if (name) params.set('name', name);
    return request<Place[]>(`/places/nearby?${params.toString()}`);
  },
  async createUserPlace(draft: UserPlaceDraft): Promise<Place> {
    const now = new Date().toISOString();
    if (shouldUseMock) {
      const place: Place = {
        id: `place-user-${Date.now()}`,
        sourceType: 'user',
        placeType: draft.placeType,
        name: draft.name.trim(),
        latitude: draft.latitude,
        longitude: draft.longitude,
        polygon: null,
        address: draft.address ?? '',
        categoryIds: draft.categoryIds?.length ? draft.categoryIds : [draft.placeType],
        aliases: [],
        ...buildMapLinks(draft.latitude, draft.longitude),
        createdAt: now,
        updatedAt: now,
      };
      mockPlaces = [place, ...mockPlaces];
      if (draft.entry && draft.entry.description.trim()) {
        await this.createEntry(place.id, draft.entry);
      }
      return place;
    }
    return request<Place>('/places', { method: 'POST', body: JSON.stringify(draft) });
  },
  async entries(placeId: string): Promise<PlaceEntry[]> {
    if (shouldUseMock) {
      return mockEntries
        .filter((entry) => entry.placeId === placeId && userCanSee(entry.visibility, entry.userId))
        .sort((a, b) => Number(a.visibility === 'private') - Number(b.visibility === 'private'));
    }
    return request<PlaceEntry[]>(`/places/${placeId}/entries`);
  },
  async createEntry(placeId: string, draft: PlaceEntryDraft): Promise<PlaceEntry> {
    const now = new Date().toISOString();
    const author = activeUser ?? { id: `guest-${Date.now()}`, name: draft.guestName || 'ゲスト' };
    if (shouldUseMock) {
      if (!enforceEntryUniqueness(placeId, draft)) {
        throw new Error(draft.visibility === 'public' ? '公開投稿は1建物につき1件までです。' : '自分用投稿は1建物につき1件までです。');
      }
      const entry: PlaceEntry = {
        id: `entry-${Date.now()}`,
        placeId,
        userId: activeUser?.id,
        visibility: draft.visibility,
        title: draft.title,
        description: draft.description,
        photos: draft.photos,
        creator: author,
        firstEditor: author,
        lastEditor: author,
        editors: [author],
        createdAt: now,
        updatedAt: now,
      };
      mockEntries = [entry, ...mockEntries];
      return entry;
    }
    return request<PlaceEntry>(`/places/${placeId}/entries`, { method: 'POST', body: JSON.stringify(draft) });
  },
  async updateEntry(id: string, draft: PlaceEntryDraft): Promise<PlaceEntry> {
    if (shouldUseMock) {
      const existing = mockEntries.find((entry) => entry.id === id);
      if (!existing) throw new Error('Entry not found');
      const editor = activeUser ?? existing.lastEditor;
      const updated: PlaceEntry = {
        ...existing,
        ...draft,
        lastEditor: editor,
        editors: existing.editors.some((item) => item.id === editor.id) ? existing.editors : [...existing.editors, editor],
        updatedAt: new Date().toISOString(),
      };
      mockEntries = mockEntries.map((entry) => (entry.id === id ? updated : entry));
      return updated;
    }
    return request<PlaceEntry>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(draft) });
  },
  async reviews(placeId: string): Promise<Review[]> {
    if (shouldUseMock) return mockReviews.filter((review) => review.placeId === placeId && userCanSee(review.visibility, review.userId));
    return request<Review[]>(`/places/${placeId}/reviews`);
  },
  async createReview(placeId: string, draft: ReviewDraft): Promise<Review> {
    const review: Review = {
      id: `review-${Date.now()}`,
      placeId,
      userId: activeUser?.id,
      content: draft.content,
      rating: draft.rating,
      visibility: draft.visibility,
      author: activeUser ?? { id: `guest-${Date.now()}`, name: draft.guestName || 'ゲスト' },
      createdAt: new Date().toISOString(),
    };
    if (shouldUseMock) {
      mockReviews = [review, ...mockReviews];
      return review;
    }
    return request<Review>(`/places/${placeId}/reviews`, { method: 'POST', body: JSON.stringify(draft) });
  },
};

export default api;
