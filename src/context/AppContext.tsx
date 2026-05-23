import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../api/client';
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

type AppContextValue = {
  user: User | null;
  categories: Category[];
  places: Place[];
  filters: SearchFilters;
  selectedPlace: Place | null;
  highlightedPolygon: Place['polygon'] | null;
  visibleMarkers: Place[];
  installPrompt: BeforeInstallPromptEvent | null;
  setFilters: (filters: SearchFilters) => void;
  selectPlace: (place: Place | null) => void;
  setHighlightedPolygon: (polygon: Place['polygon'] | null) => void;
  refreshPlaces: () => Promise<void>;
  importOsmPlace: (draft: PlaceImportDraft) => Promise<Place>;
  createUserPlace: (draft: UserPlaceDraft) => Promise<Place>;
  findDuplicatePlaces: (latitude: number, longitude: number, name?: string) => Promise<Place[]>;
  loadEntries: (placeId: string) => Promise<PlaceEntry[]>;
  createEntry: (placeId: string, draft: PlaceEntryDraft) => Promise<PlaceEntry>;
  updateEntry: (id: string, draft: PlaceEntryDraft) => Promise<PlaceEntry>;
  loadReviews: (placeId: string) => Promise<Review[]>;
  createReview: (placeId: string, draft: ReviewDraft) => Promise<Review>;
  login: (email: string) => Promise<void>;
  register: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  promptInstall: () => Promise<void>;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const initialFilters: SearchFilters = { query: '', categoryIds: [], keyword: '' };
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [highlightedPolygon, setHighlightedPolygon] = useState<Place['polygon'] | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const refreshPlaces = useCallback(async () => {
    const nextPlaces = await api.places(filters);
    setPlaces(nextPlaces);
  }, [filters]);

  const selectPlace = useCallback((place: Place | null) => {
    setSelectedPlace(place);
    setHighlightedPolygon(place?.polygon ?? null);
  }, []);

  useEffect(() => {
    void api.me().then(setUser);
    void api.categories().then(setCategories);
  }, []);

  useEffect(() => {
    void refreshPlaces();
  }, [refreshPlaces]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    user,
    categories,
    places,
    filters,
    selectedPlace,
    highlightedPolygon,
    visibleMarkers: places,
    installPrompt,
    setFilters,
    selectPlace,
    setHighlightedPolygon,
    refreshPlaces,
    async importOsmPlace(draft) {
      const place = await api.importOsmPlace(draft);
      await refreshPlaces();
      return place;
    },
    async createUserPlace(draft) {
      const place = await api.createUserPlace(draft);
      await refreshPlaces();
      return place;
    },
    findDuplicatePlaces(latitude, longitude, name) {
      return api.nearbyPlaces(latitude, longitude, 20, name);
    },
    loadEntries: api.entries,
    async createEntry(placeId, draft) {
      const entry = await api.createEntry(placeId, draft);
      await refreshPlaces();
      return entry;
    },
    async updateEntry(id, draft) {
      const entry = await api.updateEntry(id, draft);
      await refreshPlaces();
      return entry;
    },
    loadReviews: api.reviews,
    async createReview(placeId, draft) {
      return api.createReview(placeId, draft);
    },
    async login(email) {
      setUser(await api.login(email));
      await refreshPlaces();
    },
    async register(name, email) {
      setUser(await api.register(name, email));
      await refreshPlaces();
    },
    async logout() {
      await api.logout();
      setUser(null);
      await refreshPlaces();
    },
    async promptInstall() {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    },
  }), [categories, filters, highlightedPolygon, installPrompt, places, refreshPlaces, selectPlace, selectedPlace, user]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
