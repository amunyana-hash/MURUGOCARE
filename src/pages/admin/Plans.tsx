import { useMemo, useState } from 'react';
import { Crown, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  EmptyState,
  Field,
  KeyValue,
  Modal,
  SectionHeader,
  SelectField,
  StatCard,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Plan, Subscription } from '../../lib/types';
import { insertRow, removeRow, updateRow } from '../../lib/db';
import { slugToLabel, uid } from '../../lib/format';

interface Draft {
  name: string;
  tagline: string;
  price_rwf: string;
  interval: Plan['interval'];
  best_for: string;
  features: string;
  popular: boolean;
}

const emptyDraft: Draft = {
  name: '',
  tagline: '',
  price_rwf: '12000',
  interval: 'month',
  best_for: '',
  features: '',
  popular: false,
};

export default function AdminPlans() {
  const { t } = useI18n();
  const { money, toast } = usePrefs();

  const { rows: plans } = useRows<Plan>('plans', { order: { column: 'price_rwf', ascending: true } });
  const { rows: subscriptions } = useRows<Subscription>('subscriptions', {
    order: { column: 'started_at', ascending: false },
  });

  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const nav = adminNav(t as never);

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active' || s.status === 'trial');
    const mrr = active
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.plan_slug ? s.price : 0), 0);
    return {
      active: active.length,
      mrr,
      cancelled: subscriptions.filter((s) => s.status === 'cancelled' || s.status === 'expired').length,
      plans: plans.length,
    };
  }, [subscriptions, plans]);

  const perPlan = useMemo(() => {
    const map = new Map<string, number>();
    subscriptions
      .filter((s) => s.status === 'active' || s.status === 'trial')
      .forEach((s) => map.set(s.plan_slug, (map.get(s.plan_slug) ?? 0) + 1));
    return map;
  }, [subscriptions]);

  function openEdit(plan: Plan) {
    setEditing(plan);
    setCreating(false);
    setDraft({
      name: plan.name,
      tagline: plan.tagline,
      price_rwf: String(plan.price_rwf),
      interval: plan.interval,
      best_for: plan.best_for,
      features: plan.features.join('\n'),
      popular: Boolean(plan.popular),
    });
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setDraft(emptyDraft);
  }

  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    const price = Number(draft.price_rwf.replace(/[^\d]/g, ''));
    if (draft.name.trim().length < 3) {
      toast('Plan name required', 'Use at least 3 characters.', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 1000) {
      toast('Invalid price', 'The monthly price must be at least RWF 1,000.', 'error');
      return;
    }
    const features = draft.features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
    if (features.length < 2) {
      toast('Add features', 'List at least two benefits, one per line.', 'error');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateRow<Plan>('plans', editing.id, {
          name: draft.name.trim(),
          tagline: draft.tagline.trim(),
          price_rwf: price,
          interval: draft.interval,
          best_for: draft.best_for.trim() || 'Households in Bugesera',
          features,
          popular: draft.popular,
        });
        toast('Plan updated', `${draft.name.trim()} now ${money(price)}`);
      } else {
        await insertRow<Plan>('plans', {
          id: uid(),
          slug: slugToLabel(draft.name.trim()),
          name: draft.name.trim(),
          tagline: draft.tagline.trim(),
          price_rwf: price,
          interval: draft.interval,
          features,
          best_for: draft.best_for.trim() || 'Households in Bugesera',
          popular: draft.popular,
        });
        toast('Plan created', `${draft.name.trim()} is now on the pricing page.`);
      }
      close();
    } catch (err) {
      toast('Save failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(plan: Plan) {
    if (perPlan.get(plan.slug)) {
      toast('Plan in use', `${perPlan.get(plan.slug)} active subscriber(s) — move them first.`, 'error');
      return;
    }
    setBusy(true);
    try {
      await removeRow('plans', plan.id);
      toast('Plan removed', plan.name);
    } catch (err) {
      toast('Delete failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('admin.plans', 'Subscription plans')}
      subtitle="Membership packages shown on the public pricing page."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live plans" value={stats.plans} hint="Visible to customers" icon="Crown" tone="gold" />
        <StatCard label="Active subscribers" value={stats.active} hint="Paid or trial" icon="Users" tone="green" />
        <StatCard label="Recurring value" value={money(stats.mrr)} hint="Billed monthly" icon="Wallet" tone="blue" />
        <StatCard label="Churned" value={stats.cancelled} hint="Cancelled or expired" icon="TrendingDown" tone="red" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <SectionHeader title="Packages" subtitle="Edit pricing, benefits or create a new tier." />
        <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New plan
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon="Crown" title="No plan yet" body="Create the first subscription package for URUGOCARE." />
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="card card-pad flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-[15px] text-forest-900">{plan.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-forest-500">{plan.tagline}</p>
                </div>
                {plan.popular && <Badge tone="gold">Popular</Badge>}
              </div>
              <p className="mt-3 font-display text-2xl text-forest-900">
                {money(plan.price_rwf)}
                <span className="ml-1 text-[11.5px] font-normal text-forest-500">/ {plan.interval}</span>
              </p>
              <p className="mt-1 text-[11px] text-forest-500">Best for {plan.best_for}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-2 text-[11.5px] leading-relaxed text-forest-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                    {f}
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-[11px] text-forest-500">+{plan.features.length - 4} more benefits</li>
                )}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-forest-50 pt-3">
                <span className="text-[11px] text-forest-500">{perPlan.get(plan.slug) ?? 0} active</span>
                <div className="flex gap-1.5">
                  <button type="button" className="btn-outline btn-sm" onClick={() => openEdit(plan)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-600"
                    disabled={busy}
                    onClick={() => void remove(plan)}
                    aria-label={`Delete ${plan.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="card card-pad mt-6">
        <SectionHeader title="Bundle rules" subtitle="How subscriptions interact with service bookings." />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-forest-50/60 px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-forest-900">Included visits</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-forest-600">
              Bundle visits are consumed before pay-as-you-go pricing is applied to the same category.
            </p>
          </div>
          <div className="rounded-xl bg-forest-50/60 px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-forest-900">Diaspora billing</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-forest-600">
              Diaspora subscribers are billed in RWF and can pay by card or through a relative’s mobile money wallet.
            </p>
          </div>
        </div>
      </section>

      <Modal
        open={creating || Boolean(editing)}
        onClose={close}
        title={editing ? 'Edit plan' : 'New subscription plan'}
        description={editing ? editing.slug : 'The plan appears on the pricing page immediately.'}
        wide
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
              <Crown className="h-3.5 w-3.5" /> {editing ? 'Save plan' : 'Create plan'}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Plan name" required>
            <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Care Plus" />
          </Field>
          <Field label="Tagline">
            <TextInput
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              placeholder="Monthly peace of mind"
            />
          </Field>
          <Field label="Price (RWF)" required hint="Minimum RWF 1,000">
            <TextInput
              value={draft.price_rwf}
              onChange={(e) => setDraft({ ...draft, price_rwf: e.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="Billing interval">
            <SelectField
              value={draft.interval}
              onChange={(e) => setDraft({ ...draft, interval: e.target.value as Plan['interval'] })}
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </SelectField>
          </Field>
          <Field label="Best for" className="sm:col-span-2">
            <TextInput
              value={draft.best_for}
              onChange={(e) => setDraft({ ...draft, best_for: e.target.value })}
              placeholder="Busy households in Nyamata"
            />
          </Field>
          <Field label="Benefits" hint="One per line" required className="sm:col-span-2">
            <TextArea
              rows={5}
              value={draft.features}
              onChange={(e) => setDraft({ ...draft, features: e.target.value })}
              placeholder={'Two cleaning visits per month\nPriority provider dispatch\nPhoto report after every visit'}
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12px] text-forest-700">
          <input
            type="checkbox"
            checked={draft.popular}
            onChange={(e) => setDraft({ ...draft, popular: e.target.checked })}
            className="h-4 w-4 rounded border-forest-300 text-forest-700 focus:ring-forest-500"
          />
          Highlight as the most popular package
        </label>
        {editing && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <KeyValue label="Slug" value={editing.slug} />
            <KeyValue label="Active subscribers" value={perPlan.get(editing.slug) ?? 0} />
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
