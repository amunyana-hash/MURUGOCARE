import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  PillTabs,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking, Provider, Quotation } from '../../lib/types';
import { removeRow, updateRow } from '../../lib/db';
import { formatDate, formatDateTime } from '../../lib/format';

type Tab = 'pending' | 'accepted' | 'declined' | 'all';

export default function ProviderQuotations() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const providerId = providers[0]?.id ?? '__none__';

  const { rows: quotes } = useRows<Quotation>('quotations', {
    where: { provider_id: providerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: bookings } = useRows<Booking>('bookings', { where: { provider_id: providerId } });

  const [tab, setTab] = useState<Tab>('pending');
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState('2');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const nav = providerNav(t as never);

  const counts = useMemo(
    () => ({
      pending: quotes.filter((q) => q.status === 'pending').length,
      accepted: quotes.filter((q) => q.status === 'accepted').length,
      declined: quotes.filter((q) => q.status === 'declined').length,
      all: quotes.length,
    }),
    [quotes],
  );

  const visible = useMemo(
    () => (tab === 'all' ? quotes : quotes.filter((q) => q.status === tab)),
    [quotes, tab],
  );

  const bookedByRef = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach((b) => map.set(b.ref, b));
    return map;
  }, [bookings]);

  const winRate = quotes.length ? Math.round((counts.accepted / quotes.length) * 100) : 0;

  function openEdit(q: Quotation) {
    setEditing(q);
    setAmount(String(q.amount));
    setMessage(q.message);
    setEta(String(q.eta_days));
    setErrors({});
  }

  async function save() {
    if (!editing) return;
    const value = Number(amount);
    const next: Record<string, string> = {};
    if (!amount || Number.isNaN(value) || value < 1000) next.amount = 'Enter at least RWF 1,000.';
    if (message.trim().length < 15) next.message = 'Describe what is included (15+ characters).';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await updateRow<Quotation>('quotations', editing.id, {
        amount: value,
        message: message.trim(),
        eta_days: Number(eta) || 1,
      });
      toast('Quotation updated', `${editing.booking_ref} · ${money(value)}`);
      setEditing(null);
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(q: Quotation) {
    setBusy(true);
    try {
      await removeRow('quotations', q.id);
      toast('Quotation withdrawn', q.booking_ref);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('provider.quotations', 'Quotations')}
      subtitle="Every price you sent, and where it stands with the customer."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Awaiting decision', value: counts.pending, hint: 'Customers reviewing' },
          { label: 'Accepted', value: counts.accepted, hint: 'Converted to jobs' },
          { label: 'Declined', value: counts.declined, hint: 'Not selected' },
          { label: 'Win rate', value: `${winRate}%`, hint: `${quotes.length} quotations sent` },
        ].map((s) => (
          <div key={s.label} className="card card-pad">
            <p className="kicker">{s.label}</p>
            <p className="stat-value mt-2">{s.value}</p>
            <p className="mt-1 text-[11.5px] text-forest-500">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PillTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'accepted', label: 'Accepted', count: counts.accepted },
            { key: 'declined', label: 'Declined', count: counts.declined },
            { key: 'all', label: t('common.all', 'All'), count: counts.all },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="FileText"
            title={quotes.length ? 'Nothing here' : 'No quotation yet'}
            body={
              quotes.length
                ? 'Switch tabs to review your other quotations.'
                : 'Browse the marketplace and quote on open requests to start winning jobs.'
            }
            action={
              <Link to="/provider/marketplace" className="btn-primary btn-sm">
                Go to marketplace
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((q) => {
            const booking = bookedByRef.get(q.booking_ref);
            return (
              <article key={q.id} className="card card-pad">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-gold-600">{q.booking_ref}</span>
                      <StatusBadge status={q.status} />
                      {booking && <Badge tone="neutral">{booking.category_name}</Badge>}
                      {booking?.for_family && <Badge tone="blue">Diaspora</Badge>}
                    </div>
                    <p className="mt-1.5 font-display text-lg text-forest-900">{money(q.amount)}</p>
                    <p className="mt-0.5 text-[11.5px] text-forest-500">
                      ETA {q.eta_days} day(s) · sent {formatDateTime(q.created_at, lang)}
                      {booking ? ` · visit ${formatDate(booking.scheduled_date, lang)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {booking && (
                      <Link to={`/provider/jobs/${booking.id}`} className="btn-outline btn-sm">
                        Open job
                      </Link>
                    )}
                    {q.status === 'pending' && (
                      <>
                        <button type="button" className="btn-primary btn-sm" onClick={() => openEdit(q)}>
                          <Send className="h-3.5 w-3.5" /> Revise
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-red-600"
                          aria-label="Withdraw quotation"
                          disabled={busy}
                          onClick={() => void withdraw(q)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-2 rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-700">
                  {q.message}
                </p>
                {q.status === 'accepted' && (
                  <p className="mt-2 text-[11.5px] font-semibold text-forest-700">
                    Accepted — this quotation is now a confirmed job.
                  </p>
                )}
                {q.status === 'declined' && (
                  <p className="mt-2 text-[11.5px] text-forest-500">
                    The customer chose another provider. Revising the price is not possible after a decision.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Revise quotation"
        description={editing?.booking_ref}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(null)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
              {t('common.save', 'Save changes')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (RWF)" required error={errors.amount} htmlFor="pq-amount">
            <TextInput
              id="pq-amount"
              type="number"
              min={1000}
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              invalid={Boolean(errors.amount)}
            />
          </Field>
          <Field label="Delivery time (days)" htmlFor="pq-eta">
            <TextInput id="pq-eta" type="number" min={1} max={60} value={eta} onChange={(e) => setEta(e.target.value)} />
          </Field>
          <Field label="What is included" required error={errors.message} htmlFor="pq-msg">
            <TextArea
              id="pq-msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              invalid={Boolean(errors.message)}
            />
          </Field>
        </div>
      </Modal>
    </DashboardShell>
  );
}
