import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Search, SlidersHorizontal, Star } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { useCategories, useRows } from '../lib/hooks';
import type { Provider } from '../lib/types';
import { Avatar, Badge, Checkbox, EmptyState, SelectField, Stars, TextInput } from '../components/ui';

export default function Providers() {
  const { t } = useI18n();
  const { money } = usePrefs();
  const { categories } = useCategories();
  const { rows: providers } = useRows<Provider>('providers', {
    where: { verification_status: 'verified' },
    order: { column: 'rating', ascending: false },
  });

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [minRating, setMinRating] = useState('0');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (availableOnly && !p.available) return false;
      if (category !== 'all' && !p.category_slugs.includes(category)) return false;
      if (Number(minRating) > 0 && p.rating < Number(minRating)) return false;
      if (!q) return true;
      return [p.full_name, p.business_name, p.bio, p.sector, ...p.skills].join(' ').toLowerCase().includes(q);
    });
  }, [providers, query, category, availableOnly, minRating]);

  return (
    <div>
      <div className="border-b border-forest-100 bg-white">
        <div className="container-x py-12">
          <p className="kicker">{t('nav.providers')}</p>
          <h1 className="mt-2 font-display text-3xl text-forest-900 sm:text-4xl">{t('home.section.providers.subtitle')}</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-forest-600">
            Every professional below has passed ID verification, reference checks and a trial job review. Ratings come
            only from completed bookings.
          </p>
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="card card-pad">
            <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-forest-700">
              <SlidersHorizontal className="h-4 w-4" /> {t('common.filter')}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="provider-search">{t('common.search')}</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                  <TextInput
                    id="provider-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Name, skill, sector"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="provider-category">{t('booking.category')}</label>
                <SelectField id="provider-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">{t('common.all')}</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name_en}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <label className="label" htmlFor="provider-rating">{t('common.rating')}</label>
                <SelectField id="provider-rating" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                  <option value="0">Any rating</option>
                  <option value="4.5">4.5 and above</option>
                  <option value="4.7">4.7 and above</option>
                  <option value="4.9">4.9 and above</option>
                </SelectField>
              </div>
              <Checkbox
                checked={availableOnly}
                onChange={setAvailableOnly}
                label={t('common.active')}
                description="Show only providers accepting new jobs this week."
              />
            </div>
          </div>

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-300">Are you a professional?</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest-100/80">
              Join the network, get verified and receive jobs in Bugesera. Free while you build your rating.
            </p>
            <Link to="/register?role=provider" className="btn-gold btn-sm mt-4 w-full">
              Apply as provider
            </Link>
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] text-forest-600">
              <span className="font-semibold text-forest-900">{filtered.length}</span> providers available
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="Users"
              title="No providers match these filters"
              body="Try clearing the category or rating filter, or submit a booking and our team will assign a professional."
              action={<Link to="/contact" className="btn-outline">{t('nav.contact')}</Link>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((p) => (
                <article key={p.id} className="card card-hover card-pad">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.full_name} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-[17px] text-forest-900">{p.business_name}</h3>
                          <p className="truncate text-[12px] text-forest-600">{p.full_name}</p>
                        </div>
                        {p.verification_status === 'verified' && (
                          <Badge tone="green">
                            <BadgeCheck className="h-3 w-3" /> {t('common.verified')}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-forest-500">
                        <MapPin className="h-3 w-3" /> {p.sector}, {p.district}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Stars rating={p.rating} size={12} showValue />
                        <span className="text-[11px] text-forest-500">({p.reviews_count})</span>
                        <span className="text-[11px] text-forest-400">·</span>
                        <span className="text-[11px] text-forest-500">{p.jobs_completed} jobs</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-forest-600">{p.bio}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.skills.slice(0, 4).map((s) => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-forest-50 pt-3.5">
                    <div className="text-[12px]">
                      <span className="font-semibold text-forest-900">{money(p.hourly_rate)}</span>
                      <span className="text-forest-500">/hr · {p.years_experience}y exp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          p.available ? 'bg-forest-50 text-forest-700' : 'bg-forest-100 text-forest-500'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${p.available ? 'bg-forest-500' : 'bg-forest-300'}`} />
                        {p.available ? t('common.active') : t('common.paused')}
                      </span>
                      <Link to={`/dashboard/book?provider=${p.id}`} className="btn-primary btn-sm">
                        {t('common.book')}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProvidersHeaderBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gold-700">
      <Star className="h-3.5 w-3.5" /> Top rated
    </span>
  );
}
