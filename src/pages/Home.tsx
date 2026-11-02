import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  Check,
  Globe2,
  HeartHandshake,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { useCategories } from '../lib/hooks';
import { useRows } from '../lib/hooks';
import type { Plan, Provider, Review } from '../lib/types';
import { Avatar, Badge, Icon, Stars } from '../components/ui';
import { DemoBanner } from '../components/ui';

const stats = [
  { key: 'home.stats.families', value: '1,240+' },
  { key: 'home.stats.jobs', value: '6,800+' },
  { key: 'home.stats.providers', value: '180+' },
  { key: 'home.stats.rating', value: '4.8/5' },
];

const howSteps = [
  { icon: 'Search', title: 'home.section.how.step1.title', body: 'home.section.how.step1.body' },
  { icon: 'CalendarPlus', title: 'home.section.how.step2.title', body: 'home.section.how.step2.body' },
  { icon: 'BadgeCheck', title: 'home.section.how.step3.title', body: 'home.section.how.step3.body' },
  { icon: 'Star', title: 'home.section.how.step4.title', body: 'home.section.how.step4.body' },
];

const individualPlans = ['essential', 'family-plus', 'diaspora-elite'];

export default function Home() {
  const { t, categoryName, categoryTagline } = useI18n();
  const { money } = usePrefs();
  const { categories } = useCategories();
  const { rows: providers } = useRows<Provider>('providers', { limit: 3 });
  const { rows: plans } = useRows<Plan>('plans', {
    where: { interval: 'month' },
    order: { column: 'price_rwf', ascending: true },
  });
  const { rows: reviews } = useRows<Review>('reviews', { limit: 3 });

  const featured = plans.filter((p) => individualPlans.includes(p.slug)).slice(0, 3);

  return (
    <div>
      <DemoBanner />

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-forest-900 text-white">
        <div className="hero-grain absolute inset-0 opacity-90" aria-hidden="true" />
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-400/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="container-x relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
              <Sparkles className="h-3.5 w-3.5" />
              {t('home.hero.badge')}
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {t('home.hero.title')}{' '}
              <span className="relative whitespace-nowrap text-gold-300">
                {t('home.hero.titleAccent')}
                <svg
                  className="absolute -bottom-1.5 left-0 h-2 w-full text-gold-400/50"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M0 6 Q 25 0 50 5 T 100 3" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-forest-100/85 sm:text-base">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/dashboard/book" className="btn-gold">
                {t('home.hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register?role=diaspora"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Globe2 className="h-4 w-4" />
                {t('home.hero.ctaSecondary')}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-forest-100/70">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-gold-300" /> {t('common.verified')} providers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-gold-300" /> MoMo & Airtel ready
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-gold-300" /> EN / FR / RW
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-sm sm:p-5">
              <div className="rounded-2xl bg-cream p-5 text-forest-900 shadow-lift">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-600">
                    Live family desk
                  </p>
                  <Badge tone="green">Rwanda</Badge>
                </div>
                <p className="mt-2 font-display text-lg leading-snug">Mukamana Residence · Nyamata</p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: 'SprayCan', label: 'Deep cleaning completed', meta: 'Today · 09:40', staff: 'Aline U.' },
                    { icon: 'Wrench', label: 'Plumbing repair scheduled', meta: 'Tomorrow · 14:00', staff: 'Patrick N.' },
                    { icon: 'Camera', label: '8 photos uploaded to your report', meta: '2 hours ago', staff: 'Family desk' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                        <Icon name={row.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{row.label}</p>
                        <p className="text-[11px] text-forest-500">{row.meta}</p>
                      </div>
                      <span className="hidden text-[11px] font-medium text-forest-600 sm:block">{row.staff}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-forest-800 px-4 py-3 text-white">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gold-300">Monthly care budget</p>
                    <p className="font-display text-lg">{money(185000)}</p>
                  </div>
                  <div className="text-right text-[11px] text-forest-100/80">
                    <p>3 relatives</p>
                    <p>2 properties</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-gold-400/30 bg-forest-800 px-4 py-3 shadow-lift sm:block">
              <p className="text-[10px] uppercase tracking-wide text-gold-300">Verified today</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-white">
                <BadgeCheck className="h-4 w-4 text-gold-300" /> 4 providers
              </p>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-forest-950/60">
          <div className="container-x grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.key}>
                <p className="font-display text-2xl text-gold-300 sm:text-3xl">{s.value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-forest-200/70">{t(s.key)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="container-x py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="kicker">{t('home.section.services.eyebrow')}</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-forest-900 sm:text-4xl">
              {t('home.section.services.title')}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-forest-600">{t('home.section.services.subtitle')}</p>
          </div>
          <Link to="/services" className="btn-outline btn-sm">
            {t('common.viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/services/${cat.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-forest-100 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-lift"
            >
              {cat.popular && (
                <span className="absolute right-4 top-4 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-700">
                  Popular
                </span>
              )}
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-700 transition group-hover:bg-forest-700 group-hover:text-gold-300">
                <Icon name={cat.icon} className="h-5.5 w-5.5" />
              </span>
              <h3 className="mt-4 font-display text-lg text-forest-900">{categoryName(cat)}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-forest-600">{categoryTagline(cat)}</p>
              <div className="mt-5 flex items-center justify-between border-t border-forest-50 pt-3.5">
                <span className="text-[13px] font-semibold text-forest-900">
                  {money(cat.base_price)}
                  <span className="font-normal text-forest-500"> / {cat.unit}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gold-600 opacity-0 transition group-hover:opacity-100">
                  Book <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- how */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker">{t('home.section.how.eyebrow')}</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-forest-900 sm:text-4xl">
              {t('home.section.how.title')}
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {howSteps.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-forest-100 bg-cream/60 p-6">
                <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-forest-800 text-[11px] font-bold text-gold-300">
                  0{i + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm">
                  <Icon name={step.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-[17px] text-forest-900">{t(step.title)}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-forest-600">{t(step.body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- diaspora */}
      <section className="relative overflow-hidden bg-forest-800 py-16 text-white sm:py-20">
        <div className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
              {t('home.section.diaspora.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              {t('home.section.diaspora.title')}
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-forest-100/85">
              {t('home.section.diaspora.body')}
            </p>
            <ul className="mt-7 space-y-3">
              {['home.section.diaspora.point1', 'home.section.diaspora.point2', 'home.section.diaspora.point3', 'home.section.diaspora.point4'].map(
                (key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400/20 text-gold-300">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-forest-100/90">{t(key)}</span>
                  </li>
                ),
              )}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?role=diaspora" className="btn-gold">
                {t('home.section.diaspora.cta')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Wallet className="h-4 w-4" /> View care packages
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: 'Building2', title: 'Properties', value: '2 registered', meta: 'Nyamata & Ruhuha', tone: 'gold' },
              { icon: 'Users', title: 'Relatives', value: '3 cared for', meta: '2 elders, 1 student', tone: 'white' },
              { icon: 'FileImage', title: 'Reports', value: '12 this month', meta: 'Photos + notes', tone: 'white' },
              { icon: 'CalendarCheck', title: 'Services', value: '9 visits', meta: 'All completed', tone: 'gold' },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border p-5 ${
                  card.tone === 'gold'
                    ? 'border-gold-400/30 bg-gold-400/10'
                    : 'border-white/15 bg-white/[0.06]'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-300">
                  <Icon name={card.icon} className="h-4.5 w-4.5" />
                </span>
                <p className="mt-3 text-[11px] uppercase tracking-wide text-forest-200/70">{card.title}</p>
                <p className="mt-0.5 font-display text-xl">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-forest-200/60">{card.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- providers */}
      <section className="container-x py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="kicker">{t('home.section.providers.title')}</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-forest-900 sm:text-4xl">
              {t('home.section.providers.subtitle')}
            </h2>
          </div>
          <Link to="/providers" className="btn-outline btn-sm">
            {t('common.viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <article key={p.id} className="card card-pad">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} size={46} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-[17px] text-forest-900">{p.business_name}</h3>
                  <p className="truncate text-[12px] text-forest-600">{p.full_name} · {p.sector}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars rating={p.rating} size={12} showValue />
                    <span className="text-[11px] text-forest-500">({p.reviews_count})</span>
                  </div>
                </div>
                {p.verification_status === 'verified' && (
                  <Badge tone="green">
                    <BadgeCheck className="h-3 w-3" /> {t('common.verified')}
                  </Badge>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-forest-600">{p.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.skills.slice(0, 3).map((s) => (
                  <span key={s} className="chip">{s}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-forest-50 pt-3.5 text-[12px]">
                <span className="text-forest-600">{p.jobs_completed} jobs completed</span>
                <span className="font-semibold text-forest-900">{money(p.hourly_rate)}/hr</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section className="border-y border-forest-100 bg-white py-16 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker">{t('home.section.pricing.eyebrow')}</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-forest-900 sm:text-4xl">
              {t('home.section.pricing.title')}
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {featured.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.popular
                    ? 'border-forest-800 bg-forest-900 text-white shadow-lift'
                    : 'border-forest-100 bg-cream/50 text-forest-900'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-7 rounded-full bg-gold-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest-900">
                    Best value
                  </span>
                )}
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${plan.popular ? 'text-gold-300' : 'text-gold-600'}`}>
                  {plan.tagline}
                </p>
                <h3 className="mt-1.5 font-display text-2xl">{plan.name}</h3>
                <p className="mt-4 font-display text-3xl">
                  {money(plan.price_rwf)}
                  <span className={`text-sm font-normal ${plan.popular ? 'text-forest-200' : 'text-forest-500'}`}>
                    {' '}/ {plan.interval}
                  </span>
                </p>
                <p className={`mt-1 text-[12px] ${plan.popular ? 'text-forest-200/80' : 'text-forest-600'}`}>
                  {t('pricing.bestFor')}: {plan.best_for}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.popular ? 'text-gold-300' : 'text-forest-600'}`}
                        strokeWidth={3}
                      />
                      <span className={plan.popular ? 'text-forest-100/90' : 'text-forest-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pricing"
                  className={`mt-6 ${plan.popular ? 'btn-gold' : 'btn-outline'} w-full`}
                >
                  {t('pricing.choose')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- reviews */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="kicker">{t('common.reviews')}</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-forest-900">
              Trusted by families in Bugesera and abroad
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-forest-600">
              Every completed job can be rated. Providers keep their badge only while their rating and
              verification stay in good standing.
            </p>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-forest-100 bg-white p-4">
              <HeartHandshake className="h-8 w-8 text-gold-500" />
              <div>
                <p className="text-sm font-semibold text-forest-900">4.8 average from 1,240 households</p>
                <p className="text-[12px] text-forest-500">Verified reviews only · no anonymous ratings</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.slice(0, 2).map((r) => (
              <figure key={r.id} className="card card-pad">
                <Quote className="h-5 w-5 text-gold-400" />
                <blockquote className="mt-2 text-[13.5px] leading-relaxed text-forest-800">“{r.comment}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-2.5 border-t border-forest-50 pt-3">
                  <Avatar name={r.customer_name} size={30} />
                  <div>
                    <p className="text-[12px] font-semibold text-forest-900">{r.customer_name}</p>
                    <Stars rating={r.rating} size={11} />
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="container-x pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 via-forest-900 to-forest-950 px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
          <Star className="mx-auto h-6 w-6 text-gold-400" />
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
            Your home in Rwanda, handled with care — from anywhere in the world.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-forest-100/80">
            Create an account in under a minute. Book a verified professional, or open a family desk and
            start receiving photo reports this week.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-gold">
              {t('nav.register')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/services" className="btn-ghost border border-white/25 text-white hover:bg-white/10">
              {t('nav.services')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
