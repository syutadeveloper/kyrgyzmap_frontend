import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { Category, Place } from '../types';

const createIcon = (place: Place, color: string) => {
  const isUserPlace = place.sourceType === 'user';
  const label = isUserPlace ? '+' : (place.categoryIds.length > 0 ? 'o' : '□');
  const className = isUserPlace ? 'map-pin map-pin-user' : 'map-pin map-pin-osm';
  const pinColor = isUserPlace ? '#fb923c' : color;

  return L.divIcon({
    className: '',
    html: '<span class=\'' + className + '\' style=\'--pin-color:' + pinColor + '\'>' + label + '</span>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

type Props = {
  places: Place[];
  categories: Category[];
  onPlaceSelect: (place: Place) => void;
};

export default function PlaceLayer({ places, categories, onPlaceSelect }: Props) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      (globalThis as typeof globalThis & { L: typeof L }).L = L;
      await import('leaflet.markercluster');
      if (disposed) return;

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 42,
      }).addTo(map);
      clusterRef.current = cluster;
      setIsReady(true);
    })();

    return () => {
      disposed = true;
      setIsReady(false);
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!isReady || !cluster) return;

    cluster.clearLayers();
    places.forEach((place) => {
      const category = categories.find((item) => item.id === place.categoryIds[0] || item.id === place.placeType);
      const marker = L.marker([place.latitude, place.longitude], {
        icon: createIcon(place, category?.color ?? '#ffffff'),
      });
      marker.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stop(event);
        onPlaceSelect(place);
      });
      cluster.addLayer(marker);
    });
  }, [categories, isReady, onPlaceSelect, places]);

  return null;
}
