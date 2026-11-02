import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, HelpCircle, Plus, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { useRows } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { insertRow, updateRow } from '../lib/db';
import type { Plan, Subscription } from '../lib/types';
import { Badge, EmptyState, PillTabs } from '../components/ui';
import { addDaysISO, uid } from '../lib/format';

const faqs = [
  {
    q: 'Can I cancel a subscription at any time?',
    a: 'Yes. Cancel from your dashboard and the plan stays active until the end of the paid period. No cancellation fee.',
  },
  {
    q: 'Are the visits included in the price?',
    a: 'Each package includes the listed number of visits per month. Additional visits are billed at the standard category rate.',
  },
  {
    q: 'How do diaspora customers pay?',
    a: 'MTN Mobile Money and Airtel Money are supported, plus bank transfer for larger care budgets. Card payments are being enabled next.',
  },
  {
    q: 'What happens if I am not satisfied with a visit?',
    a: 'Open a complaint from the booking. URUGOCARE reviews it within one working day and can arrange a free re-visit or refund.',
  },
];

export default function Pricing() {
  const { t } = useI18n();
  const { money } = usePrefs();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { rows: plans } = useRows<Plan>('plans', { order: { column: 'price_rwf', ascending: true } });
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [busy, setBusy] = useState<string | null>(null);

  const visible = plans.filter((p) => p.interval === interval);

  async function subscribe(plan: Plan) {
    if (!profile) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }
    setBusy(plan.id);
    try {
      const existing = await (await import('../lib/db')).listRows<Subscription>('subscriptions', {
        where: { customer_id: profile.id },
      });
      const current = existing.find((s) => s.status === 'active' || s.status === 'trial');
      if (current) {
        await updateRow<Subscription>('subscriptions', current.id, { status: 'cancelled' });
      }
      await insertRow<Subscription>('subscriptions', {
        id: uid(),
        customer_id: profile.id,
        customer_name: profile.full_name,
        plan_slug: plan.slug,
        plan_name: plan.name,
        status: 'active',
        price: plan.price_rwf,
        started_at: addDaysISO(0),
        renews_at: addDaysISO(plan.interval === 'year' ? 365 : 30),
        payment_method: 'mtn_momo',
        auto_renew: true,
      });
      navigate('/dashboard/subscription');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="border-b border-forest-100 bg-white">
        <div className="container-x py-12 text-center sm:py-16">
          <p className="kicker">{t('nav.pricing')}</p>
          <h1 className="mx-auto mt-2 max-w-2xl font-display text-3xl leading-tight text-forest-900 sm:text-4xl">
            {t('home.section.pricing.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-forest-600">
            Predictable monthly care for your home and family. All packages include verified providers, written
            quotations and photo reports.
          </p>
          <div className="mt-7 inline-flex">
            <PillTabs
              tabs={[
                { key: 'month', label: 'Monthly' },
                { key: 'year', label: 'Yearly (2 months free)' },
              ]}
              value={interval}
              onChange={setInterval}
            />
          </div>
        </div>
      </div>

      <div className="container-x py-12">
        {visible.length === 0 ? (
          <EmptyState icon="Crown" title="Packages are being updated" body="Please contact the team for current care packages." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {visible.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.popular ? 'border-forest-800 bg-forest-900 text-white shadow-lift' : 'border-forest-100 bg-white'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-7 rounded-full bg-gold-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest-900">
                    {t('pricing.mostPopular') !== 'pricing.mostPopular' ? t('pricing.mostPopular') : 'Most popular'}
                  </span>
                )}
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${plan.popular ? 'text-gold-300' : 'text-gold-600'}`}>
                  {plan.tagline}
                </p>
                <h2 className={`mt-1.5 font-display text-2xl ${plan.popular ? 'text-white' : 'text-forest-900'}`}>
                  {plan.name}
                </h2>
                <p className={`mt-4 font-display text-4xl ${plan.popular ? 'text-white' : 'text-forest-900'}`}>
                  {money(plan.price_rwf)}
                  <span className={`text-sm font-normal ${plan.popular ? 'text-forest-200' : 'text-forest-500'}`}>
                    {' '}/ {plan.interval}
                  </span>
                </p>
                <p className={`mt-1 text-[12px] ${plan.popular ? 'text-forest-200/80' : 'text-forest-600'}`}>
                  {t('pricing.bestFor')}: {plan.best_for}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.popular ? 'text-gold-300' : 'text-forest-600'}`}
                        strokeWidth={3}
                      />
                      <span className={plan.popular ? 'text-forest-100/90' : 'text-forest-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy === plan.id}
                  onClick={() => void subscribe(plan)}
                  className={`mt-6 w-full ${plan.popular ? 'btn-gold' : 'btn-outline'}`}
                >
                  {busy === plan.id ? t('common.saving') : t('pricing.choose')}
                </button>
                <p className={`mt-2 text-center text-[11px] ${plan.popular ? 'text-forest-200/70' : 'text-forest-500'}`}>
                  {t('pricing.autoRenew')} · {t('pricing.cancelSub')}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Verified network', body: 'ID, references and trial job reviewed before first booking.' },
            { icon: HelpCircle, title: 'Human support', body: 'WhatsApp and phone support in English, French and Kinyarwanda.' },
            { icon: ArrowRight, title: 'No lock-in', body: 'Upgrade, downgrade or cancel from your dashboard in one click.' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-xl border border-forest-100 bg-white p-4">
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              <div>
                <p className="text-[13px] font-semibold text-forest-900">{item.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-forest-600">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="kicker">FAQ</p>
            <h2 className="mt-2 font-display text-2xl text-forest-900">{t('home.section.faq.title')}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-forest-600">
              Still unsure which package fits your family? Send us your situation and we will recommend the smallest
              plan that covers it.
            </p>
            <Link to="/contact" className="btn-outline btn-sm mt-4">
              {t('nav.contact')}
            </Link>
          </div>
          <div className="divide-y divide-forest-100 overflow-hidden rounded-2xl border border-forest-100 bg-white">
            {faqs.map((faq, i) => (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-[13.5px] font-semibold text-forest-900">{faq.q}</span>
                  <Plus
                    className={`h-4 w-4 shrink-0 text-forest-500 transition ${openFaq === i ? 'rotate-45' : ''}`}
                  />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-[13px] leading-relaxed text-forest-600">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return <Badge tone={plan.popular ? 'gold' : 'neutral'}>{plan.name}</Badge>;
}
