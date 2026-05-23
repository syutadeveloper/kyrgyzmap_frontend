import type { Place } from '../types';

type Props = {
  candidates: Place[];
  onSelect: (place: Place) => void;
  onCreateAnyway: () => void;
  onCancel: () => void;
};

const labelForSource = (place: Place) => place.sourceType === 'osm' ? 'OSM Place' : 'User Place';
const coordinateLabel = (place: Place) => place.latitude.toFixed(6) + ', ' + place.longitude.toFixed(6);

export default function DuplicatePlaceModal({ candidates, onSelect, onCreateAnyway, onCancel }: Props) {
  if (candidates.length === 0) return null;

  return (
    <div className='modal-backdrop' role='presentation' onClick={onCancel}>
      <article className='duplicate-modal' role='dialog' aria-modal='true' aria-labelledby='duplicate-title' onClick={(event) => event.stopPropagation()}>
        <div className='sheet-handle' aria-hidden='true' />
        <header className='modal-header'>
          <div>
            <p className='visibility'>この場所ですか？</p>
            <h2 id='duplicate-title'>近くに似た場所があります</h2>
          </div>
          <button className='icon-button' type='button' onClick={onCancel} aria-label='閉じる'>x</button>
        </header>

        <div className='duplicate-list'>
          {candidates.map((place) => (
            <button key={place.id} type='button' onClick={() => onSelect(place)}>
              <strong>{place.name}</strong>
              <span>{labelForSource(place)} / {place.placeType}</span>
              <small>{place.address || coordinateLabel(place)}</small>
            </button>
          ))}
        </div>

        <div className='modal-actions'>
          <button type='button' className='secondary-button' onClick={onCancel}>戻る</button>
          <button type='button' onClick={onCreateAnyway}>別の場所として追加</button>
        </div>
      </article>
    </div>
  );
}
