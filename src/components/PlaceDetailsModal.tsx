import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { PlaceEntry, Review } from '../types';
import PlaceEntryList from './PlaceEntryList';
import ReviewList from './ReviewList';

export default function PlaceDetailsModal() {
  const { selectedPlace, selectPlace, categories, loadEntries, loadReviews, createReview, user } = useApp();
  const [entries, setEntries] = useState<PlaceEntry[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    if (!selectedPlace) return;
    void loadEntries(selectedPlace.id).then(setEntries);
    void loadReviews(selectedPlace.id).then(setReviews);
  }, [loadEntries, loadReviews, selectedPlace]);

  if (!selectedPlace) return null;

  const placeCategories = categories.filter((category) => selectedPlace.categoryIds.includes(category.id));
  const publicEntry = entries.find((entry) => entry.visibility === 'public');

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) return;
    const review = await createReview(selectedPlace.id, { content, rating, visibility, guestName });
    setReviews((current) => [review, ...current]);
    setContent('');
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => selectPlace(null)}>
      <article className="place-modal" role="dialog" aria-modal="true" aria-labelledby="place-title" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <div>
            <p className={selectedPlace.sourceType === 'user' ? 'visibility user-badge' : 'visibility'}>{selectedPlace.sourceType === 'user' ? 'User Place' : 'OSM Place'}</p>
            <h2 id="place-title">{selectedPlace.name}</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => selectPlace(null)} aria-label="閉じる">×</button>
        </header>

        <p className="place-summary">{publicEntry?.description ?? (selectedPlace.address || 'OSM由来の建物です。投稿情報を追加できます。')}</p>

        <div className="chips compact">
          {placeCategories.map((category) => <span key={category.id} className="chip readonly"><span style={{ background: category.color }}>{category.icon}</span>{category.name}</span>)}
        </div>

        <dl className="meta-list">
          <div><dt>OSM ID</dt><dd>{selectedPlace.osmType}/{selectedPlace.osmId}</dd></div>
          <div><dt>住所</dt><dd>{selectedPlace.address || '未設定'}</dd></div>
          <div><dt>座標</dt><dd>{selectedPlace.latitude.toFixed(6)}, {selectedPlace.longitude.toFixed(6)}</dd></div>
        </dl>

        <div className="link-row">
          <a href={selectedPlace.googleMapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
          <a href={selectedPlace.twoGisUrl} target="_blank" rel="noreferrer">2GIS</a>
        </div>

        <PlaceEntryList entries={entries} />

        <section className="place-section">
          <h3>口コミを書く</h3>
          <form className="review-form" onSubmit={submitReview}>
            {!user && <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="投稿者名" />}
            <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="口コミを入力" />
            <div className="form-row">
              <select value={rating} onChange={(event) => setRating(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} ★</option>)}
              </select>
              <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}>
                <option value="public">公開</option>
                <option value="private">自分用</option>
              </select>
              <button type="submit">投稿</button>
            </div>
          </form>
        </section>

        <ReviewList reviews={reviews} />
      </article>
    </div>
  );
}
