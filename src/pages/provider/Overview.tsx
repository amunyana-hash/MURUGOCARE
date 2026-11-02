import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, CalendarCheck, Star, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Badge, EmptyState, SectionHeader, StatCard, StatusBadge } from '../../components/ui';
import type { Booking, Provider, Quotation, Review } from '../../lib/types';
import { formatDate, relativeTime } from '../../lib/format';

export default function ProviderOverview() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];
  const providerId = provider?.id ?? '__none__';

  const { rows: jobs } = useRows<Booking>('bookings', { where: { provider_id: providerId } });
  const { rows: quotes } = useRows<Quotation>('quotations', { where: { provider_id: providerId } });
  const { rows: reviews } = useRows<Review>('reviews', { where: { provider_id: providerId } });
  const { rows: open } = useRows<Booking>('bookings', { where: { status: 'pending' } });

  const activeJobs = jobs.filter((j) => ['confirmed', 'in_progress'].includes(j.status));
  const paidJobs = jobs.filter((j) => j.payment_status === 'paid');
  const earned = paidJobs.reduce((s, j) => s + j.amount, 0);
  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const nav = providerNav(t as never);
  const target = profile?.id ?? '__none__';

  return (
    <DashboardShell
      title={t('dash.overview', 'Overview')}
      subtitle={provider ? `${provider.business_name} · ${provider.sector}, ${provider.district}` : undefined}
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      {provider && provider.verification_status !== 'verified' && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-forest-900">
              {provider.verification_status === 'pending'
                ? 'Your verification is under review'
                : 'Your account needs attention before you can accept jobs'}
            </p>
            <p className="mt-0.5 text-[12px] text-forest-600">
              Uploaded ID and certificates are checked by the Bugesera coordinator team within 48 hours.
            </p>
          </div>
          <Link to="/provider/verification" className="btn-primary btn-sm">
            {t('provider.verification', 'Verification')}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('provider.activeJobs', 'Active jobs')} value={activeJobs.length} icon="Briefcase" hint={`${jobs.length} jobs total`} />
        <StatCard label={t('provider.pendingQuotes', 'Pending quotes')} value={pendingQuotes.length} icon="FileText" tone="gold" hint="Awaiting customer decision" />
        <StatCard label={t('provider.totalEarned', 'Paid earnings')} value={money(earned)} icon="Wallet" tone="blue" hint={`${paidJobs.length} paid jobs`} />
        <StatCard
          label={t('provider.rating', 'Rating')}
          value={avgRating ? avgRating.toFixed(1) : '—'}
          icon="Star"
          tone="red"
          hint={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card card-pad">
            <SectionHeader
              title={t('provider.activeJobs', 'Active jobs')}
              action={
                <Link to="/provider/jobs" className="text-[12px] font-semibold text-forest-700 hover:underline">
                  All jobs <ArrowRight className="inline h-3 w-3" />
                </Link>
              }
            />
            {activeJobs.length === 0 ? (
              <EmptyState
                icon="Briefcase"
                title="No active job"
                body="Quote on a marketplace request to win your next job."
                action={
                  <Link to="/provider/marketplace" className="btn-primary btn-sm">
                    Browse marketplace
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {activeJobs.slice(0, 5).map((j) => (
                  <li key={j.id}>
                    <Link
                      to={`/provider/jobs/${j.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-forest-100 px-3.5 py-3 hover:border-forest-300"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-forest-900">
                          {j.category_name} · {j.ref}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-forest-500">
                          <CalendarCheck className="h-3 w-3" /> {formatDate(j.scheduled_date, lang)} · {j.time_slot} ·{' '}
                          {j.sector}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-forest-800">{money(j.amount)}</span>
                        <StatusBadge status={j.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card card-pad">
            <SectionHeader
              title={t('provider.reviews', 'Recent reviews')}
              action={
                <Link to="/provider/reviews" className="text-[12px] font-semibold text-forest-700 hover:underline">
                  All reviews <ArrowRight className="inline h-3 w-3" />
                </Link>
              }
            />
            {reviews.length === 0 ? (
              <EmptyState icon="Star" title="No review yet" body="Reviews appear after a customer confirms a completed job." />
            ) : (
              <ul className="space-y-3">
                {reviews.slice(0, 4).map((r) => (
                  <li key={r.id} className="rounded-xl border border-forest-100 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-forest-900">{r.customer_name}</p>
                      <span className="flex items-center gap-0.5 text-gold-500">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-forest-600">{r.comment}</p>
                    <p className="mt-1 text-[10.5px] text-forest-400">{relativeTime(r.created_at, lang)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Performance
            </p>
            <div className="mt-2.5 space-y-2">
              {[
                { label: 'Jobs completed', value: String(provider?.jobs_completed ?? jobs.filter((j) => j.status === 'completed').length) },
                { label: 'Reviews received', value: String(provider?.reviews_count ?? reviews.length) },
                { label: 'Years of experience', value: String(provider?.years_experience ?? 0) },
                { label: 'Accepting new work', value: provider?.available ? 'Yes' : 'Paused' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-forest-600">{row.label}</span>
                  <span className="font-semibold text-forest-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> {t('provider.jobsAvailable', 'Jobs available')}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest-600">
              {open.length} open request{open.length === 1 ? '' : 's'} in Bugesera District waiting for a quote.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(provider?.category_slugs ?? []).map((s) => (
                <Badge key={s} tone="green">
                  {s.replace(/-/g, ' ')}
                </Badge>
              ))}
            </div>
            <Link to="/provider/marketplace" className="btn-primary btn-sm mt-3 w-full">
              Browse requests
            </Link>
          </div>

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <p className="kicker text-gold-300">Provider code of conduct</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-forest-100/85">
              <li>Arrive within the agreed time slot.</li>
              <li>Photograph before and after every visit.</li>
              <li>Never accept cash outside the platform.</li>
              <li>Report incidents within 24 hours.</li>
            </ul>
            <Link to="/provider/profile" className="btn-gold btn-sm mt-3 w-full">
              Update my profile
            </Link>
          </div>

          <div className="card card-pad">
            <p className="kicker">Account</p>
            <p className="mt-1.5 text-[12.5px] text-forest-600">
              Signed in as <span className="font-semibold text-forest-900">{profile?.full_name}</span> ({target})
            </p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
