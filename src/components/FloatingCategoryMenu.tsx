import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const priority = ['transport', 'teacher', 'other'];

export default function FloatingCategoryMenu() {
  const [open, setOpen] = useState(false);
  const { categories, filters, setFilters } = useApp();
  const navigate = useNavigate();
  const items = categories.filter((category) => priority.includes(category.id));

  return (
    <div className={open ? 'fab-menu open' : 'fab-menu'}>
      <div className="fab-options">
        {items.map((category) => (
          <button
            key={category.id}
            className="fab-option"
            type="button"
            onClick={() => {
              setFilters({ ...filters, categoryIds: [category.id] });
              navigate('/search');
              setOpen(false);
            }}
          >
            <span style={{ background: category.color }}>{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>
      <button className="fab-main" type="button" aria-label="カテゴリーを開く" onClick={() => setOpen((value) => !value)}>
        {open ? '×' : '＋'}
      </button>
    </div>
  );
}
