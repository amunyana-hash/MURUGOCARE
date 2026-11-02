import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Badge, Checkbox, EmptyState, KeyValue, SectionHeader, StatusBadge } from '../../components/ui';
import type { PaymentMethod, Plan, Subscription as Sub } from '../../lib/types';
import { insertRow, listRows, publishNotification, updateRow } from '../../lib/db';
import { addDaysISO, formatDate, uid } from '../../lib/format';

export default function SubscriptionPage() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();
  const customerId = profile?.id ?? '__none__';
  const { rows: plans } = useRows<Plan>('plans');
  const { rows: subscriptions } = useRows<Sub>('subscriptions', { where: { customer_id: customerId } });
  const [busy, setBusy] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mtn_momo');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);

  const current = subscriptions.find((s) => s.status === 'active' || s.status === 'trial');

  useEffect(() => {
    if (current) setAutoRenew(current.auto_renew);
  }, [current]);

  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);
  const sorted = [...plans].sort((a, b) => a.price_rwf - b.price_rwf);

  async function subscribe(plan: Plan) {
    if (!profile) return;
    setBusy(plan.id);
    try {
      for (const existing of subscriptions.filter((s) => s.status === 'active' || s.status === 'trial')) {
        await updateRow<Sub>('subscriptions', existing.id, { status: 'cancelled' });
      }
      const today = new Date().toISOString().slice(0, 10);
      await insertRow('subscriptions', {
        id: uid(),
        customer_id: profile.id,
        customer_name: profile.full_name,
        plan_slug: plan.slug,
        plan_name: plan.name,
        status: 'active',
        price: plan.price_rwf,
        started_at: today,
        renews_at: addDaysISO(today, plan.interval === 'year' ? 365 : 30),
        payment_method: method,
        auto_renew: autoRenew,
      });
      await insertRow('payments', {
        id: uid(),
        booking_id: null,
        booking_ref: `SUB-${plan.slug.toUpperCase().slice(0, 6)}`,
        customer_id: profile.id,
        customer_name: profile.full_name,
        amount: plan.price_rwf,
        method,
        status: 'succeeded',
        provider_ref: `SUB-${Math.floor(100000 + Math.random() * 899999)}`,
        description: `${plan.name} subscription — first ${plan.interval}`,
        created_at: new Date().toISOString(),
      });
      await publishNotification({
        user_id: profile.id,
        audience: 'customer',
        title: `Subscription active · ${plan.name}`,
        body: `${money(plan.price_rwf)} charged. Renews ${plan.interval === 'year' ? 'yearly' : 'monthly'}.`,
        kind: 'payment',
        link: '/dashboard/subscription',
      });
      await publishNotification({
        user_id: 'u-admin-1',
        audience: 'admin',
        title: `New subscription · ${plan.name}`,
        body: `${profile.full_name} subscribed on ${plan.name} (${money(plan.price_rwf)}).`,
        kind: 'payment',
        link: '/admin/plans',
      });
      toast('Subscription active', `${plan.name} · ${money(plan.price_rwf)}`);
      setConfirmPlan(null);
    } catch (err) {
      toast('Subscription not saved', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function cancelSubscription() {
    if (!current) return;
    setBusy('cancel');
    try {
      await updateRow<Sub>('subscriptions', current.id, { status: 'cancelled', auto_renew: false });
      toast('Subscription cancelled', 'You keep access until the renewal date.');
    } finally {
      setBusy('');
    }
  }

  async function toggleAutoRenew(next: boolean) {
    setAutoRenew(next);
    if (!current) return;
    await updateRow<Sub>('subscriptions', current.id, { auto_renew: next });
    toast(next ? 'Auto-renew on' : 'Auto-renew off', next ? 'Your plan renews automatically.' : 'Remember to renew manually.');
  }

  async function reactivate() {
    if (!current) return;
    setBusy('reactivate');
    try {
      await updateRow<Sub>('subscriptions', current.id, { status: 'active', auto_renew: true });
      toast('Plan reactivated', current.plan_name);
    } finally {
      setBusy('');
    }
  }

  async function refreshHistory() {
    await listRows<Sub>('subscriptions', { where: { customer_id: customerId } });
  }

  return (
    <DashboardShell
      title={t('dash.subscription', 'Subscription')}
      subtitle="Save on every visit with a household plan. Cancel any time before renewal."
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      {current ? (
        <div className="card card-pad border-forest-200 bg-gradient-to-br from-forest-900 to-forest-800 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="kicker text-gold-300">{current.status === 'trial' ? 'Trial plan' : 'Active plan'}</p>
              <p className="mt-1.5 font-display text-2xl">{current.plan_name}</p>
              <p className="mt-1 text-[12.5px] text-forest-100/80">
                {money(current.price)} / {current.plan_slug.includes('year') ? 'year' : 'month'} · renews{' '}
                {formatDate(current.renews_at, lang)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-gold btn-sm" disabled={busy === 'reactivate'} onClick={() => void reactivate()}>
                <RefreshCw className="h-4 w-4" /> Renew now
              </button>
              <button type="button" className="btn-outline btn-sm border-white/30 text-white" disabled={busy === 'cancel'} onClick={() => void cancelSubscription()}>
                {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cancel plan
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-forest-100/70">Started</p>
              <p className="text-[13px] font-semibold">{formatDate(current.started_at, lang)}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-forest-100/70">Payment method</p>
              <p className="text-[13px] font-semibold capitalize">{current.payment_method.replace('_', ' ')}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-forest-100/70">Status</p>
              <p className="text-[13px] font-semibold capitalize">{current.status}</p>
            </div>
          </div>
          <div className="mt-4">
            <Checkbox
              checked={autoRenew}
              onChange={(v) => void toggleAutoRenew(v)}
              label={<span className="text-white">Automatic renewal</span>}
              description="Reminder 3 days before charging your saved wallet."
            />
          </div>
        </div>
      ) : (
        <div className="card card-pad">
          <EmptyState
            icon="Crown"
            title="No active plan"
            body="Household plans include recurring visits, priority booking and discounted rates. Choose one below."
          />
        </div>
      )}

      <div className="mt-8">
        <SectionHeader
          eyebrow="Household plans"
          title={current ? 'Change your plan' : 'Choose a plan'}
          subtitle="All prices in Rwandan Francs and include provider vetting, scheduling and support."
          action={
            <Link to="/pricing" className="btn-ghost btn-sm">
              Compare all features
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {sorted.map((plan) => {
            const isCurrent = current?.plan_slug === plan.slug;
            return (
              <div
                key={plan.id}
                className={`card card-pad relative flex flex-col ${
                  plan.popular ? 'border-gold-300 shadow-soft' : ''
                } ${isCurrent ? 'border-forest-500 ring-1 ring-forest-200' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-4">
                    <Badge tone="gold">Most popular</Badge>
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Crown className={`h-4 w-4 ${plan.popular ? 'text-gold-600' : 'text-forest-600'}`} />
                  <p className="font-display text-lg text-forest-900">{plan.name}</p>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-forest-600">{plan.tagline}</p>
                <p className="mt-3 font-display text-3xl text-forest-900">
                  {money(plan.price_rwf)}
                  <span className="ml-1 text-[12px] font-sans font-normal text-forest-500">/{plan.interval}</span>
                </p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-forest-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-forest-500">Best for: {plan.best_for}</p>
                <button
                  type="button"
                  className={`mt-3 w-full ${plan.popular ? 'btn-gold' : 'btn-primary'} btn-sm`}
                  disabled={isCurrent || busy === plan.id}
                  onClick={() => setConfirmPlan(plan)}
                >
                  {busy === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? <ShieldCheck className="h-4 w-4" /> : null}
                  {isCurrent ? 'Current plan' : current ? 'Switch to this plan' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
        {sorted.length === 0 && (
          <div className="mt-4">
            <EmptyState icon="Crown" title="Plans are loading" body="Refresh the page or check your connection." />
          </div>
        )}
      </div>

      <div className="mt-8 card card-pad">
        <SectionHeader title="Billing history" subtitle="Every subscription payment recorded on your account." />
        {subscriptions.length === 0 ? (
          <p className="text-[12.5px] text-forest-600">No subscription history yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Started</th>
                  <th>Renews</th>
                  <th>Price</th>
                  <th>{t('common.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold text-forest-800">{s.plan_name}</td>
                    <td className="whitespace-nowrap text-forest-600">{formatDate(s.started_at, lang)}</td>
                    <td className="whitespace-nowrap text-forest-600">{formatDate(s.renews_at, lang)}</td>
                    <td className="whitespace-nowrap">{money(s.price)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => void refreshHistory()}>
          <RefreshCw className="h-3.5 w-3.5" /> {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="kicker">Confirm subscription</p>
            <p className="mt-1 font-display text-xl text-forest-900">{confirmPlan.name}</p>
            <p className="mt-1 text-[12.5px] text-forest-600">
              {money(confirmPlan.price_rwf)} charged now, renewing every {confirmPlan.interval}.
            </p>
            <div className="mt-4 space-y-2.5">
              <label className="label" htmlFor="sub-method">
                {t('booking.paymentMethod', 'Payment method')}
              </label>
              <select id="sub-method" className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="mtn_momo">MTN Mobile Money</option>
                <option value="airtel_money">Airtel Money</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
              </select>
              <KeyValue label="Total today" value={money(confirmPlan.price_rwf)} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmPlan(null)}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="button" className="btn-primary btn-sm" disabled={busy === confirmPlan.id} onClick={() => void subscribe(confirmPlan)}>
                {busy === confirmPlan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Subscribe
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
