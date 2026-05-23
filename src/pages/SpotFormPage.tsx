import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function SpotFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedPlace, createEntry, user } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [photoUrl, setPhotoUrl] = useState('');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');

  const placeId = id ?? selectedPlace?.id;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!placeId) {
      setError('先に地図から建物を選択してください。');
      return;
    }

    try {
      await createEntry(placeId, {
        title,
        description,
        visibility,
        photos: photoUrl ? [photoUrl] : [],
        guestName,
      });
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '投稿を保存できませんでした。');
    }
  };

  return (
    <main className="form-page">
      <form className="spot-form" onSubmit={submit}>
        <header className="page-header">
          <Link to="/">←</Link>
          <div>
            <p>建物投稿</p>
            <h1>建物に情報を追加</h1>
          </div>
          <button type="submit">保存</button>
        </header>

        {selectedPlace && <p className="form-hint">{selectedPlace.name} / {selectedPlace.osmType}:{selectedPlace.osmId}</p>}
        {error && <p className="form-error">{error}</p>}

        <label>
          <span>タイトル</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          <span>説明</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required />
        </label>
        {!user && (
          <label>
            <span>投稿者名</span>
            <input value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
          </label>
        )}
        <label>
          <span>写真URL</span>
          <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://..." />
        </label>

        <fieldset>
          <legend>公開状態</legend>
          <div className="segmented">
            <button className={visibility === 'public' ? 'active' : ''} type="button" onClick={() => setVisibility('public')}>公開</button>
            <button className={visibility === 'private' ? 'active' : ''} type="button" onClick={() => setVisibility('private')}>自分用</button>
          </div>
        </fieldset>
      </form>
    </main>
  );
}
