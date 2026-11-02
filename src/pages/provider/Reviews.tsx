import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Avatar, Badge, EmptyState, PillTabs, ProgressBar, SectionHeader, StarPicker, Stars, TextArea, TextInput } from '../../components/ui';
import type { Booking, Provider, Review } from '../../lib/types';
import { insertRow, publishNotification } from '../../lib/db';
import { relativeTime, uid } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

type Tab = 'all' | '5' | '4' | 'low';

export default function ProviderReviews() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];

  const { rows: reviews } = useRows<Review>('reviews', {
    where: { provider_id: provider?.id ?? '__none__' },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: bookings } = useRows<Booking>('bookings', { where: { provider_id: provider?.id ?? '__none__' } });

  const [tab, setTab] = useState<Tab>('all');
  const [replyTo, setReplyTo] = useState('');
  const [reply, setReply] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [asCustomer, setAsCustomer] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const nav = providerNav(t as never);

  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const distribution = useMemo(
    () => [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: reviews.filter((r) => r.rating === n).length })),
    [reviews],
  );

  const visible = useMemo(() => {
    if (tab === '5') return reviews.filter((r) => r.rating === 5);
    if (tab === '4') return reviews.filter((r) => r.rating === 4);
    if (tab === 'low') return reviews.filter((r) => r.rating <= 3);
    return reviews;
  }, [reviews, tab]);

  const completedWithoutReview = useMemo(() => {
    const reviewed = new Set(reviews.map((r) => r.booking_id));
    return bookings.filter((b) => b.status === 'completed' && !reviewed.has(b.id));
  }, [bookings, reviews]);

  function submitReply() {
    if (reply.trim().length < 5) {
      toast('Reply too short', 'Write at least 5 characters.', 'error');
      return;
    }
    toast('Reply noted', 'Customer responses are delivered by the coordinator team.');
    setReplyTo('');
    setReply('');
  }

  async function submitReview() {
    const next: Record<string, string> = {};
    if (!rating) next.rating = 'Choose a star rating.';
    if (comment.trim().length < 15) next.comment = 'Add at least 15 characters of feedback.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const booking = completedWithoutReview.find((b) => b.id === asCustomer) ?? completedWithoutReview[0];
    if (!booking || !provider) {
      toast('No completed job', 'Only completed jobs can be reviewed.', 'error');
      return;
    }

    setBusy(true);
    try {
      await insertRow<Review>('reviews', {
        id: uid(),
        booking_id: booking.id,
        provider_id: provider.id,
        provider_name: provider.full_name,
        customer_id: profile?.id ?? booking.customer_id,
        customer_name: profile?.full_name ?? booking.customer_name,
        rating,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      });
      await publishNotification({
        user_id: provider.user_id ?? profile?.id ?? provider.id,
        audience: 'provider',
        title: 'New review received',
        body: `${rating}-star review recorded for ${booking.ref}.`,
        kind: 'system',
        link: '/provider/reviews',
      });
      toast('Review submitted', `${rating} stars for ${booking.ref}`);
      setRating(0);
      setComment('');
      setAsCustomer('');
    } catch (err) {
      toast('Could not submit', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('common.reviews', 'Reviews')}
      subtitle="What customers say after your jobs — and the ratings that win new ones."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section className="card card-pad">
          <p className="kicker">Overall rating</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-4xl text-forest-900">{average ? average.toFixed(1) : '—'}</span>
            <div className="pb-1">
              <Stars rating={average} size={15} />
              <p className="mt-0.5 text-[11.5px] text-forest-500">{reviews.length} review(s)</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-2">
                <span className="flex w-7 items-center gap-0.5 text-[11.5px] font-semibold text-forest-700">
                  {d.stars} <Star className="h-2.5 w-2.5 fill-gold-400 text-gold-400" />
                </span>
                <div className="flex-1">
                  <ProgressBar value={d.count} max={reviews.length || 1} tone="gold" />
                </div>
                <span className="w-5 text-right text-[11px] text-forest-500">{d.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-forest-50/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-forest-600">
            Providers above 4.5 stars appear first in customer search and receive priority marketplace alerts.
          </div>
        </section>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PillTabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { key: 'all', label: t('common.all', 'All'), count: reviews.length },
                { key: '5', label: '5 stars', count: distribution[0].count },
                { key: '4', label: '4 stars', count: distribution[1].count },
                { key: 'low', label: '3 and below', count: reviews.filter((r) => r.rating <= 3).length },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="Star"
                title="No reviews in this view"
                body="Complete jobs to collect reviews from customers and diaspora families."
                action={
                  <Link to="/provider/jobs" className="btn-outline btn-sm">
                    View my jobs
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visible.map((r) => (
                <article key={r.id} className="card card-pad">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.customer_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-forest-900">{r.customer_name}</p>
                        <Stars rating={r.rating} size={11} />
                        <span className="text-[11px] text-forest-400">{relativeTime(r.created_at, lang)}</span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-forest-700">{r.comment}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{r.booking_id.slice(-6).toUpperCase()}</Badge>
                        <button
                          type="button"
                          className="text-[11.5px] font-semibold text-forest-700 underline decoration-forest-300 underline-offset-2 hover:text-forest-900"
                          onClick={() => setReplyTo(replyTo === r.id ? '' : r.id)}
                        >
                          {replyTo === r.id ? 'Close' : 'Reply'}
                        </button>
                      </div>
                      {replyTo === r.id && (
                        <div className="mt-2 rounded-xl bg-forest-50/70 p-3">
                          <TextArea
                            rows={3}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Thank the customer and explain any follow-up."
                            aria-label="Reply to review"
                          />
                          <button type="button" className="btn-primary btn-sm mt-2" onClick={submitReply}>
                            Send reply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {completedWithoutReview.length > 0 && (
        <section className="card card-pad mt-6 max-w-2xl">
          <SectionHeader
            title="Record a customer review"
            subtitle="Coordinator desk: log the feedback a customer gave by phone after a completed job."
          />
          <div className="space-y-3">
            <div>
              <span className="label">Completed job</span>
              <TextInput
                list="completed-jobs"
                value={asCustomer}
                onChange={(e) => setAsCustomer(e.target.value)}
                placeholder="Select or type a job reference"
              />
              <datalist id="completed-jobs">
                {completedWithoutReview.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ref} — {b.customer_name} ({b.category_name})
                  </option>
                ))}
              </datalist>
            </div>
            <StarPicker value={rating} onChange={setRating} label="Rating" />
            {errors.rating && <p className="text-[11.5px] font-medium text-red-600">{errors.rating}</p>}
            <div>
              <span className="label">Comment</span>
              <TextArea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                invalid={Boolean(errors.comment)}
                placeholder="Punctual, clean work and clear communication."
              />
              {errors.comment && <p className="mt-1 text-[11.5px] font-medium text-red-600">{errors.comment}</p>}
            </div>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void submitReview()}>
              Save review
            </button>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
