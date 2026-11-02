import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Globe2, HeartHandshake, Leaf, MapPin, ShieldCheck, Target } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { useCategories } from '../lib/hooks';

export default function About() {
  const { t, categoryName } = useI18n();
  const { money } = usePrefs();
  const { categories } = useCategories();

  const values = [
    { icon: ShieldCheck, title: 'Trust before speed', body: 'No provider takes a job before identity, references and a trial visit are checked by our team in Nyamata.' },
    { icon: HeartHandshake, title: 'Family first', body: 'We treat every household as if our own parents lived there — especially when the family is abroad.' },
    { icon: Leaf, title: 'Local jobs, local money', body: 'Every booking keeps income inside Bugesera and pays professionals within two working days of completion.' },
    { icon: Globe2, title: 'Diaspora-grade transparency', body: 'Photographs, timestamps and written reports for every visit so distance never means guessing.' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-forest-900 text-white">
        <div className="hero-grain absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="container-x relative py-16 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">{t('nav.about')}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-[2.75rem]">
            Built in Nyamata to make home care in Rwanda dependable — for families here and abroad.
          </h1>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-forest-100/85">{t('footer.about')}</p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              { label: 'Founded', value: '2023' },
              { label: 'Base', value: 'Nyamata, Bugesera' },
              { label: 'Team', value: '14 staff + 180 providers' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-forest-200/60">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="kicker">The problem</p>
            <h2 className="mt-2 font-display text-2xl text-forest-900 sm:text-3xl">
              Finding someone trustworthy is still the hardest part of home care
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-forest-700">
              Families in Bugesera rely on informal referrals. Prices vary between neighbours, quality is inconsistent,
              and there is rarely a record of what was actually done. For the thousands of Rwandans living in Europe,
              North America and the Gulf, the gap is sharper: they need to arrange cleaning for an elderly parent or
              inspect a plot in Ruhuha, but have no verified contact on the ground.
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-forest-700">
              URUGOCARE closes that gap with one vetted network, written quotations, recorded completion reports and a
              support team that answers in the language the family actually speaks.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-forest-100 bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                  <v.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-3 font-display text-[15px] text-forest-900">{v.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-forest-600">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-forest-100 bg-white py-14">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">What we cover</p>
              <h2 className="mt-2 font-display text-2xl text-forest-900 sm:text-3xl">Seven service categories, one network</h2>
            </div>
            <Link to="/services" className="btn-outline btn-sm">
              {t('nav.services')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/services/${c.slug}`}
                className="rounded-xl border border-forest-100 p-4 transition hover:border-forest-300 hover:bg-forest-50/40"
              >
                <p className="text-[13.5px] font-semibold text-forest-900">{categoryName(c)}</p>
                <p className="mt-0.5 text-[11.5px] text-forest-500">
                  from {money(c.base_price)} / {c.unit}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-forest-100 bg-forest-50/60 p-8">
            <MapPin className="h-7 w-7 text-gold-600" />
            <h2 className="mt-3 font-display text-2xl text-forest-900">Where we operate</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-forest-700">
              Our field team is based in Nyamata and covers the whole of Bugesera District: Nyamata, Ruhuha, Rilima,
              Ntarama, Mayange, Mareba and neighbouring sectors. Bookings outside the district are handled case by case
              with a travel quote.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Nyamata', 'Ruhuha', 'Rilima', 'Ntarama', 'Mayange', 'Mareba', 'Kigali (on request)'].map((s) => (
                <span key={s} className="chip">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="kicker">How verification works</p>
            <h2 className="mt-2 font-display text-2xl text-forest-900">Four checks before a provider is listed</h2>
            <ol className="mt-5 space-y-3">
              {[
                'National ID or passport plus a proof of address in Bugesera.',
                'Two independent references contacted by phone.',
                'Skill assessment with a URUGOCARE coordinator, including a supervised trial job.',
                'Ongoing monitoring: rating floor of 4.2, complaint review and yearly re-verification.',
              ].map((item, i) => (
                <li key={item} className="flex gap-3 rounded-xl border border-forest-100 bg-white p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-800 text-[11px] font-bold text-gold-300">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed text-forest-800">{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/register?role=provider" className="btn-primary btn-sm">
                <BadgeCheck className="h-4 w-4" /> Apply as provider
              </Link>
              <Link to="/contact" className="btn-outline btn-sm">
                <Building2 className="h-4 w-4" /> Partner with us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x pb-16">
        <div className="rounded-2xl bg-forest-900 px-6 py-10 text-center text-white sm:px-10">
          <Target className="mx-auto h-6 w-6 text-gold-400" />
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-2xl leading-snug sm:text-3xl">
            Our target: every Bugesera household able to book a verified professional in under three minutes.
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard/book" className="btn-gold">
              {t('common.bookService')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
