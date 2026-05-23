import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import BuildingHighlightLayer from './BuildingHighlightLayer';
import BuildingPopup from './BuildingPopup';
import BuildingSelector from './BuildingSelector';
import PlaceLayer from './PlaceLayer';
import PlaceCreateModal from './PlaceCreateModal';
import { useApp } from '../context/AppContext';
import { KYRGYZSTAN_CENTER, KYRGYZSTAN_PAN_BOUNDS } from '../constants/geo';
import type { Place, PlaceEntry, PlaceImportDraft, PlaceType } from '../types';
import type {
  BuildingSelection,
  BuildingSelectorStatus,
} from '../types/building';

type AppState = ReturnType<typeof useApp>;

const DEFAULT_ZOOM = 6;
let persistedMapView: { center: [number, number]; zoom: number } | null = null;

const getInitialMapView = () =>
  persistedMapView ?? {
    center: KYRGYZSTAN_CENTER,
    zoom: DEFAULT_ZOOM,
  };

const persistMapView = (map: L.Map) => {
  const center = map.getCenter();
  persistedMapView = {
    center: [center.lat, center.lng],
    zoom: map.getZoom(),
  };
};

type BoundsTrackerProps = {
  filters: AppState['filters'];
  onBoundsChange: AppState['setFilters'];
};

function BoundsTracker({ filters, onBoundsChange }: BoundsTrackerProps) {
  const filtersRef = useRef(filters);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    []
  );

  useMapEvents({
    moveend(event) {
      persistMapView(event.target);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const bounds = event.target.getBounds();
        onBoundsChange({
          ...filtersRef.current,
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
        });
      }, 180);
    },
    zoomend(event) {
      persistMapView(event.target);
    },
  });

  return null;
}

function BuildingPane() {
  const map = useMap();

  useEffect(() => {
    const pane =
      map.getPane('building-highlight-pane') ??
      map.createPane('building-highlight-pane');
    pane.style.zIndex = '650';
    pane.style.pointerEvents = 'none';
  }, [map]);

  return null;
}

function LocateButton() {
  const map = useMap();

  const locate = () => {
    map.locate({ setView: true, maxZoom: 13 });
    map.once('locationfound', (event: L.LocationEvent) => {
      L.circleMarker(event.latlng, {
        radius: 9,
        color: '#ffffff',
        fillColor: '#18e0a8',
        fillOpacity: 1,
      }).addTo(map);
    });
  };

  return (
    <button
      className="locate-button"
      type="button"
      onClick={locate}
      aria-label="現在地を表示"
    >
      ⌖
    </button>
  );
}

const statusLabel: Record<BuildingSelectorStatus, string> = {
  idle: '場所をタップして選択',
  loading: 'OSM情報を取得中...',
  ready: 'OSMの場所を選択中',
  empty: '周辺のOSM場所が見つかりません',
  error: 'OSM情報を取得できませんでした',
};

const formatDistance = (meters: number) =>
  meters < 1 ? 'タップ位置内' : `約${Math.round(meters)}m`;

const placeTypeFromTags = (tags: Record<string, string>): PlaceType => {
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'hospital' || tags.healthcare) return 'hospital';
  if (tags.shop) return 'shop';
  if (tags.office) return 'building';
  if (tags.tourism) return 'other';
  if (tags.highway || tags.public_transport) return 'transport';
  return 'other';
};

const selectionToImportDraft = (selection: BuildingSelection): PlaceImportDraft => {
  const { feature } = selection;
  const { properties } = feature;

  return {
    osmType: properties.osmType === 'relation' ? 'relation' : properties.osmType === 'node' ? 'node' : 'way',
    osmId: properties.osmId,
    name: properties.name,
    latitude: properties.latitude,
    longitude: properties.longitude,
    polygon: selection.geometryKind === 'polygon' ? feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon : undefined,
    address: properties.address,
    placeType: placeTypeFromTags(properties.tags),
    categoryIds: [placeTypeFromTags(properties.tags)],
  };
};

