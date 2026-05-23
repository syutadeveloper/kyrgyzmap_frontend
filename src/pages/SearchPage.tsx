import { Link } from 'react-router-dom';
import SearchPanel from '../components/SearchPanel';
import { useApp } from '../context/AppContext';

export default function SearchPage() {
  const { places, selectPlace } = useApp();

  return (
    <main className="search-page">
      <header className="page-header">
        <Link to="/">←</Link>
        <div>
          <p>検索</p>
          <h1>建物・施設を探す</h1>
        </div>
      </header>
      <SearchPanel />
      <div className="list-stack">
        {places.map((place) => (
          <button key={place.id} className="list-item" type="button" onClick={() => selectPlace(place)}>
            <strong>{place.name}</strong>
            <span>{place.address || `${place.osmType}/${place.osmId}`}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
