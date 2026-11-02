import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareWarning, Plus } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  EmptyState,
  Field,
  Modal,
  PillTabs,
  SectionHeader,
  SelectField,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking, Complaint } from '../../lib/types';
import { insertRow, publishNotification, updateRow } from '../../lib/db';
import { formatDate, formatDateTime, makeRef, uid } from '../../lib/format';

type Filter = 'all' | 'open' | 'investigating' | 'resolved';

const categories = [
  'Service quality',
  'Late or no arrival',
  'Damaged property',
  'Payment or refund',
  'Provider conduct',
  'Other',
];

export default function Complaints() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = usePrefs();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');
  const [bookingId, setBookingId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customerId = profile?.id ?? '__none__';
  const { rows: complaints } = useRows<Complaint>('complaints', {
    where: { customer_id: customerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: bookings } = useRows<Booking>('bookings', {
    where: { customer_id: customerId },
    order: { column: 'created_at', ascending: false },
  });

  const visible = useMemo(
    () => (filter === 'all' ? complaints : complaints.filter((c) => c.status === filter)),
    [complaints, filter],
  );

  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);

  function reset() {
    setSubject('');
    setMessage('');
    setCategory(categories[0]);
    setPriority('normal');
    setBookingId('');
    setErrors({});
  }

  async function submit() {
    if (!profile) return;
    const next: Record<string, string> = {};
    if (subject.trim().length < 5) next.subject = 'Add a short subject (5+ characters).';
    if (message.trim().length < 20) next.message = 'Describe the issue in at least 20 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const linked = bookings.find((b) => b.id === bookingId);
      await insertRow('complaints', {
        id: uid(),
        ref: makeRef('CMP'),
        customer_id: profile.id,
        customer_name: profile.full_name,
        booking_id: linked?.id ?? null,
        booking_ref: linked?.ref ?? null,
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        status: 'open',
        resolution: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await publishNotification({
        user_id: 'u-admin-1',
        audience: 'admin',
        title: `New complaint · ${subject.trim().slice(0, 50)}`,
        body: `${profile.full_name} filed a ${priority} complaint (${category})${linked ? ` about ${linked.ref}` : ''}.`,
        kind: 'complaint',
        link: '/admin/complaints',
      });
      await publishNotification({
        user_id: profile.id,
        audience: 'customer',
        title: 'Complaint received',
        body: 'Our coordinator reviews every case within one working day and replies in writing.',
        kind: 'complaint',
        link: '/dashboard/complaints',
      });
      toast('Complaint submitted', 'You will receive a written reply within one working day.');
      setOpen(false);
      reset();
    } catch (err) {
      toast('Complaint not saved', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function reopen(c: Complaint) {
    await updateRow<Complaint>('complaints', c.id, { status: 'open', updated_at: new Date().toISOString() });
    toast('Case reopened', `${c.ref} is back with our team.`);
  }

  return (
    <DashboardShell
      title={t('dash.complaints', 'Complaints')}
      subtitle="Report a problem with a visit, a payment or a provider. Every case gets a written reply."
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card card-pad">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-forest-600">Open cases</p>
          <p className="stat-value mt-2">{complaints.filter((c) => c.status === 'open').length}</p>
          <p className="mt-1 text-xs text-forest-500">Awaiting first review</p>
        </div>
        <div className="card card-pad">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-forest-600">Under investigation</p>
          <p className="stat-value mt-2">{complaints.filter((c) => c.status === 'investigating').length}</p>
          <p className="mt-1 text-xs text-forest-500">Coordinator is following up</p>
        </div>
        <div className="card card-pad">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-forest-600">Resolved</p>
          <p className="stat-value mt-2">{complaints.filter((c) => c.status === 'resolved').length}</p>
          <p className="mt-1 text-xs text-forest-500">Closed with a written outcome</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <PillTabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'all', label: t('common.all', 'All'), count: complaints.length },
            { key: 'open', label: t('common.open', 'Open'), count: complaints.filter((c) => c.status === 'open').length },
            {
              key: 'investigating',
              label: 'Investigating',
              count: complaints.filter((c) => c.status === 'investigating').length,
            },
            { key: 'resolved', label: t('common.resolved', 'Resolved'), count: complaints.filter((c) => c.status === 'resolved').length },
          ]}
        />
        <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New complaint
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="MessageSquareWarning"
            title={complaints.length ? 'No case in this tab' : 'No complaints filed'}
            body={
              complaints.length
                ? 'Switch tabs to see your other cases.'
                : 'If a visit was late, incomplete or below standard, file a case here and we investigate with the provider.'
            }
            action={
              <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}>
                File a complaint
              </button>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((c) => (
            <li key={c.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-forest-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-forest-700">
                      {c.ref}
                    </span>
                    <StatusBadge status={c.status} />
                    <StatusBadge status={c.priority} />
                    <span className="chip">{c.category}</span>
                  </div>
                  <p className="mt-2 font-display text-lg text-forest-900">{c.subject}</p>
                  <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-forest-700">{c.message}</p>
                  <p className="mt-1.5 text-[11px] text-forest-500">
                    Filed {formatDateTime(c.created_at, lang)}
                    {c.booking_ref ? ` · linked booking ${c.booking_ref}` : ' · no booking linked'}
                  </p>
                  {c.resolution && (
                    <div className="mt-3 rounded-xl bg-forest-50 px-3.5 py-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-forest-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolution
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-forest-800">{c.resolution}</p>
                      <p className="mt-1 text-[11px] text-forest-500">Updated {formatDate(c.updated_at, lang)}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {c.booking_id && (
                    <Link to={`/dashboard/bookings/${c.booking_id}`} className="btn-outline btn-sm">
                      View booking
                    </Link>
                  )}
                  {c.status === 'resolved' && (
                    <button type="button" className="btn-ghost btn-sm" onClick={() => void reopen(c)}>
                      <AlertTriangle className="h-3.5 w-3.5" /> Reopen case
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 card card-pad">
        <SectionHeader
          title="How complaints are handled"
          subtitle="We aim to close every case within three working days."
        />
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { step: '1', title: 'You file the case', body: 'Attach the booking and tell us what went wrong.' },
            { step: '2', title: 'We investigate', body: 'The coordinator contacts the provider and reviews evidence.' },
            { step: '3', title: 'Written outcome', body: 'You receive the resolution, refund or re-visit plan in the app.' },
          ].map((s) => (
            <li key={s.step} className="rounded-xl border border-forest-100 p-3.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-800 text-[12px] font-bold text-white">
                {s.step}
              </span>
              <p className="mt-2 text-[13px] font-semibold text-forest-900">{s.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-forest-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="File a complaint"
        description="Give us enough detail to act quickly."
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareWarning className="h-4 w-4" />}
              {t('common.submit', 'Submit complaint')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('complaint.subject', 'Subject')} required error={errors.subject} htmlFor="cmp-subject">
            <TextInput
              id="cmp-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              invalid={Boolean(errors.subject)}
              placeholder="e.g. Kitchen was not cleaned on 12 March"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('complaint.category', 'Category')} htmlFor="cmp-cat">
              <SelectField id="cmp-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label={t('complaint.priority', 'Priority')} htmlFor="cmp-priority">
              <SelectField
                id="cmp-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'urgent')}
              >
                <option value="low">Low — general feedback</option>
                <option value="normal">Normal — needs a fix this week</option>
                <option value="urgent">Urgent — safety or damage</option>
              </SelectField>
            </Field>
          </div>
          <Field label={t('complaint.linkBooking', 'Link a booking (optional)')} htmlFor="cmp-booking">
            <SelectField id="cmp-booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">No linked booking</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.ref} — {b.category_name} ({formatDate(b.scheduled_date, lang)})
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label={t('complaint.message', 'What happened?')} required error={errors.message} htmlFor="cmp-message">
            <TextArea
              id="cmp-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              invalid={Boolean(errors.message)}
              placeholder="Tell us what happened, when, and what outcome you expect."
            />
          </Field>
          <p className="text-[11.5px] leading-relaxed text-forest-500">
            Cases marked urgent are escalated to the district coordinator immediately. False reports can suspend an
            account.
          </p>
        </div>
      </Modal>
    </DashboardShell>
  );
}
