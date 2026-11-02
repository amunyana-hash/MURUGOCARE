import { useMemo, useState } from 'react';
import { HeartHandshake, Loader2, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  Checkbox,
  EmptyState,
  Field,
  KeyValue,
  Modal,
  SectionHeader,
  SelectField,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { FamilyMember, Property } from '../../lib/types';
import { insertRow, publishNotification, removeRow, updateRow } from '../../lib/db';
import { uid } from '../../lib/format';

const relationships = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sister', 'Brother', 'Child', 'Other'];
const needOptions = ['Elderly companionship', 'Medication reminders', 'Grocery delivery', 'House cleaning', 'Garden care', 'Health check visits', 'Transport to clinic'];

const emptyForm = {
  full_name: '',
  relationship: 'Mother',
  age: '',
  phone: '',
  address: '',
  property_id: '',
  needs: [] as string[],
  notes: '',
  monthly_budget: '',
  status: 'active' as FamilyMember['status'],
};

export default function FamilyRelatives() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { money, toast } = usePrefs();
  const ownerId = profile?.id ?? '__none__';

  const { rows: relatives } = useRows<FamilyMember>('family_members', {
    where: { owner_id: ownerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: properties } = useRows<Property>('properties', { where: { owner_id: ownerId } });

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return relatives;
    return relatives.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.relationship.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q),
    );
  }, [relatives, query]);

  const nav = familyNav(t as never);
  const propertyName = (id?: string | null) => properties.find((p) => p.id === id)?.name ?? '—';

  const totalBudget = relatives.reduce((s, r) => s + r.monthly_budget, 0);
  const activeCount = relatives.filter((r) => r.status === 'active').length;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(r: FamilyMember) {
    setEditing(r);
    setForm({
      full_name: r.full_name,
      relationship: r.relationship,
      age: String(r.age),
      phone: r.phone,
      address: r.address,
      property_id: r.property_id ?? '',
      needs: [...r.needs],
      notes: r.notes ?? '',
      monthly_budget: String(r.monthly_budget),
      status: r.status,
    });
    setErrors({});
    setFormOpen(true);
  }

  function toggleNeed(need: string, on: boolean) {
    setForm((f) => ({ ...f, needs: on ? [...f.needs, need] : f.needs.filter((n) => n !== need) }));
  }

  async function save() {
    if (!profile) return;
    const next: Record<string, string> = {};
    if (form.full_name.trim().length < 3) next.full_name = 'Enter the full name of your relative.';
    const age = Number(form.age);
    if (!form.age || Number.isNaN(age) || age < 0 || age > 120) next.age = 'Age must be between 0 and 120.';
    if (form.phone.trim().length < 8) next.phone = 'Add a reachable phone number.';
    if (form.address.trim().length < 4) next.address = 'Where should our provider go?';
    const budget = Number(form.monthly_budget);
    if (Number.isNaN(budget) || budget < 0) next.monthly_budget = 'Enter a monthly budget in RWF.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        relationship: form.relationship,
        age,
        phone: form.phone.trim(),
        address: form.address.trim(),
        property_id: form.property_id || null,
        needs: form.needs,
        notes: form.notes.trim() || undefined,
        monthly_budget: budget,
        status: form.status,
      };
      if (editing) {
        await updateRow<FamilyMember>('family_members', editing.id, payload);
        toast('Relative updated', payload.full_name);
      } else {
        await insertRow('family_members', {
          id: uid(),
          owner_id: profile.id,
          ...payload,
          created_at: new Date().toISOString(),
        });
        await publishNotification({
          user_id: profile.id,
          audience: 'customer',
          title: 'Relative registered',
          body: `${payload.full_name} (${payload.relationship}) is now on your family desk. You can request visits at any time.`,
          kind: 'system',
          link: '/family/relatives',
        });
        toast('Relative added', `${payload.full_name} is on your family desk.`);
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      toast('Not saved', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(r: FamilyMember) {
    const next: FamilyMember['status'] = r.status === 'active' ? 'paused' : 'active';
    await updateRow<FamilyMember>('family_members', r.id, { status: next });
    toast(next === 'active' ? 'Care resumed' : 'Care paused', r.full_name);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await removeRow('family_members', deleteTarget.id);
      toast('Relative removed', deleteTarget.full_name);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('family.relatives', 'Relatives')}
      subtitle="Register the people URUGOCARE looks after on your behalf in Bugesera District."
      items={nav}
      accent={t('family.diasporaBadge', 'Diaspora')}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card card-pad">
          <p className="kicker">Registered relatives</p>
          <p className="stat-value mt-2">{relatives.length}</p>
          <p className="mt-1 text-[11.5px] text-forest-500">{activeCount} with active care</p>
        </div>
        <div className="card card-pad">
          <p className="kicker">Combined monthly budget</p>
          <p className="stat-value mt-2">{money(totalBudget)}</p>
          <p className="mt-1 text-[11.5px] text-forest-500">Spread across all relatives</p>
        </div>
        <div className="card card-pad">
          <p className="kicker">Care categories in use</p>
          <p className="stat-value mt-2">{new Set(relatives.flatMap((r) => r.needs)).size}</p>
          <p className="mt-1 text-[11.5px] text-forest-500">From companionship to deliveries</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <TextInput
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, relationship or address"
            aria-label="Search relatives"
          />
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add relative
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="Users"
            title={relatives.length ? 'No match' : 'No relative registered'}
            body={
              relatives.length
                ? 'Try a different search term.'
                : 'Add your mother, father, grandparent or child so we know who to visit and what support they need.'
            }
            action={
              <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Register a relative
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <div key={r.id} className="card card-pad flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-forest-900">{r.full_name}</p>
                  <p className="mt-0.5 text-[11.5px] text-forest-600">
                    {r.relationship} · {r.age} yrs
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="gold">{money(r.monthly_budget)}/mo</Badge>
                <Badge tone="blue">{propertyName(r.property_id)}</Badge>
              </div>

              <div className="mt-3 flex-1 space-y-2">
                <KeyValue label={t('common.phone', 'Phone')} value={r.phone} />
                <KeyValue label={t('common.address', 'Address')} value={r.address} />
                <div className="rounded-xl bg-forest-50/60 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-500">Care needs</p>
                  {r.needs.length === 0 ? (
                    <p className="text-sm text-forest-500">No specific need listed</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.needs.map((n) => (
                        <Badge key={n} tone="green">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {r.notes && <KeyValue label="Notes" value={r.notes} />}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-forest-50 pt-3">
                <Link to="/family/requests" className="btn-primary btn-sm flex-1">
                  Request a visit
                </Link>
                <button type="button" className="btn-outline btn-sm" onClick={() => void toggleStatus(r)}>
                  {r.status === 'active' ? 'Pause' : 'Resume'}
                </button>
                <button type="button" className="btn-ghost btn-sm" aria-label="Edit relative" onClick={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-red-600"
                  aria-label="Remove relative"
                  onClick={() => setDeleteTarget(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 card card-pad">
        <SectionHeader title="How relative care works" subtitle="Every visit is executed by an ID-verified provider." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Users, title: 'Register once', body: 'Name, address, needs and monthly budget — updated anytime.' },
            { icon: Phone, title: 'We coordinate', body: 'The coordinator calls before each visit and confirms arrival.' },
            { icon: HeartHandshake, title: 'You get proof', body: 'Photos, video and a written report after every completed visit.' },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-forest-100 p-3.5">
              <c.icon className="h-4 w-4 text-forest-600" />
              <p className="mt-2 text-[13px] font-semibold text-forest-900">{c.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-forest-600">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit relative' : 'Add a relative'}
        description="This information guides the provider before they knock on the door."
        wide
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setFormOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? t('common.save', 'Save changes') : 'Add relative'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.full_name} htmlFor="rel-name">
            <TextInput
              id="rel-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              invalid={Boolean(errors.full_name)}
              placeholder="e.g. Immaculée Mukamana"
            />
          </Field>
          <Field label="Relationship" htmlFor="rel-rel">
            <SelectField
              id="rel-rel"
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            >
              {relationships.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Age" required error={errors.age} htmlFor="rel-age">
            <TextInput
              id="rel-age"
              type="number"
              min={0}
              max={120}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              invalid={Boolean(errors.age)}
            />
          </Field>
          <Field label={t('common.phone', 'Phone')} required error={errors.phone} htmlFor="rel-phone">
            <TextInput
              id="rel-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              invalid={Boolean(errors.phone)}
              placeholder="0788 123 456"
            />
          </Field>
          <Field label={t('common.address', 'Address')} required error={errors.address} htmlFor="rel-address" className="sm:col-span-2">
            <TextInput
              id="rel-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              invalid={Boolean(errors.address)}
              placeholder="Village, cell, sector and nearest landmark"
            />
          </Field>
          <Field label="Linked property" hint="Optional — helps the provider plan the route." htmlFor="rel-prop">
            <SelectField
              id="rel-prop"
              value={form.property_id}
              onChange={(e) => setForm({ ...form, property_id: e.target.value })}
            >
              <option value="">Not linked</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.sector}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field
            label="Monthly care budget (RWF)"
            required
            error={errors.monthly_budget}
            hint="Used to plan visits; you are only billed for completed services."
            htmlFor="rel-budget"
          >
            <TextInput
              id="rel-budget"
              type="number"
              min={0}
              step={1000}
              value={form.monthly_budget}
              onChange={(e) => setForm({ ...form, monthly_budget: e.target.value })}
              invalid={Boolean(errors.monthly_budget)}
              placeholder="50000"
            />
          </Field>
          <Field label={t('common.status', 'Care status')} htmlFor="rel-status">
            <SelectField
              id="rel-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as FamilyMember['status'] })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </SelectField>
          </Field>
          <div className="sm:col-span-2">
            <p className="label">Care needs</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {needOptions.map((need) => (
                <Checkbox
                  key={need}
                  label={need}
                  checked={form.needs.includes(need)}
                  onChange={(v) => toggleNeed(need, v)}
                />
              ))}
            </div>
          </div>
          <Field label="Notes for the provider" htmlFor="rel-notes" className="sm:col-span-2">
            <TextArea
              id="rel-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Medical conditions, preferred visiting hours, who holds the keys…"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove relative"
        description={deleteTarget?.full_name}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel', 'Keep it')}
            </button>
            <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => void confirmDelete()}>
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-forest-700">
          Removing this relative stops new care visits. Past bookings and reports stay in your history.
        </p>
      </Modal>
    </DashboardShell>
  );
}
