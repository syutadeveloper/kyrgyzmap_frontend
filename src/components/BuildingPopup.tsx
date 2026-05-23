import { Popup } from 'react-leaflet';
import type { Place, PlaceEntry } from '../types';
import type { BuildingSelection } from '../types/building';

type Props = {
  selection: BuildingSelection | null;
  place: Place | null;
  entries: PlaceEntry[];
  entriesLoading: boolean;
  onViewInfo: () => void;
  onWriteInfo: () => void;
};

export default function BuildingPopup({
  selection,
  place,
  entries,
  entriesLoading,
  onViewInfo,
  onWriteInfo,
}: Props) {
  if (!selection) return null;

  const { feature } = selection;
  const { latitude, longitude, name } = feature.properties;
  const googleMapsUrl = place?.googleMapsUrl ?? `https://maps.google.com/?q=${latitude},${longitude}`;
  const twoGisUrl = place?.twoGisUrl ?? `https://2gis.kg/search/${latitude},${longitude}`;
  const firstPhoto = entries.find((entry) => entry.photos[0])?.photos[0];
  const hasInfo = entries.length > 0;

  return (
    <Popup position={[latitude, longitude]} className="building-popup">
      <div className="building-popup-content">
        <h2>{name}</h2>
        {firstPhoto ? (
          <img className="building-popup-photo" src={firstPhoto} alt="" />
        ) : (
          <div className="building-popup-photo empty" aria-label="写真なし" />
        )}
        <div className="building-popup-actions">
          <a href={googleMapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
          <a href={twoGisUrl} target="_blank" rel="noreferrer">2GIS</a>
          {hasInfo ? (
            <button className="view-info-button" type="button" onClick={onViewInfo}>情報を見る</button>
          ) : (
            <button className="write-info-button" type="button" onClick={onWriteInfo} disabled={entriesLoading || !place}>
              {entriesLoading ? '確認中' : '情報を書く'}
            </button>
          )}
        </div>
      </div>
    </Popup>
  );
}
