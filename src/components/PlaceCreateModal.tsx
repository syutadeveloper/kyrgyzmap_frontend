import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Place, PlaceType, UserPlaceDraft } from '../types';
import DuplicatePlaceModal from './DuplicatePlaceModal';

type Props = {
  position: [number, number] | null;
  onClose: () => void;
};

const placeTypes: Array<{ value: PlaceType; label: string }> = [
  { value: 'shop', label: '売店' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'meeting_point', label: '集合場所' },
  { value: 'danger', label: '危険地点' },
  { value: 'market', label: '市場' },
  { value: 'temporary', label: '一時店舗' },
  { value: 'transport', label: '交通' },
  { value: 'hospital', label: '病院' },
  { value: 'school', label: '学校' },
  { value: 'teacher', label: '先生' },
  { value: 'hidden', label: '入口が分かりにくい' },
  { value: 'other', label: 'その他' },
];

export default function PlaceCreateModal({ position, onClose }: Props) {
  const { createUserPlace, findDuplicatePlaces, selectPlace } = useApp();
  const [name, setName] = useState('');
  const [placeType, setPlaceType] = useState<PlaceType>('meeting_point');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [duplicateCandidates, setDuplicateCandidates] = useState<Place[]>([]);
  const [pendingDraft, setPendingDraft] = useState<UserPlaceDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!position) return null;

  const [latitude, longitude] = position;

  const buildDraft = (): UserPlaceDraft => ({
    name,
    placeType,
    latitude,
    longitude,
    categoryIds: [placeType],
    entry: description.trim() ? {
      title: name,
      description,
      visibility,
      photos: photoUrl.trim() ? [photoUrl.trim()] : [],
    } : undefined,
  });

  const createPlace = async (draft: UserPlaceDraft) => {
    setIsSaving(true);
    setError('');
    try {
      const place = await createUserPlace(draft);
      selectPlace(place);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '場所を作成できませんでした。');
    } finally {
      setIsSaving(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    const draft = buildDraft();
    setPendingDraft(draft);
    setIsSaving(true);
    setError('');
    try {
      const duplicates = await findDuplicatePlaces(latitude, longitude, name);
      if (duplicates.length > 0) {
        setDuplicateCandidates(duplicates);
        return;
      }
      await createPlace(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '重複確認に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className='modal-backdrop' role='presentation' onClick={onClose}>
        <article className='place-create-modal' role='dialog' aria-modal='true' aria-labelledby='place-create-title' onClick={(event) => event.stopPropagation()}>
          <div className='sheet-handle' aria-hidden='true' />
          <header className='modal-header'>
            <div>
              <p className='visibility'>User Place</p>
              <h2 id='place-create-title'>新しい場所を追加</h2>
            </div>
            <button className='icon-button' type='button' onClick={onClose} aria-label='閉じる'>x</button>
          </header>

          <form className='place-create-form' onSubmit={submit}>
            <label>
              名前
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder='例: 市場内のSIM販売所' required />
            </label>
            <label>
              種類
              <select value={placeType} onChange={(event) => setPlaceType(event.target.value as PlaceType)}>
                {placeTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label>
              概要
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder='営業時間、行き方、注意点など' />
            </label>
            <label>
              写真URL
              <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder='https://...' />
            </label>
            <div className='form-row'>
              <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}>
                <option value='public'>公開</option>
                <option value='private'>自分用</option>
              </select>
              <button type='submit' disabled={isSaving}>{isSaving ? '確認中...' : '追加'}</button>
            </div>
            <p className='form-hint'>{latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
            {error && <p className='form-error'>{error}</p>}
          </form>
        </article>
      </div>

      <DuplicatePlaceModal
        candidates={duplicateCandidates}
        onSelect={(place) => {
          selectPlace(place);
          onClose();
        }}
        onCreateAnyway={() => {
          setDuplicateCandidates([]);
          if (pendingDraft) void createPlace(pendingDraft);
        }}
        onCancel={() => setDuplicateCandidates([])}
      />
    </>
  );
}
