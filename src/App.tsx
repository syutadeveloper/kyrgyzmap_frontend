import { Link, Route, Routes } from 'react-router-dom';
import FloatingCategoryMenu from './components/FloatingCategoryMenu';
import MapView from './components/MapView';
import PlaceDetailsModal from './components/PlaceDetailsModal';
import SearchPanel from './components/SearchPanel';
import { useApp } from './context/AppContext';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import MyPage from './pages/MyPage';
import SearchPage from './pages/SearchPage';
import SpotFormPage from './pages/SpotFormPage';
import './App.css';

function MapPage() {
  const { user, selectedPlace } = useApp();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p>JOCV Kyrgyzstan</p>
          <h1>キルギスマップ</h1>
        </div>
        <nav>
          <Link to="/search">検索</Link>
          <Link to="/mypage">{user ? 'マイページ' : 'ログイン'}</Link>
        </nav>
      </header>
      <SearchPanel compactible />
      <MapView />
      <FloatingCategoryMenu />
      {selectedPlace && <PlaceDetailsModal />}
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/places/:id/entries/new" element={<SpotFormPage />} />
      <Route path="/entries/:id/edit" element={<SpotFormPage />} />
      <Route path="/search" element={<><SearchPage /><PlaceDetailsModal /></>} />
      <Route path="/mypage" element={<MyPage />} />
    </Routes>
  );
}
