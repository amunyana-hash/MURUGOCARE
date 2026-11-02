import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  BarChart,
  Badge,
  DonutChart,
  EmptyState,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../../components/ui';
import type { Booking, Complaint, Payment, Profile, Provider, Subscription } from '../../lib/types';
import { formatDate, relativeTime } from '../../lib/format';

export default function AdminOverview() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers');
  const { rows: bookings } = useRows<Booking>('bookings', { order: { column: 'created_at', ascending: false } });
  const { rows: payments } = useRows<Payment>('payments');
  const { rows: complaints } = useRows<Complaint>('complaints');
  const { rows: profiles } = useRows<Profile>('profiles');
  const { rows: subscriptions } = useRows<Subscription>('subscriptions');

  const pendingProviders = useMemo(() => providers.filter((p) => p.verification_status === 'pending'), [providers]);
  const openComplaints = useMemo(() => complaints.filter((c) => c.status !== 'resolved'), [complaints]);

  const revenue = useMemo(
    () => payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
    [payments],
  );
  const gmv = useMemo(() => bookings.reduce((s, b) => s + b.amount, 0), [bookings]);
  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'active' || s.status === 'trial'),
    [subscriptions],
  );

  const monthly = useMemo(() => {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(d.toLocaleDateString('en', { month: 'short' }), 0);
    }
    bookings.forEach((b) => {
      const label = new Date(b.created_at).toLocaleDateString('en', { month: 'short' });
      if (buckets.has(label)) buckets.set(label, (buckets.get(label) ?? 0) + b.amount);
    });
    return Array.from(buckets, ([label, value]) => ({ label, value }));
  }, [bookings]);

  const statusDonut = useMemo(() => {
    const palette: Record<string, string> = {
      pending: '#F0C24B',
      quoted: '#5B93C7',
      confirmed: '#2F7A5B',
      in_progress: '#C9A227',
      completed: '#1F5B44',
      cancelled: '#C05C5C',
    };
    const counts = new Map<string, number>();
    bookings.forEach((b) => counts.set(b.status, (counts.get(b.status) ?? 0) + 1));
    return Array.from(counts, ([label, value]) => ({ label: label.replace(/_/g, ' '), value, color: palette[label] ?? '#94A3B8' }));
  }, [bookings]);

  const nav = adminNav(t as never, {
    pendingProviders: pendingProviders.length,
    openComplaints: openComplaints.length,
  });

  const customers = profiles.filter((p) => p.role === 'customer');
  const diaspora = profiles.filter((p) => p.is_diaspora);

  return (
    <DashboardShell
      title={`${t('admin.welcome', 'Operations desk')}, ${profile?.full_name?.split(' ')[0] ?? 'Admin'}`}
      subtitle="Platform health across Bugesera: demand, supply, verification and money."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross booking value"
          value={money(gmv)}
          hint={`${bookings.length} bookings all time`}
          icon="TrendingUp"
          tone="green"
          trend={{ value: '+18% vs last month', positive: true }}
        />
        <StatCard
          label="Collected"
          value={money(revenue)}
          hint={`${payments.filter((p) => p.status === 'succeeded').length} successful payments`}
          icon="Wallet"
          tone="blue"
        />
        <StatCard
          label="Pending verifications"
          value={pendingProviders.length}
          hint="Awaiting coordinator review"
          icon="ShieldAlert"
          tone="gold"
        />
        <StatCard
          label="Open complaints"
          value={openComplaints.length}
          hint={`${complaints.length} raised in total`}
          icon="MessageSquareWarning"
          tone="red"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <section className="card card-pad">
          <SectionHeader title="Booking value by month" subtitle="All service categories, RWF." />
          <BarChart data={monthly} unit="RWF" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-forest-50/60 px-3 py-2">
              <p className="kicker">Customers</p>
              <p className="mt-0.5 font-display text-lg text-forest-900">{customers.length}</p>
            </div>
            <div className="rounded-xl bg-forest-50/60 px-3 py-2">
              <p className="kicker">Diaspora</p>
              <p className="mt-0.5 font-display text-lg text-forest-900">{diaspora.length}</p>
            </div>
            <div className="rounded-xl bg-forest-50/60 px-3 py-2">
              <p className="kicker">Providers</p>
              <p className="mt-0.5 font-display text-lg text-forest-900">{providers.length}</p>
            </div>
            <div className="rounded-xl bg-forest-50/60 px-3 py-2">
              <p className="kicker">Subscriptions</p>
              <p className="mt-0.5 font-display text-lg text-forest-900">{activeSubs.length}</p>
            </div>
          </div>
        </section>

        <section className="card card-pad">
          <SectionHeader title="Booking pipeline" subtitle="Where requests currently sit." />
          {statusDonut.length ? (
            <DonutChart data={statusDonut} />
          ) : (
            <EmptyState icon="PieChart" title="No bookings yet" body="Bookings will appear here as customers request services." />
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card card-pad">
          <SectionHeader
            title="Verification queue"
            subtitle="Providers waiting for approval before they can be featured."
            action={
              <Link to="/admin/providers" className="btn-outline btn-sm">
                Open queue <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {pendingProviders.length === 0 ? (
            <EmptyState icon="ShieldCheck" title="Queue is clear" body="Every provider has been reviewed." />
          ) : (
            <ul className="divide-y divide-forest-50">
              {pendingProviders.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-forest-900">{p.business_name}</p>
                    <p className="truncate text-[11px] text-forest-500">
                      {p.full_name} · {p.sector} · {p.years_experience} yrs
                    </p>
                  </div>
                  <Badge tone="amber">Pending</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-pad">
          <SectionHeader
            title="Recent bookings"
            subtitle="Latest demand across the district."
            action={
              <Link to="/admin/bookings" className="btn-outline btn-sm">
                All bookings <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {bookings.length === 0 ? (
            <EmptyState icon="ClipboardList" title="No bookings" body="New requests will show up here." />
          ) : (
            <ul className="divide-y divide-forest-50">
              {bookings.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-forest-900">
                      {b.ref} · {b.category_name}
                    </p>
                    <p className="truncate text-[11px] text-forest-500">
                      {b.customer_name} · {formatDate(b.scheduled_date, lang)} · {money(b.amount)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {openComplaints.length > 0 && (
        <section className="card card-pad mt-6">
          <SectionHeader
            title="Escalations needing a decision"
            subtitle="Complaints older than 24 hours are escalated to the district coordinator."
            action={
              <Link to="/admin/complaints" className="btn-outline btn-sm">
                Manage <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-forest-50">
            {openComplaints.slice(0, 4).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-forest-900">
                    <ShieldAlert className="mr-1 inline h-3 w-3 text-red-500" />
                    {c.subject}
                  </p>
                  <p className="truncate text-[11px] text-forest-500">
                    {c.customer_name} · {relativeTime(c.created_at, lang)} · {c.priority} priority
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </DashboardShell>
  );
}
