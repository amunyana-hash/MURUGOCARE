import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, MapPin, Search, Send, ShieldAlert } from 'lucide-react';
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
  SelectField,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking, Category, Provider, Quotation } from '../../lib/types';
import { insertRow, publishNotification, updateRow } from '../../lib/db';
import { formatDate, uid } from '../../lib/format';

type Tab = 'all' | 'mine' | 'family';

export default function ProviderMarketplace() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];
  const providerId = provider?.id ?? '__none__';

  const { rows: openJobs } = useRows<Booking>('bookings', {
    where: { status: 'pending' },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: quotes } = useRows<Quotation>('quotations', { where: { provider_id: providerId } });
  const { rows: categories } = useRows<Category>('categories');

  const [tab, setTab] = useState<Tab>('all');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<Booking | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState('2');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const nav = providerNav(t as never);
  const quotedIds = useMemo(() => new Set(quotes.map((q) => q.booking_id)), [quotes]);
  const myCategories = provider?.category_slugs ?? [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return openJobs.filter((j) => {
      if (tab === 'mine' && !myCategories.includes(j.category_slug)) return false;
      if (tab === 'family' && !j.for_family) return false;
      if (category && j.category_slug !== category) return false;
      if (!q) return true;
      return (
        j.ref.toLowerCase().includes(q) ||
        j.category_name.toLowerCase().includes(q) ||
        j.sector.toLowerCase().includes(q) ||
        (j.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [openJobs, tab, category, query, myCategories]);

  function openQuote(job: Booking) {
    const existing = quotes.find((q) => q.booking_id === job.id);
    setTarget(job);
    setAmount(existing ? String(existing.amount) : String(job.amount));
    setMessage(existing?.message ?? '');
    setEta(String(existing?.eta_days ?? 2));
    setErrors({});
  }

  async function sendQuote() {
    if (!target || !provider) return;
    const value = Number(amount);
    const next: Record<string, string> = {};
    if (!amount || Number.isNaN(value) || value < 1000) next.amount = 'Enter at least RWF 1,000.';
    if (message.trim().length < 15) next.message = 'Describe what is included (15+ characters).';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const existing = quotes.find((q) => q.booking_id === target.id);
      if (existing) {
        await updateRow<Quotation>('quotations', existing.id, {
          amount: value,
          message: message.trim(),
          eta_days: Number(eta) || 1,
          status: 'pending',
        });
      } else {
        await insertRow('quotations', {
          id: uid(),
          booking_id: target.id,
          booking_ref: target.ref,
          provider_id: provider.id,
          provider_name: provider.full_name,
          amount: value,
          message: message.trim(),
          eta_days: Number(eta) || 1,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
      await updateRow<Booking>('bookings', target.id, { status: 'quoted' });
      await publishNotification({
        user_id: target.customer_id,
        audience: 'customer',
        title: 'New quotation received',
        body: `${provider.full_name} quoted ${money(value)} for ${target.category_name} (${target.ref}).`,
        kind: 'booking',
        link: `/dashboard/bookings/${target.id}`,
      });
      toast('Quotation sent', `${money(value)} for ${target.ref}`);
      setTarget(null);
    } catch (err) {
      toast('Quotation not sent', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('provider.jobsAvailable', 'Marketplace')}
      subtitle="Open customer requests in Bugesera District. Quote to win the job."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      {provider && provider.verification_status !== 'verified' && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
            <div>
              <p className="text-[13px] font-semibold text-forest-900">Verification required before winning jobs</p>
              <p className="mt-0.5 text-[12px] text-forest-600">
                You can send quotations, but customers only see verified providers as eligible for confirmation.
              </p>
            </div>
          </div>
          <Link to="/provider/verification" className="btn-primary btn-sm">
            Complete verification
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card card-pad">
          <p className="kicker">Open requests</p>
          <p className="stat-value mt-2">{openJobs.length}</p>
          <p className="mt-1 text-[11.5px] text-forest-500">Waiting for quotations</p>
        </div>
        <div className="card card-pad">
          <p className="kicker">In my categories</p>
          <p className="stat-value mt-2">{openJobs.filter((j) => myCategories.includes(j.category_slug)).length}</p>
          <p className="mt-1 text-[11.5px] text-forest-500">Matching your skills</p>
        </div>
        <div className="card card-pad">
          <p className="kicker">Quotes I sent</p>
          <p className="stat-value mt-2">{quotes.length}</p>
          <p className="mt-1 text-[11.5px] text-forest-500">{quotes.filter((q) => q.status === 'accepted').length} accepted</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <PillTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'all', label: t('common.all', 'All'), count: openJobs.length },
            { key: 'mine', label: 'My categories', count: openJobs.filter((j) => myCategories.includes(j.category_slug)).length },
            { key: 'family', label: 'Diaspora', count: openJobs.filter((j) => j.for_family).length },
          ]}
        />
        <div className="ml-auto flex w-full max-w-xl gap-2">
          <SelectField value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name_en}
              </option>
            ))}
          </SelectField>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <TextInput
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search', 'Search requests')}
              aria-label="Search open requests"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="Search"
            title={openJobs.length ? 'No request matches' : 'No open request right now'}
            body={
              openJobs.length
                ? 'Adjust the category filter or clear your search.'
                : 'New customer requests appear here immediately. Check back soon.'
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {visible.map((j) => (
            <article key={j.id} className="card card-pad flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gold-600">{j.ref}</span>
                    {myCategories.includes(j.category_slug) && <Badge tone="green">Your skill</Badge>}
                    {j.for_family && <Badge tone="blue">Diaspora</Badge>}
                    {j.photo_report_requested && <Badge tone="gold">Photo report</Badge>}
                  </div>
                  <h3 className="mt-1.5 font-display text-lg text-forest-900">{j.category_name}</h3>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-forest-500">
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="h-3 w-3" /> {formatDate(j.scheduled_date, lang)} · {j.time_slot}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {j.sector}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-forest-900">{money(j.amount)}</p>
                  <p className="text-[10.5px] uppercase tracking-wide text-forest-400">Guide price</p>
                </div>
              </div>

              {j.notes && <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-forest-600">{j.notes}</p>}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-forest-50 pt-3">
                <StatusBadge status={j.status} />
                <div className="flex gap-1.5">
                  <Link to={`/provider/jobs/${j.id}`} className="btn-ghost btn-sm">
                    Details
                  </Link>
                  <button type="button" className="btn-primary btn-sm" onClick={() => openQuote(j)}>
                    <Send className="h-3.5 w-3.5" /> {quotedIds.has(j.id) ? 'Revise quote' : 'Quote'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Send a quotation"
        description={target ? `${target.ref} · ${target.category_name} · ${target.sector}` : undefined}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setTarget(null)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void sendQuote()}>
              <Send className="h-4 w-4" /> Send quotation
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (RWF)" required error={errors.amount} htmlFor="mk-amount">
            <TextInput
              id="mk-amount"
              type="number"
              min={1000}
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              invalid={Boolean(errors.amount)}
            />
          </Field>
          <Field label="Delivery time (days)" htmlFor="mk-eta">
            <TextInput id="mk-eta" type="number" min={1} max={60} value={eta} onChange={(e) => setEta(e.target.value)} />
          </Field>
          <Field label="What is included" required error={errors.message} htmlFor="mk-msg">
            <TextArea
              id="mk-msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              invalid={Boolean(errors.message)}
              placeholder="Labour, transport, materials and post-service cleanup."
            />
          </Field>
          {target && (
            <div className="rounded-xl bg-forest-50/70 px-4 py-3 text-[11.5px] leading-relaxed text-forest-700">
              Customer guide price: <span className="font-semibold">{money(target.amount)}</span>. Quoting far above or
              below may reduce your chance of being accepted.
            </div>
          )}
        </div>
      </Modal>
    </DashboardShell>
  );
}
