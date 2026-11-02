import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  EmptyState,
  KeyValue,
  Modal,
  PillTabs,
  SectionHeader,
  SelectField,
  StatCard,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Complaint } from '../../lib/types';
import { publishNotification, updateRow } from '../../lib/db';
import { formatDateTime, relativeTime } from '../../lib/format';

type Tab = 'all' | Complaint['status'];

export default function AdminComplaints() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = usePrefs();

  const { rows: complaints } = useRows<Complaint>('complaints', {
    order: { column: 'created_at', ascending: false },
  });

  const [tab, setTab] = useState<Tab>('open');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Complaint | null>(null);
  const [status, setStatus] = useState<Complaint['status']>('investigating');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  const nav = adminNav(t as never, {
    openComplaints: complaints.filter((c) => c.status !== 'resolved').length,
  });

  const counts = useMemo(
    () => ({
      open: complaints.filter((c) => c.status === 'open').length,
      investigating: complaints.filter((c) => c.status === 'investigating').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
      all: complaints.length,
    }),
    [complaints],
  );

  const urgent = complaints.filter((c) => c.priority === 'urgent' && c.status !== 'resolved').length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return complaints.filter((c) => {
      const inTab = tab === 'all' || c.status === tab;
      const inQuery =
        !q ||
        c.ref.toLowerCase().includes(q) ||
        c.customer_name.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.booking_ref ?? '').toLowerCase().includes(q);
      return inTab && inQuery;
    });
  }, [complaints, tab, query]);

  function openComplaint(c: Complaint) {
    setActive(c);
    setStatus(c.status === 'open' ? 'investigating' : c.status);
    setResolution(c.resolution ?? '');
  }

  async function save() {
    if (!active) return;
    if (status === 'resolved' && resolution.trim().length < 15) {
      toast('Resolution required', 'Describe the outcome in at least 15 characters.', 'error');
      return;
    }
    setBusy(true);
    try {
      await updateRow<Complaint>('complaints', active.id, {
        status,
        resolution: resolution.trim() || null,
        updated_at: new Date().toISOString(),
      });
      await publishNotification({
        user_id: active.customer_id,
        audience: 'customer',
        title: status === 'resolved' ? `Complaint ${active.ref} resolved` : `Complaint ${active.ref} is being investigated`,
        body:
          resolution.trim() ||
          'The URUGOCARE team is reviewing your case and will follow up within one working day.',
        kind: 'complaint',
        link: '/dashboard/complaints',
      });
      toast('Complaint updated', `${active.ref} → ${status}`);
      setActive(null);
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('admin.complaints', 'Complaints')}
      subtitle="Resolve disputes between customers, diaspora families and providers."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={counts.open} hint="Awaiting first response" icon="Inbox" tone="gold" />
        <StatCard label="Investigating" value={counts.investigating} hint="Coordinator assigned" icon="Search" tone="blue" />
        <StatCard label="Urgent" value={urgent} hint="Respond within 4 hours" icon="AlertTriangle" tone="red" />
        <StatCard label="Resolved" value={counts.resolved} hint="With written outcome" icon="CheckCircle2" tone="green" />
      </div>

      <div className="card card-pad mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <PillTabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'open', label: 'Open', count: counts.open },
              { key: 'investigating', label: 'Investigating', count: counts.investigating },
              { key: 'resolved', label: 'Resolved', count: counts.resolved },
              { key: 'all', label: t('common.all', 'All'), count: counts.all },
            ]}
          />
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reference, customer or subject"
              aria-label="Search complaints"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon="MessageSquareWarning" title="Nothing in this view" body="Switch tabs to review other complaints." />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((c) => (
            <article key={c.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gold-600">{c.ref}</span>
                    <StatusBadge status={c.status} />
                    <Badge tone={c.priority === 'urgent' ? 'red' : c.priority === 'normal' ? 'blue' : 'neutral'}>
                      {c.priority}
                    </Badge>
                    <Badge tone="neutral">{c.category}</Badge>
                  </div>
                  <p className="mt-1.5 font-display text-[15px] text-forest-900">{c.subject}</p>
                  <p className="mt-0.5 text-[11.5px] text-forest-500">
                    {c.customer_name}
                    {c.booking_ref ? ` · ${c.booking_ref}` : ''} · raised {relativeTime(c.created_at, lang)}
                  </p>
                  <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-forest-700">{c.message}</p>
                  {c.resolution && (
                    <p className="mt-2 rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest-700">
                      <span className="font-semibold">Resolution: </span>
                      {c.resolution}
                    </p>
                  )}
                </div>
                <button type="button" className="btn-outline btn-sm" onClick={() => openComplaint(c)}>
                  {c.status === 'resolved' ? 'Review' : 'Handle case'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Complaint case file"
        description={active?.ref}
        wide
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setActive(null)}>
              Close
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
              Save decision
            </button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <KeyValue label="Customer" value={active.customer_name} />
              <KeyValue label="Category" value={active.category} />
              <KeyValue label="Priority" value={active.priority} />
              <KeyValue label="Booking" value={active.booking_ref ?? 'Not linked'} />
              <KeyValue label="Raised" value={formatDateTime(active.created_at, lang)} />
              <KeyValue label="Last update" value={formatDateTime(active.updated_at, lang)} />
            </div>
            <div>
              <p className="kicker">Customer message</p>
              <p className="mt-1 rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-700">
                {active.message}
              </p>
            </div>
            <div>
              <span className="label">Case status</span>
              <SelectField value={status} onChange={(e) => setStatus(e.target.value as Complaint['status'])}>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </SelectField>
            </div>
            <div>
              <span className="label">Resolution / update for the customer</span>
              <TextArea
                rows={4}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Provider returned to fix the leak on 12 March; no further charge applied and RWF 5,000 credited."
              />
            </div>
            <p className="text-[11px] text-forest-500">Handled by {profile?.full_name ?? 'coordinator'}.</p>
          </div>
        )}
      </Modal>

      <section className="card card-pad mt-6">
        <SectionHeader title="Service standards" subtitle="Escalation ladder used by the operations desk." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'First response', body: 'Acknowledge every complaint within 2 working hours.' },
            { title: 'Resolution target', body: 'Urgent cases within 24 hours, standard cases within 3 days.' },
            { title: 'Provider escalation', body: 'Two unresolved complaints in 30 days suspends the provider listing.' },
          ].map((s) => (
            <div key={s.title} className="rounded-xl bg-forest-50/60 px-3.5 py-3">
              <p className="text-[12.5px] font-semibold text-forest-900">{s.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-forest-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
