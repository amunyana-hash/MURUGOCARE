import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
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
import type { Property } from '../../lib/types';
import { insertRow, publishNotification, removeRow, updateRow } from '../../lib/db';
import { formatDate, todayISO, uid } from '../../lib/format';

const sectors = ['Nyamata', 'Rilima', 'Ntarama', 'Mayange', 'Ruhuha', 'Mareba', 'Kabarondo', 'Gashora', 'Rweru'];
const types: Property['type'][] = ['residence', 'apartment', 'farm', 'commercial'];

const emptyForm = {
  name: '',
  type: 'residence' as Property['type'],
  address: '',
  sector: 'Nyamata',
  bedrooms: 3,
  plot_size: '',
  caretaker_name: '',
  caretaker_phone: '',
  access_notes: '',
  status: 'managed' as Property['status'],
};

export default function FamilyProperties() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = usePrefs();
  const ownerId = profile?.id ?? '__none__';
  const { rows: properties } = useRows<Property>('properties', {
    where: { owner_id: ownerId },
    order: { column: 'created_at', ascending: false },
  });

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        p.caretaker_name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q),
    );
  }, [properties, query]);

  const nav = familyNav(t as never);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(p: Property) {
    setEditing(p);
    setForm({
      name: p.name,
      type: p.type,
      address: p.address,
      sector: p.sector,
      bedrooms: p.bedrooms,
      plot_size: p.plot_size ?? '',
      caretaker_name: p.caretaker_name,
      caretaker_phone: p.caretaker_phone,
      access_notes: p.access_notes ?? '',
      status: p.status,
    });
    setErrors({});
    setFormOpen(true);
  }

  async function save() {
    if (!profile) return;
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = 'Give the property a recognisable name.';
    if (form.address.trim().length < 5) next.address = 'Add a street or village description.';
    if (form.caretaker_name.trim().length < 3) next.caretaker_name = 'Who holds the keys?';
    if (form.caretaker_phone.trim().length < 8) next.caretaker_phone = 'Add a reachable phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (editing) {
        await updateRow<Property>('properties', editing.id, {
          ...form,
          name: form.name.trim(),
          address: form.address.trim(),
          caretaker_name: form.caretaker_name.trim(),
          caretaker_phone: form.caretaker_phone.trim(),
          plot_size: form.plot_size.trim() || undefined,
          access_notes: form.access_notes.trim() || undefined,
        });
        toast('Property updated', form.name.trim());
      } else {
        await insertRow('properties', {
          id: uid(),
          owner_id: profile.id,
          name: form.name.trim(),
          type: form.type,
          address: form.address.trim(),
          district: 'Bugesera',
          sector: form.sector,
          bedrooms: Number(form.bedrooms) || 0,
          plot_size: form.plot_size.trim() || undefined,
          caretaker_name: form.caretaker_name.trim(),
          caretaker_phone: form.caretaker_phone.trim(),
          access_notes: form.access_notes.trim() || undefined,
          last_inspection: null,
          status: form.status,
          created_at: new Date().toISOString(),
        });
        await publishNotification({
          user_id: profile.id,
          audience: 'customer',
          title: 'Property registered',
          body: `${form.name.trim()} (${form.sector}) is now on your family desk. Request an inspection any time.`,
          kind: 'system',
          link: '/family/properties',
        });
        toast('Property added', `${form.name.trim()} is under management.`);
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      toast('Property not saved', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await removeRow('properties', deleteTarget.id);
      toast('Property removed', deleteTarget.name);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function recordInspection(p: Property) {
    await updateRow<Property>('properties', p.id, { last_inspection: todayISO(), status: 'monitoring' });
    await publishNotification({
      user_id: ownerId,
      audience: 'customer',
      title: 'Inspection recorded',
      body: `${p.name} was inspected today. A photo report is available in the reports tab.`,
      kind: 'report',
      link: '/family/reports',
    });
    toast('Inspection recorded', `${p.name} marked as inspected today.`);
  }

  return (
    <DashboardShell
      title={t('family.properties', 'Properties')}
      subtitle="Homes, farms and commercial spaces monitored by URUGOCARE in Bugesera District."
      items={nav}
      accent={t('family.diasporaBadge', 'Diaspora')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <TextInput
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search', 'Search by name, sector or caretaker')}
            aria-label="Search properties"
          />
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add property
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="Building2"
            title={properties.length ? 'No match' : 'No property registered'}
            body={
              properties.length
                ? 'Try another search term.'
                : 'Register the home you left behind so we can inspect it, maintain it and send you photo evidence.'
            }
            action={
              <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add your first property
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="card card-pad flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-forest-900">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-forest-600">
                    <MapPin className="h-3 w-3" /> {p.sector}, {p.district}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{p.type}</Badge>
                <Badge tone="blue">{p.bedrooms} bedroom(s)</Badge>
                {p.plot_size && <Badge tone="gold">{p.plot_size}</Badge>}
              </div>

              <div className="mt-3 flex-1 space-y-2">
                <KeyValue label={t('common.address', 'Address')} value={p.address} />
                <KeyValue label={t('family.caretaker', 'Caretaker')} value={`${p.caretaker_name} · ${p.caretaker_phone}`} />
                <KeyValue
                  label={t('family.lastInspection', 'Last inspection')}
                  value={p.last_inspection ? formatDate(p.last_inspection, lang) : 'Never inspected'}
                />
                {p.access_notes && <KeyValue label={t('family.accessNotes', 'Access notes')} value={p.access_notes} />}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-forest-50 pt-3">
                <Link to="/family/requests" className="btn-primary btn-sm flex-1">
                  Request service
                </Link>
                <button type="button" className="btn-outline btn-sm" onClick={() => void recordInspection(p)}>
                  Record inspection
                </button>
                <button type="button" className="btn-ghost btn-sm" aria-label="Edit property" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-red-600"
                  aria-label="Remove property"
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 card card-pad">
        <SectionHeader
          title="What property management includes"
          subtitle="A monthly cycle managed by the Bugesera coordinator team."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Monthly inspection', body: 'Structure, roof, plumbing, security and compound condition with photos.' },
            { title: 'Caretaker coordination', body: 'We speak to the caretaker, verify their work and report concerns.' },
            { title: 'Maintenance dispatch', body: 'Verified plumbers, electricians and gardeners dispatched when needed.' },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-forest-100 p-3.5">
              <Building2 className="h-4 w-4 text-forest-600" />
              <p className="mt-2 text-[13px] font-semibold text-forest-900">{c.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-forest-600">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit property' : 'Add a property'}
        description="Accurate details let the coordinator plan visits without calling you."
        wide
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setFormOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? t('common.save', 'Save changes') : 'Add property'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property name" required error={errors.name} htmlFor="pr-name" className="sm:col-span-2">
            <TextInput
              id="pr-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              invalid={Boolean(errors.name)}
              placeholder="e.g. Nyamata family house"
            />
          </Field>
          <Field label={t('common.type', 'Type')} htmlFor="pr-type">
            <SelectField
              id="pr-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Property['type'] })}
            >
              {types.map((ty) => (
                <option key={ty} value={ty}>
                  {ty}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label={t('common.sector', 'Sector')} htmlFor="pr-sector">
            <SelectField
              id="pr-sector"
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label={t('common.address', 'Address')} required error={errors.address} htmlFor="pr-address" className="sm:col-span-2">
            <TextInput
              id="pr-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              invalid={Boolean(errors.address)}
              placeholder="Village, cell, nearest landmark"
            />
          </Field>
          <Field label="Bedrooms" htmlFor="pr-bedrooms">
            <TextInput
              id="pr-bedrooms"
              type="number"
              min={0}
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
            />
          </Field>
          <Field label="Plot size (optional)" htmlFor="pr-plot">
            <TextInput
              id="pr-plot"
              value={form.plot_size}
              onChange={(e) => setForm({ ...form, plot_size: e.target.value })}
              placeholder="e.g. 400 m²"
            />
          </Field>
          <Field label={t('family.caretaker', 'Caretaker name')} required error={errors.caretaker_name} htmlFor="pr-caretaker">
            <TextInput
              id="pr-caretaker"
              value={form.caretaker_name}
              onChange={(e) => setForm({ ...form, caretaker_name: e.target.value })}
              invalid={Boolean(errors.caretaker_name)}
            />
          </Field>
          <Field label="Caretaker phone" required error={errors.caretaker_phone} htmlFor="pr-caretaker-phone">
            <TextInput
              id="pr-caretaker-phone"
              value={form.caretaker_phone}
              onChange={(e) => setForm({ ...form, caretaker_phone: e.target.value })}
              invalid={Boolean(errors.caretaker_phone)}
              placeholder="0788 123 456"
            />
          </Field>
          <Field label={t('common.status', 'Management status')} htmlFor="pr-status">
            <SelectField
              id="pr-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Property['status'] })}
            >
              <option value="managed">Fully managed</option>
              <option value="monitoring">Monitoring only</option>
              <option value="vacant">Vacant</option>
            </SelectField>
          </Field>
          <Field label={t('family.accessNotes', 'Access notes')} htmlFor="pr-access" className="sm:col-span-2">
            <TextArea
              id="pr-access"
              rows={3}
              value={form.access_notes}
              onChange={(e) => setForm({ ...form, access_notes: e.target.value })}
              placeholder="Gate code, key holder, dog on the compound, best visiting hours…"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove property"
        description={deleteTarget?.name}
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
          Removing this property stops scheduled inspections. Past reports and bookings stay in your history for your
          records.
        </p>
      </Modal>
    </DashboardShell>
  );
}
