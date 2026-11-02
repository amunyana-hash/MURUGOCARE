import { useMemo, useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
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
  Pagination,
  PillTabs,
  SectionHeader,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking } from '../../lib/types';
import { publishNotification, updateRow } from '../../lib/db';
import { formatDate, formatDateTime } from '../../lib/format';

type Tab = 'all' | Booking['status'];

const PAGE_SIZE = 12;

export default function AdminBookings() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();

  const { rows: bookings } = useRows<Booking>('bookings', { order: { column: 'created_at', ascending: false } });

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Booking | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const nav = adminNav(t as never);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: bookings.length };
    bookings.forEach((b) => {
      map[b.status] = (map[b.status] ?? 0) + 1;
    });
    return map;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      const inTab = tab === 'all' || b.status === tab;
      const inQuery =
        !q ||
        b.ref.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.category_name.toLowerCase().includes(q) ||
        (b.provider_name ?? '').toLowerCase().includes(q);
      return inTab && inQuery;
    });
  }, [bookings, tab, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function setStatus(booking: Booking, status: Booking['status']) {
    setBusy(true);
    try {
      await updateRow<Booking>('bookings', booking.id, { status });
      await publishNotification({
        user_id: booking.customer_id,
        audience: 'customer',
        title:
          status === 'confirmed'
            ? 'Booking confirmed by coordinator'
            : status === 'cancelled'
              ? 'Booking cancelled'
              : `Booking updated: ${status.replace('_', ' ')}`,
        body: note.trim() || `Reference ${booking.ref} was updated by the URUGOCARE operations desk.`,
        kind: 'booking',
        link: `/dashboard/bookings/${booking.id}`,
      });
      if (booking.provider_id) {
        await publishNotification({
          user_id: booking.provider_id,
          audience: 'provider',
          title: `Job ${status.replace('_', ' ')}`,
          body: `Reference ${booking.ref} (${booking.category_name}) changed to ${status.replace('_', ' ')}.`,
          kind: 'booking',
          link: `/provider/jobs/${booking.id}`,
        });
      }
      toast('Booking updated', `${booking.ref} → ${status.replace('_', ' ')}`);
      setActive(null);
      setNote('');
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('admin.bookings', 'Bookings')}
      subtitle="Every service request in the district, with coordinator override."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-3">
          <PillTabs<Tab>
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
            tabs={[
              { key: 'all', label: t('common.all', 'All'), count: counts.all ?? 0 },
              { key: 'pending', label: 'Pending', count: counts.pending ?? 0 },
              { key: 'quoted', label: 'Quoted', count: counts.quoted ?? 0 },
              { key: 'confirmed', label: 'Confirmed', count: counts.confirmed ?? 0 },
              { key: 'in_progress', label: 'In progress', count: counts.in_progress ?? 0 },
              { key: 'completed', label: 'Completed', count: counts.completed ?? 0 },
              { key: 'cancelled', label: 'Cancelled', count: counts.cancelled ?? 0 },
            ]}
          />
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <TextInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Ref, customer, provider or service"
              aria-label="Search bookings"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon="ClipboardList" title="No booking matches" body="Change the filter or clear the search." />
        </div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12.5px]">
              <thead className="bg-forest-50/70 text-[11px] uppercase tracking-wide text-forest-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Reference</th>
                  <th className="px-4 py-2.5 font-semibold">Service</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Provider</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr key={b.id} className="border-t border-forest-50">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-forest-800">{b.ref}</span>
                      {b.for_family && (
                        <span className="ml-1.5">
                          <Badge tone="blue">Diaspora</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-forest-700">{b.category_name}</td>
                    <td className="px-4 py-2.5 text-forest-700">{b.customer_name}</td>
                    <td className="px-4 py-2.5 text-forest-600">{b.provider_name ?? 'Unassigned'}</td>
                    <td className="px-4 py-2.5 text-forest-600">{formatDate(b.scheduled_date, lang)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-forest-900">{money(b.amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="text-[11.5px] font-semibold text-forest-700 underline decoration-forest-300 underline-offset-2 hover:text-forest-900"
                        onClick={() => {
                          setActive(b);
                          setNote('');
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={current} pageCount={pageCount} onPage={setPage} />

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Booking control"
        description={active?.ref}
        wide
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setActive(null)}>
              Close
            </button>
            <button
              type="button"
              className="btn-outline btn-sm text-red-600"
              disabled={busy}
              onClick={() => active && void setStatus(active, 'cancelled')}
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy}
              onClick={() => active && void setStatus(active, 'confirmed')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
            </button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <KeyValue label="Service" value={active.category_name} />
              <KeyValue label="Status" value={<StatusBadge status={active.status} />} />
              <KeyValue label="Customer" value={active.customer_name} />
              <KeyValue label="Provider" value={active.provider_name ?? 'Unassigned'} />
              <KeyValue label="Scheduled" value={`${formatDate(active.scheduled_date, lang)} · ${active.time_slot}`} />
              <KeyValue label="Amount" value={money(active.amount)} />
              <KeyValue label="Payment" value={<StatusBadge status={active.payment_status} />} />
              <KeyValue label="Created" value={formatDateTime(active.created_at, lang)} />
              <KeyValue label="Address" value={`${active.address}, ${active.sector}`} />
              <KeyValue label="Family request" value={active.for_family ? 'Yes — diaspora managed' : 'No'} />
            </div>
            {active.notes && (
              <div>
                <p className="kicker">Customer notes</p>
                <p className="mt-1 rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-700">
                  {active.notes}
                </p>
              </div>
            )}
            {active.completion_report && (
              <div>
                <p className="kicker">Completion report</p>
                <p className="mt-1 rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-700">
                  {active.completion_report}
                </p>
              </div>
            )}
            <div>
              <span className="label">Message sent with the decision</span>
              <TextArea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain the change so the customer and provider know what happens next."
              />
            </div>
            <p className="text-[11px] text-forest-500">Action recorded by {profile?.full_name ?? 'coordinator'}.</p>
          </div>
        )}
      </Modal>

      <section className="card card-pad mt-6">
        <SectionHeader title="Dispatch guidance" subtitle="How the desk keeps Bugesera bookings on schedule." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Unassigned after 12h', body: 'Confirm with the customer and dispatch the nearest verified provider.' },
            { title: 'No quotation in 24h', body: 'Call the top three providers in that category and request a price.' },
            { title: 'Cancellation', body: 'Refund any successful payment and notify the assigned provider immediately.' },
          ].map((c) => (
            <div key={c.title} className="rounded-xl bg-forest-50/60 px-3.5 py-3">
              <p className="text-[12.5px] font-semibold text-forest-900">{c.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-forest-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
