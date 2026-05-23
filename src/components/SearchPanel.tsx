import { useState } from 'react';
import { useApp } from '../context/AppContext';

type SearchPanelProps = {
  compactible?: boolean;
};

export default function SearchPanel({ compactible = false }: SearchPanelProps) {
  const { categories, filters, setFilters } = useApp();
  const [isCompact, setIsCompact] = useState(compactible);

  const toggleCategory = (id: string) => {
    const exists = filters.categoryIds.includes(id);
    setFilters({
      ...filters,
      categoryIds: exists ? filters.categoryIds.filter((categoryId) => categoryId !== id) : [...filters.categoryIds, id],
    });
  };

  const activeCategories = categories.filter((category) =>
    filters.categoryIds.includes(category.id)
  );
  const activeFilterCount =
    (filters.query.trim() ? 1 : 0) +
    (filters.keyword.trim() ? 1 : 0) +
    filters.categoryIds.length;

  if (compactible && isCompact) {
    return (
      <aside className="search-panel search-panel-compact" aria-label="検索">
        <button
          className="search-icon-button"
          type="button"
          onClick={() => setIsCompact(false)}
          aria-label="検索パネルを開く"
        >
          <span aria-hidden="true">⌕</span>
          {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
        </button>
        <div className="compact-category-icons" aria-label="選択中のカテゴリー">
          {activeCategories.length > 0 ? (
            activeCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="compact-category-icon active"
                style={{ background: category.color }}
                onClick={() => toggleCategory(category.id)}
                aria-label={`${category.name}を解除`}
                title={category.name}
              >
                {category.icon}
              </button>
            ))
          ) : (
            <span className="compact-filter-hint">検索</span>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="search-panel">
      {compactible && (
        <div className="search-panel-header">
          <strong>検索</strong>
          <button
            className="search-panel-minimize"
            type="button"
            onClick={() => setIsCompact(true)}
            aria-label="検索パネルを縮小"
          >
            −
          </button>
        </div>
      )}
      <div className="search-grid">
        <label>
          <span>名前検索</span>
          <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="例: カフェ、バス停" />
        </label>
        <label>
          <span>キーワード</span>
          <input value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} placeholder="住所・概要から検索" />
        </label>
      </div>
      <div className="chips" aria-label="カテゴリー検索">
        {categories.map((category) => (
          <button
            key={category.id}
            className={filters.categoryIds.includes(category.id) ? 'chip active' : 'chip'}
            type="button"
            onClick={() => toggleCategory(category.id)}
          >
            <span style={{ background: category.color }}>{category.icon}</span>{category.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
