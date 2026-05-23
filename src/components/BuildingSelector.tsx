import {
  booleanPointInPolygon,
  distance,
  point,
  pointToPolygonDistance,
} from '@turf/turf';
import { useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import { OverpassService } from '../services/OverpassService';
import { isInsideKyrgyzstanBounds } from '../constants/geo';
import type { Feature, MultiPolygon, Point, Polygon } from 'geojson';
import type {
  BuildingFeature,
  BuildingProperties,
  BuildingSelection,
  BuildingSelectorStatus,
} from '../types/building';

type Props = {
  clearSelectionOnNextMapClick: boolean;
  onStatusChange: (status: BuildingSelectorStatus) => void;
  onCandidatesChange: (candidates: BuildingSelection[]) => void;
  onSelect: (selection: BuildingSelection | null) => void;
  onError: (message: string) => void;
  onTapPositionChange: (position: [number, number] | null) => void;
  onClearSelection: () => void;
  onEmptyTap: (position: [number, number]) => void;
};

const POLYGON_DISTANCE_METERS = 20;
const POI_DISTANCE_METERS = 50;

type PolygonBuildingFeature = Feature<Polygon | MultiPolygon, BuildingProperties>;
type PointBuildingFeature = Feature<Point, BuildingProperties>;

const isPolygonFeature = (feature: BuildingFeature): feature is PolygonBuildingFeature =>
  feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon';

const scoreBuilding = (
  feature: BuildingFeature,
  latitude: number,
  longitude: number
): BuildingSelection => {
  const tapPoint = point([longitude, latitude]);

  if (isPolygonFeature(feature)) {
    const isInside = booleanPointInPolygon(tapPoint, feature);
    const distanceMeters = isInside
      ? 0
      : pointToPolygonDistance(tapPoint, feature, { units: 'meters' });

    return { feature, distanceMeters, isInside, geometryKind: 'polygon' };
  }

  const pointFeature = feature as PointBuildingFeature;
  const distanceMeters = distance(tapPoint, point(pointFeature.geometry.coordinates), { units: 'meters' });
  return { feature, distanceMeters, isInside: false, geometryKind: 'point' };
};

const compareSelections = (a: BuildingSelection, b: BuildingSelection) => {
  if (a.geometryKind !== b.geometryKind) return a.geometryKind === 'polygon' ? -1 : 1;
  if (a.isInside !== b.isInside) return a.isInside ? -1 : 1;

  const aHasBuilding = Boolean(a.feature.properties.tags.building);
  const bHasBuilding = Boolean(b.feature.properties.tags.building);
  if (
    aHasBuilding !== bHasBuilding &&
    Math.abs(a.distanceMeters - b.distanceMeters) < 2
  ) {
    return aHasBuilding ? -1 : 1;
  }

  return a.distanceMeters - b.distanceMeters;
};

const buildCandidates = (features: BuildingFeature[], latitude: number, longitude: number) => {
  const scored = features
    .map((feature) => scoreBuilding(feature, latitude, longitude))
    .sort(compareSelections);

  const polygonCandidates = scored.filter(
    (selection) =>
      selection.geometryKind === 'polygon' &&
      (selection.isInside || selection.distanceMeters <= POLYGON_DISTANCE_METERS)
  );

  if (polygonCandidates.length > 0) return polygonCandidates.slice(0, 5);

  return scored
    .filter(
      (selection) =>
        selection.geometryKind === 'point' &&
        selection.distanceMeters <= POI_DISTANCE_METERS
    )
    .slice(0, 5);
};

export default function BuildingSelector({
  clearSelectionOnNextMapClick,
  onStatusChange,
  onCandidatesChange,
  onSelect,
  onError,
  onTapPositionChange,
  onClearSelection,
  onEmptyTap,
}: Props) {
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    []
  );

  useMapEvents({
    click(event) {
      if (clearSelectionOnNextMapClick) {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        abortRef.current?.abort();
        onClearSelection();
        return;
      }

      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));

      onTapPositionChange([latitude, longitude]);
      onError('');
      onCandidatesChange([]);
      onSelect(null);

      if (!isInsideKyrgyzstanBounds(latitude, longitude)) {
        onStatusChange('empty');
        onError('キルギス国内の場所を選択してください。');
        return;
      }

      onStatusChange('loading');

      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      debounceRef.current = window.setTimeout(() => {
        const controller = abortRef.current;
        if (!controller) return;

        void OverpassService.fetchBuildings(
          latitude,
          longitude,
          controller.signal
        )
          .then((buildings) => {
            const candidates = buildCandidates(buildings, latitude, longitude);

            onCandidatesChange(candidates);
            onSelect(candidates[0] ?? null);
            if (candidates.length === 0) onEmptyTap([latitude, longitude]);
            onStatusChange(candidates.length > 0 ? 'ready' : 'empty');
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            onError(
              error instanceof Error
                ? error.message
                : '場所情報を取得できませんでした。'
            );
            onStatusChange('error');
          });
      }, 280);
    },
  });

  return null;
}
