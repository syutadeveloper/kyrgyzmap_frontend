import { GeoJSON } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

type Props = {
  geometry: Polygon | MultiPolygon | null;
};

const highlightStyle: PathOptions = {
  color: '#ff9f1c',
  fillColor: '#ff9f1c',
  fillOpacity: 0.28,
  opacity: 1,
  weight: 4,
};

export default function BuildingHighlightLayer({ geometry }: Props) {
  if (!geometry) return null;

  const feature: Feature<Polygon | MultiPolygon> = {
    type: 'Feature',
    geometry,
    properties: {},
  };

  return (
    <GeoJSON
      key={JSON.stringify(geometry.coordinates).slice(0, 120)}
      data={feature}
      pane="building-highlight-pane"
      style={highlightStyle}
    />
  );
}
