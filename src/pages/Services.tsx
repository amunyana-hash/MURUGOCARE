import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, Search, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { useCategories, useRows } from '../lib/hooks';
import type { Provider, Review } from '../lib/types';
import { Badge, EmptyState, Icon } from '../components/ui';
import { Stars } from '../components/ui';

export function Services() {
  const { t, categoryName, categoryTagline } = useI18n();
  const { money } = usePrefs();
  const { categories } = useCategories();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      [c.name_en, c.name_fr, c.name_rw, c.tagline_en, c.tagline_fr].join(' ').toLowerCase().includes(q),
    );
  }, [categories, query]);

  return (
    <div>
      <div className="border-b border-forest-100 bg-forest-900 text-white">
        <div className="container-x py-12 sm:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">{t('nav.services')}</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
            {t('home.section.services.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-forest-100/80">
            {t('home.section.services.subtitle')}
          </p>
          <div className="mt-7 flex max-w-md items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-soft">
            <Search className="h-4 w-4 text-forest-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search')}
              aria-label={t('common.search')}
              className="w-full bg-transparent text-sm text-forest-900 placeholder:text-forest-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="container-x py-12">
        {filtered.length === 0 ? (
          <EmptyState icon="SearchX" title="No services matched your search" body="Try a different keyword such as cleaning, plumbing or care." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cat) => (
              <article key={cat.id} className="card card-pad flex flex-col">
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                    <Icon name={cat.icon} className="h-5.5 w-5.5" />
                  </span>
                  {cat.popular && <Badge tone="gold">Popular</Badge>}
                </div>
                <h2 className="mt-4 font-display text-lg text-forest-900">{categoryName(cat)}</h2>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-forest-600">{categoryTagline(cat)}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg bg-forest-50/70 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-forest-500">{t('common.from')}</dt>
                    <dd className="font-semibold text-forest-900">{money(cat.base_price)}</dd>
                  </div>
                  <div className="rounded-lg bg-forest-50/70 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-forest-500">{t('common.time')}</dt>
                    <dd className="font-semibold text-forest-900">{cat.duration}</dd>
                  </div>
                </dl>
                <Link to={`/services/${cat.slug}`} className="btn-outline btn-sm mt-4 w-full">
                  {t('common.bookService')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ServiceDetail() {
  const { slug } = useParams();
  const { t, categoryName, categoryTagline, categoryDescription } = useI18n();
  const { money } = usePrefs();
  const { categories, loading } = useCategories();
  const { rows: providers } = useRows<Provider>('providers', {
    where: { verification_status: 'verified' },
  });
  const { rows: reviews } = useRows<Review>('reviews');
  const category = categories.find((c) => c.slug === slug);

  const matching = providers.filter((p) => p.category_slugs.includes(slug ?? ''));
  const providerIds = new Set(matching.map((p) => p.id));
  const providerReviews = reviews.filter((r) => providerIds.has(r.provider_id));

  if (!category) {
    return (
      <div className="container-x py-20">
        {loading ? (
          <div className="skeleton h-64 w-full" />
        ) : (
          <EmptyState
            icon="SearchX"
            title="Service not found"
            body="This service category does not exist or has been renamed."
            action={<Link to="/services" className="btn-primary">{t('nav.services')}</Link>}
          />
        )}
      </div>
    );
  }

  const includes = [
    `Verified ${categoryName(category)} professionals in Bugesera`,
    'Written quotation before any work starts',
    'Photo report and completion checklist',
    'Payment by MTN MoMo, Airtel Money or cash on completion',
    `Estimated duration: ${category.duration}`,
  ];

  return (
    <div>
      <div className="border-b border-forest-100 bg-white">
        <div className="container-x py-8">
          <Link to="/services" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest-600 hover:text-forest-900">
            <ArrowLeft className="h-3.5 w-3.5" /> {t('nav.services')}
          </Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-700 text-gold-300">
                <Icon name={category.icon} className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-display text-3xl leading-tight text-forest-900">{categoryName(category)}</h1>
                <p className="mt-1.5 max-w-2xl text-[14px] text-forest-600">{categoryTagline(category)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="green">{matching.length} verified providers</Badge>
                  <Badge tone="gold">
                    <Clock className="h-3 w-3" /> {category.duration}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-forest-100 bg-cream p-5">
              <p className="text-[11px] uppercase tracking-wide text-forest-500">{t('common.from')}</p>
              <p className="font-display text-3xl text-forest-900">{money(category.base_price)}</p>
              <p className="mt-0.5 text-[12px] text-forest-600">per {category.unit}</p>
              <Link to={`/dashboard/book?service=${category.slug}`} className="btn-primary mt-4 w-full">
                {t('common.bookService')} <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2.5 text-center text-[11px] text-forest-500">
                No payment until you accept a quotation
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <h2 className="font-display text-xl text-forest-900">About this service</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-forest-700">{categoryDescription(category)}</p>

          <h2 className="mt-8 font-display text-xl text-forest-900">What is included</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-2.5 rounded-xl border border-forest-100 bg-white p-3.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-[13px] leading-relaxed text-forest-800">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 font-display text-xl text-forest-900">Providers for this service</h2>
          {matching.length === 0 ? (
            <p className="mt-2 text-[13px] text-forest-600">
              New providers are being verified for this category. Submit a request and the URUGOCARE team will assign a
              suitable professional.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {matching.slice(0, 4).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-forest-100 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-forest-900">{p.business_name}</p>
                    <p className="text-[12px] text-forest-600">
                      {p.full_name} · {p.sector} · {p.years_experience} yrs
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Stars rating={p.rating} size={11} showValue />
                      <span className="text-[11px] text-forest-500">{p.reviews_count} reviews</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-forest-900">{money(p.hourly_rate)}/hr</p>
                    <Badge tone={p.available ? 'green' : 'neutral'}>
                      {p.available ? t('common.active') : t('common.paused')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {providerReviews.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-xl text-forest-900">Recent reviews</h2>
              <div className="mt-3 space-y-3">
                {providerReviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="rounded-xl border border-forest-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-forest-900">{r.customer_name}</p>
                      <Stars rating={r.rating} size={12} />
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-forest-700">{r.comment}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <h3 className="font-display text-lg text-forest-900">Why book here</h3>
            <ul className="mt-3 space-y-3 text-[13px] text-forest-700">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                Every provider is ID-checked and reference-verified before their first job.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                Quotations are binding: the price you accept is the price you pay.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                Complaints are reviewed by the URUGOCARE team within one working day.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-300">Family desk</p>
            <p className="mt-1.5 font-display text-lg">Not in Rwanda?</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-forest-100/80">
              Register a property or relative and we arrange this service on your behalf, with photo proof.
            </p>
            <Link to="/register?role=diaspora" className="btn-gold btn-sm mt-4 w-full">
              {t('home.hero.ctaSecondary')}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