export default function MapView() {
  const {
    places,
    visibleMarkers,
    categories,
    selectPlace,
    importOsmPlace,
    loadEntries,
    setFilters,
    filters,
    highlightedPolygon,
    setHighlightedPolygon,
  } = useApp();
  const navigate = useNavigate();
  const initialMapViewRef = useRef(getInitialMapView());
  const [buildingStatus, setBuildingStatus] =
    useState<BuildingSelectorStatus>('idle');
  const [buildingCandidates, setBuildingCandidates] = useState<BuildingSelection[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingSelection | null>(null);
  const [selectedBuildingPlace, setSelectedBuildingPlace] = useState<Place | null>(null);
  const [selectedBuildingEntries, setSelectedBuildingEntries] = useState<PlaceEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [buildingError, setBuildingError] = useState('');
  const [tapPosition, setTapPosition] = useState<[number, number] | null>(null);
  const [addablePosition, setAddablePosition] = useState<[number, number] | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const statusDetail =
    buildingError ||
    (tapPosition
      ? `${tapPosition[0].toFixed(6)}, ${tapPosition[1].toFixed(6)}`
      : '');

  const clearBuildingSelection = useCallback(() => {
    setBuildingStatus('idle');
    setBuildingCandidates([]);
    setSelectedBuilding(null);
    setSelectedBuildingPlace(null);
    setSelectedBuildingEntries([]);
    setEntriesLoading(false);
    setBuildingError('');
    setTapPosition(null);
    setAddablePosition(null);
    setIsCreateModalOpen(false);
    setHighlightedPolygon(null);
    selectPlace(null);
  }, [selectPlace, setHighlightedPolygon]);

  const selectBuildingAsPlace = useCallback(async (selection: BuildingSelection | null) => {
    setSelectedBuilding(selection);
    setSelectedBuildingPlace(null);
    setSelectedBuildingEntries([]);
    setHighlightedPolygon(selection?.geometryKind === 'polygon' ? selection.feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon : null);
    if (selection) setAddablePosition(null);
    if (!selection) return;

    try {
      const place = await importOsmPlace(selectionToImportDraft(selection));
      setSelectedBuildingPlace(place);
      setEntriesLoading(true);
      const entries = await loadEntries(place.id);
      setSelectedBuildingEntries(entries);
    } catch (error) {
      setBuildingError(error instanceof Error ? error.message : '建物情報を保存できませんでした。');
      setBuildingStatus('error');
    } finally {
      setEntriesLoading(false);
    }
  }, [importOsmPlace, loadEntries, setHighlightedPolygon]);

  const openSelectedBuildingInfo = useCallback(() => {
    if (!selectedBuildingPlace) return;
    selectPlace(selectedBuildingPlace);
  }, [selectPlace, selectedBuildingPlace]);

  const writeSelectedBuildingInfo = useCallback(() => {
    if (!selectedBuildingPlace) return;
    selectPlace(selectedBuildingPlace);
    navigate(`/places/${selectedBuildingPlace.id}/entries/new`);
  }, [navigate, selectPlace, selectedBuildingPlace]);

  return (
    <section className="map-shell" aria-label="キルギスマップ">
      <MapContainer
        center={initialMapViewRef.current.center}
        zoom={initialMapViewRef.current.zoom}
        maxBounds={KYRGYZSTAN_PAN_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="map-canvas"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomleft" />
        <BuildingPane />
        <BoundsTracker filters={filters} onBoundsChange={setFilters} />
        <PlaceLayer places={visibleMarkers} categories={categories} onPlaceSelect={selectPlace} />
        <BuildingSelector
          clearSelectionOnNextMapClick={selectedBuilding !== null}
          onStatusChange={(status) => {
            setBuildingStatus(status);
            if (status === 'loading') setAddablePosition(null);
          }}
          onCandidatesChange={setBuildingCandidates}
          onSelect={(selection) => void selectBuildingAsPlace(selection)}
          onError={setBuildingError}
          onTapPositionChange={setTapPosition}
          onClearSelection={clearBuildingSelection}
          onEmptyTap={(position) => {
            setAddablePosition(position);
            setIsCreateModalOpen(false);
          }}
        />
        <BuildingPopup
          selection={selectedBuilding}
          place={selectedBuildingPlace}
          entries={selectedBuildingEntries}
          entriesLoading={entriesLoading}
          onViewInfo={openSelectedBuildingInfo}
          onWriteInfo={writeSelectedBuildingInfo}
        />
        <BuildingHighlightLayer geometry={highlightedPolygon} />
        <LocateButton />
      </MapContainer>

      <div
        className={`building-status building-status-${buildingStatus} ${selectedBuilding ? 'building-status-clearable' : ''}`}
        role={selectedBuilding ? 'button' : undefined}
        tabIndex={selectedBuilding ? 0 : undefined}
        onClick={selectedBuilding ? clearBuildingSelection : undefined}
        onKeyDown={(event) => {
          if (!selectedBuilding) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            clearBuildingSelection();
          }
        }}
      >
        <span aria-hidden="true" />
        <div>
          <strong>{statusLabel[buildingStatus]}</strong>
          {statusDetail && <small>{statusDetail}</small>}
        </div>
      </div>

      <div className="place-count">表示中 {places.length} Places</div>

      {buildingStatus === 'empty' && addablePosition && (
        <button className="add-place-button" type="button" onClick={() => setIsCreateModalOpen(true)}>
          この場所を追加しますか？
        </button>
      )}

      {buildingCandidates.length > 1 && (
        <div className="building-candidates" aria-label="建物候補">
          {buildingCandidates.map((candidate) => {
            const { feature } = candidate;
            const isSelected =
              selectedBuilding?.feature.properties.osmId === feature.properties.osmId;

            return (
              <button
                key={`${feature.properties.osmType}-${feature.properties.osmId}`}
                type="button"
                className={isSelected ? 'active' : ''}
                onClick={() => void selectBuildingAsPlace(candidate)}
              >
                <strong>{feature.properties.name}</strong>
                <span>
                  {feature.properties.category} ・ {formatDistance(candidate.distanceMeters)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {isCreateModalOpen && (
        <PlaceCreateModal position={addablePosition} onClose={() => setIsCreateModalOpen(false)} />
      )}
    </section>
  );
}
