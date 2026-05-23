import type { Review } from '../types';

const formatDate = (value: string) => new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));

type Props = {
  reviews: Review[];
};

export default function ReviewList({ reviews }: Props) {
  const privateReviews = reviews.filter((review) => review.visibility === 'private').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const publicReviews = reviews.filter((review) => review.visibility === 'public').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ordered = [...privateReviews, ...publicReviews];

  return (
    <section className="place-section">
      <h3>口コミ</h3>
      <div className="review-list">
        {ordered.map((review) => (
          <article key={review.id} className={review.visibility === 'private' ? 'review-card private' : 'review-card'}>
            <div><strong>{'★'.repeat(review.rating)}</strong><span>{review.visibility === 'private' ? '🔒 自分用' : '公開'}</span></div>
            <p>{review.content}</p>
            <small>{review.author.name}・{formatDate(review.createdAt)}</small>
          </article>
        ))}
        {ordered.length === 0 && <p className="empty-text">口コミはまだありません。</p>}
      </div>
    </section>
  );
}
