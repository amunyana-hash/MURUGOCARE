import { useMemo, useState } from 'react';
import { Ban as Suspension, CheckCircle2, Search, ShieldCheck, ShieldX, XCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Avatar,
  Badge,
  EmptyState,
  KeyValue,
  Modal,
  PillTabs,
  SectionHeader,
  Stars,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Provider } from '../../lib/types';
import { publishNotification, updateRow } from '../../lib/db';
import { formatDate } from '../../lib/format';

type Tab = 'pending' | 'verified' | 'rejected' | 'suspended' | 'all';

export default function AdminProviders() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { order: { column: 'created_at', ascending: false } });

  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Provider | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const nav = adminNav(t as never, {
    pendingProviders: providers.filter((p) => p.verification_status === 'pending').length,
  });

  const counts = useMemo(
    () => ({
      pending: providers.filter((p) => p.verification_status === 'pending').length,
      verified: providers.filter((p) => p.verification_status === 'verified').length,
      rejected: providers.filter((p) => p.verification_status === 'rejected').length,
      suspended: providers.filter((p) => p.verification_status === 'suspended').length,
      all: providers.length,
    }),
    [providers],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      const inTab = tab === 'all' || p.verification_status === tab;
      const inQuery =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        p.business_name.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        p.category_slugs.join(' ').includes(q);
      return inTab && inQuery;
    });
  }, [providers, tab, query]);

  async function decide(p: Provider, status: Provider['verification_status']) {
    setBusy(true);
    try {
      await updateRow<Provider>('providers', p.id, {
        verification_status: status,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
      });
      await publishNotification({
        user_id: p.user_id ?? p.id,
        audience: 'provider',
        title:
          status === 'verified'
            ? 'Your account is verified'
            : status === 'rejected'
              ? 'Verification needs more information'
              : status === 'suspended'
                ? 'Account suspended'
                : 'Verification pending',
        body:
          status === 'verified'
            ? 'You can now receive verified-only jobs and appear first in customer search.'
            : reason.trim() ||
              'The coordinator team reviewed your documents. Update your verification page and resubmit.',
        kind: 'verification',
        link: '/provider/verification',
      });
      toast(
        status === 'verified' ? 'Provider verified' : status === 'rejected' ? 'Verification rejected' : 'Provider suspended',
        p.business_name,
      );
      setActive(null);
      setReason('');
    } catch (err) {
      toast('Action failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('admin.providers', 'Providers')}
      subtitle="Verify identity, certificates and service quality before a provider goes live."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'verified', label: 'Verified', count: counts.verified },
              { key: 'rejected', label: 'Rejected', count: counts.rejected },
              { key: 'suspended', label: 'Suspended', count: counts.suspended },
              { key: 'all', label: t('common.all', 'All'), count: counts.all },
            ]}
          />
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, business or sector"
              aria-label="Search providers"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon="ShieldCheck"
            title="No provider in this view"
            body="Switch tabs or clear the search to see other providers."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {visible.map((p) => (
            <article key={p.id} className="card card-pad">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-[15px] text-forest-900">{p.business_name}</p>
                    <StatusBadge status={p.verification_status} />
                    {p.available ? <Badge tone="green">Available</Badge> : <Badge tone="neutral">Booked</Badge>}
                  </div>
                  <p className="truncate text-[11.5px] text-forest-500">
                    {p.full_name} · {p.sector}, {p.district}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-forest-600">
                    <Stars rating={p.rating} size={11} />
                    <span>
                      {p.rating ? p.rating.toFixed(1) : 'New'} · {p.reviews_count} reviews · {p.jobs_completed} jobs
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.category_slugs.map((s) => (
                      <Badge key={s} tone="blue">
                        {s.replace(/-/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" className="btn-outline btn-sm" onClick={() => setActive(p)}>
                      Review documents
                    </button>
                    {p.verification_status !== 'verified' && (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => void decide(p, 'verified')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {p.verification_status === 'verified' && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-red-600"
                        disabled={busy}
                        onClick={() => void decide(p, 'suspended')}
                      >
                        <Suspension className="h-3.5 w-3.5" /> Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Provider verification file"
        description={active?.business_name}
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
              onClick={() => active && void decide(active, 'rejected')}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy}
              onClick={() => active && void decide(active, 'verified')}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Approve provider
            </button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <KeyValue label="Legal name" value={active.full_name} />
              <KeyValue label="Business" value={active.business_name} />
              <KeyValue label="ID document" value={active.id_document || 'Not provided'} />
              <KeyValue label="Certificate" value={active.certificate || 'Not provided'} />
              <KeyValue label="Experience" value={`${active.years_experience} years`} />
              <KeyValue label="Hourly rate" value={money(active.hourly_rate)} />
              <KeyValue label="Phone" value={active.phone || 'Not provided'} />
              <KeyValue label="Email" value={active.email || 'Not provided'} />
              <KeyValue label="Languages" value={(active.languages ?? []).join(', ') || 'Not provided'} />
              <KeyValue label="Applied" value={formatDate(active.created_at, lang)} />
            </div>
            <div>
              <p className="kicker">Professional summary</p>
              <p className="mt-1 rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-700">
                {active.bio}
              </p>
            </div>
            <div>
              <span className="label">Decision note to provider (optional)</span>
              <TextArea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what is missing, or thank them for a complete file."
              />
            </div>
            <p className="text-[11px] leading-relaxed text-forest-500">
              Reviewed by {profile?.full_name ?? 'coordinator'} · decisions are logged and sent to the provider's
              notification centre.
            </p>
          </div>
        )}
      </Modal>

      <section className="card card-pad mt-6">
        <SectionHeader title="Verification policy" subtitle="Applied consistently across every Bugesera provider." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Identity', body: 'National ID number must match the legal name and phone owner.' },
            { icon: ShieldX, title: 'Rejection', body: 'Blurred documents or mismatched certificates are rejected with a note.' },
            { icon: Suspension, title: 'Suspension', body: 'Two unresolved complaints within 30 days suspends the listing immediately.' },
          ].map((c) => (
            <div key={c.title} className="rounded-xl bg-forest-50/60 px-3.5 py-3">
              <c.icon className="h-4 w-4 text-forest-600" />
              <p className="mt-1.5 text-[12.5px] font-semibold text-forest-900">{c.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-forest-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
