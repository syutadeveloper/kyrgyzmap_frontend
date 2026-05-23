import { useState } from 'react';
import type { PlaceEntry } from '../types';

const formatDate = (value: string) => new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));

type Props = {
  entries: PlaceEntry[];
};

export default function PlaceEntryList({ entries }: Props) {
  const [editorEntry, setEditorEntry] = useState<PlaceEntry | null>(null);
  const publicEntries = entries.filter((entry) => entry.visibility === 'public');
  const privateEntries = entries.filter((entry) => entry.visibility === 'private');
  const ordered = [...publicEntries, ...privateEntries];

  return (
    <section className="place-section">
      <h3>投稿情報</h3>
      <div className="entry-list">
        {ordered.map((entry) => {
          const editorNames = entry.editors.slice(0, 2).map((editor) => editor.name).join('、');
          const extraEditors = Math.max(entry.editors.length - 2, 0);

          return (
            <article key={entry.id} className={entry.visibility === 'private' ? 'entry-card private' : 'entry-card'}>
              <div className="entry-card-head">
                <span className={entry.visibility === 'private' ? 'visibility private' : 'visibility'}>
                  {entry.visibility === 'private' ? '🔒 自分用' : '公開'}
                </span>
                <small>{formatDate(entry.updatedAt)}</small>
              </div>
              <h4>{entry.title}</h4>
              {entry.photos[0] ? <img className="place-photo" src={entry.photos[0]} alt="" /> : null}
              <p>{entry.description}</p>
              {entry.visibility === 'public' && (
                <dl className="meta-list compact-meta">
                  <div><dt>初回編集者</dt><dd>{entry.firstEditor.name}</dd></div>
                  <div><dt>最終編集者</dt><dd>{entry.lastEditor.name}</dd></div>
                  <div>
                    <dt>編集人数</dt>
                    <dd>
                      {editorNames || '未編集'}
                      {extraEditors > 0 && <button className="text-button" type="button" onClick={() => setEditorEntry(entry)}>他{extraEditors}人</button>}
                    </dd>
                  </div>
                </dl>
              )}
            </article>
          );
        })}
        {ordered.length === 0 && <p className="empty-text">この建物の投稿情報はまだありません。</p>}
      </div>

      {editorEntry && (
        <div className="nested-modal">
          <div>
            <h3>編集者一覧</h3>
            {editorEntry.editors.map((editor) => <p key={editor.id}>{editor.name}</p>)}
            <button type="button" onClick={() => setEditorEntry(null)}>閉じる</button>
          </div>
        </div>
      )}
    </section>
  );
}
