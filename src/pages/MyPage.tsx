import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { PlaceEntry } from '../types';

export default function MyPage() {
  const { user, places, loadEntries, logout, installPrompt, promptInstall, selectPlace } = useApp();
  const [privateEntries, setPrivateEntries] = useState<Array<{ entry: PlaceEntry; placeName: string }>>([]);

  useEffect(() => {
    let disposed = false;
    void Promise.all(
      places.map(async (place) => ({
        place,
        entries: await loadEntries(place.id),
      }))
    ).then((items) => {
      if (disposed) return;
      setPrivateEntries(
        items.flatMap(({ place, entries }) =>
          entries
            .filter((entry) => entry.visibility === 'private')
            .map((entry) => ({ entry, placeName: place.name }))
        )
      );
    });
    return () => {
      disposed = true;
    };
  }, [loadEntries, places]);

  return (
    <main className="mypage">
      <header className="page-header">
        <Link to="/">←</Link>
        <div>
          <p>マイページ</p>
          <h1>{user ? user.name : 'ゲスト閲覧中'}</h1>
        </div>
        {user ? <button type="button" onClick={() => void logout()}>ログアウト</button> : <Link className="button-link" to="/login">ログイン</Link>}
      </header>

      <section className="profile-band">
        <p>{user ? user.email : '未ログインでも建物閲覧と口コミ投稿ができます。投稿者名はフォームで入力します。'}</p>
        {installPrompt && <button type="button" onClick={() => void promptInstall()}>ホーム画面に追加</button>}
      </section>

      <section>
        <h2>自分用投稿</h2>
        <div className="list-stack">
          {privateEntries.map(({ entry, placeName }) => {
            const place = places.find((item) => item.id === entry.placeId);
            return (
              <button key={entry.id} className="list-item private" type="button" onClick={() => place && selectPlace(place)}>
                <strong>{entry.title}</strong>
                <span>{placeName}</span>
              </button>
            );
          })}
          {privateEntries.length === 0 && <p className="empty-text">自分用投稿はまだありません。</p>}
        </div>
      </section>
    </main>
  );
}
