import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CalendarCheck, MapPin, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Badge, EmptyState, PillTabs, StatusBadge, TextInput } from '../../components/ui';
import type { Booking, Provider, Quotation } from '../../lib/types';
import { formatDate } from '../../lib/format';

type Tab = 'active' | 'completed' | 'all';

export default function ProviderJobs() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const providerId = providers[0]?.id ?? '__none__';

  const { rows: jobs } = useRows<Booking>('bookings', {
    where: { provider_id: providerId },
    order: { column: 'scheduled_date', ascending: false },
  });
  const { rows: quotes } = useRows<Quotation>('quotations', { where: { provider_id: providerId } });

  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const nav = providerNav(t as never);

  const quotesByBooking = useMemo(() => {
    const map = new Map<string, Quotation>();
    quotes.forEach((q) => map.set(q.booking_id, q));
    return map;
  }, [quotes]);

  const counts = useMemo(() => {
    const active = jobs.filter((j) => ['pending', 'quoted', 'confirmed', 'in_progress'].includes(j.status)).length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    return { active, completed, all: jobs.length };
  }, [jobs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (tab === 'active' && !['pending', 'quoted', 'confirmed', 'in_progress'].includes(j.status)) return false;
      if (tab === 'completed' && j.status !== 'completed') return false;
      if (!q) return true;
      return (
        j.ref.toLowerCase().includes(q) ||
        j.category_name.toLowerCase().includes(q) ||
        j.customer_name.toLowerCase().includes(q) ||
        j.sector.toLowerCase().includes(q)
      );
    });
  }, [jobs, tab, query]);

  return (
    <DashboardShell
      title={t('provider.myJobs', 'My jobs')}
      subtitle="Every job you have won, with schedule, customer and payment status."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'completed', label: 'Completed', count: counts.completed },
            { key: 'all', label: t('common.all', 'All'), count: counts.all },
          ]}
        />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <TextInput
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search', 'Search by ref, service or customer')}
            aria-label="Search jobs"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="Briefcase"
            title={jobs.length ? 'Nothing in this tab' : 'No job yet'}
            body={
              jobs.length
                ? 'Switch tabs or clear your search to see other jobs.'
                : 'Quote on open requests in the marketplace — accepted quotes become jobs here.'
            }
            action={
              <Link to="/provider/marketplace" className="btn-primary btn-sm">
                Browse marketplace
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((j) => {
            const quote = quotesByBooking.get(j.id);
            return (
              <article key={j.id} className="card card-pad">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-gold-600">{j.ref}</span>
                      <StatusBadge status={j.status} />
                      <StatusBadge status={j.payment_status} />
                      {j.for_family && <Badge tone="blue">Diaspora</Badge>}
                    </div>
                    <h3 className="mt-1.5 font-display text-lg text-forest-900">{j.category_name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-forest-500">
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" /> {formatDate(j.scheduled_date, lang)} · {j.time_slot}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {j.sector}, {j.district}
                      </span>
                      <span>{j.customer_name}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-forest-900">{money(j.amount)}</p>
                    {quote && (
                      <p className="text-[11px] text-forest-500">
                        Quote {quote.status} · {money(quote.amount)}
                      </p>
                    )}
                  </div>
                </div>
                {j.notes && <p className="mt-2 text-[12px] leading-relaxed text-forest-600">{j.notes}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-forest-50 pt-3">
                  <Link to={`/provider/jobs/${j.id}`} className="btn-primary btn-sm">
                    Open job
                  </Link>
                  {j.status === 'in_progress' && (
                    <Link to={`/provider/jobs/${j.id}`} className="btn-gold btn-sm">
                      Submit completion report
                    </Link>
                  )}
                  {quote && (
                    <Link to="/provider/quotations" className="btn-outline btn-sm">
                      Manage quotation
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-forest-50/70 px-4 py-3 text-[12px] leading-relaxed text-forest-700">
        <span className="font-semibold">Reminder:</span> update job status from the job page as soon as you arrive and
        finish. Customers abroad rely on the timeline to know the visit happened.
      </div>
    </DashboardShell>
  );
}
