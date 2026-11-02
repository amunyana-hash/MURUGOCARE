import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Wallet } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { BarChart, Badge, EmptyState, KeyValue, PillTabs, SectionHeader, StatCard } from '../../components/ui';
import type { Booking, Provider } from '../../lib/types';
import { formatDate } from '../../lib/format';

type Tab = 'all' | 'paid' | 'pending';

const PLATFORM_FEE = 0.12;

export default function ProviderEarnings() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];

  const { rows: bookings } = useRows<Booking>('bookings', {
    where: { provider_id: provider?.id ?? '__none__' },
    order: { column: 'scheduled_date', ascending: false },
  });

  const [tab, setTab] = useState<Tab>('all');

  const stats = useMemo(() => {
    const paid = bookings.filter((b) => b.payment_status === 'paid');
    const pending = bookings.filter((b) => b.payment_status === 'pending' || b.payment_status === 'unpaid');
    const gross = paid.reduce((s, b) => s + b.amount, 0);
    const fee = Math.round(gross * PLATFORM_FEE);
    const unpaidGross = pending.reduce((s, b) => s + b.amount, 0);
    return { paid, pending, gross, fee, net: gross - fee, unpaidGross };
  }, [bookings]);

  const monthly = useMemo(() => {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(d.toLocaleDateString('en', { month: 'short' }), 0);
    }
    stats.paid.forEach((b) => {
      const d = new Date(b.completed_at ?? b.scheduled_date);
      const label = d.toLocaleDateString('en', { month: 'short' });
      if (buckets.has(label)) buckets.set(label, (buckets.get(label) ?? 0) + b.amount);
    });
    return Array.from(buckets, ([label, value]) => ({ label, value }));
  }, [stats.paid]);

  const visible = useMemo(() => {
    if (tab === 'paid') return stats.paid;
    if (tab === 'pending') return stats.pending;
    return bookings;
  }, [tab, bookings, stats.paid, stats.pending]);

  const nav = providerNav(t as never);

  function exportCsv() {
    const header = 'Reference,Category,Customer,Date,Amount RWF,Payment status\n';
    const rows = bookings
      .map((b) =>
        [b.ref, b.category_name, b.customer_name, b.scheduled_date, b.amount, b.payment_status]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urugocare-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell
      title={t('provider.earnings', 'Earnings')}
      subtitle="Payments on completed jobs, platform fees and pending settlements."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net earnings" value={money(stats.net)} hint="After 12% platform fee" icon="Wallet" tone="green" />
        <StatCard label="Gross billed" value={money(stats.gross)} hint={`${stats.paid.length} paid jobs`} icon="Receipt" tone="blue" />
        <StatCard label="Platform fee" value={money(stats.fee)} hint="12% of gross" icon="Percent" tone="gold" />
        <StatCard label="Awaiting payment" value={money(stats.unpaidGross)} hint={`${stats.pending.length} jobs`} icon="Clock" tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card card-pad">
          <SectionHeader title="Last 6 months" subtitle="Paid job value by month, in RWF." />
          <BarChart data={monthly} unit="RWF" />
        </section>

        <section className="card card-pad">
          <p className="kicker">Payout method</p>
          <div className="mt-2 space-y-2">
            <KeyValue label="Channel" value="MTN MoMo / Airtel Money" />
            <KeyValue label="Number" value={provider?.phone ?? 'Add a phone number in profile'} />
            <KeyValue label="Schedule" value="Weekly — every Friday" />
            <KeyValue label="Minimum payout" value={money(10000)} />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-forest-600">
            Mobile money settlement goes live with the MTN MoMo and Airtel Money APIs. Until then, earnings are recorded
            in the ledger and paid out by the coordinator team.
          </p>
          <Link to="/provider/profile" className="btn-outline btn-sm mt-3">
            Update payout details
          </Link>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <PillTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'all', label: t('common.all', 'All jobs'), count: bookings.length },
            { key: 'paid', label: 'Paid', count: stats.paid.length },
            { key: 'pending', label: 'Unpaid', count: stats.pending.length },
          ]}
        />
        <button type="button" className="btn-outline btn-sm" onClick={exportCsv} disabled={!bookings.length}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon="Wallet"
            title="No earnings yet"
            body="Complete a job from your marketplace quotation to see the payment record here."
            action={
              <Link to="/provider/marketplace" className="btn-primary btn-sm">
                Find work
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[12.5px]">
              <thead className="bg-forest-50/70 text-[11px] uppercase tracking-wide text-forest-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Reference</th>
                  <th className="px-4 py-2.5 font-semibold">Service</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Net</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr key={b.id} className="border-t border-forest-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/provider/jobs/${b.id}`} className="font-semibold text-forest-800 hover:underline">
                        {b.ref}
                      </Link>
                      {b.for_family && (
                        <span className="ml-1.5">
                          <Badge tone="blue">Diaspora</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-forest-700">{b.category_name}</td>
                    <td className="px-4 py-2.5 text-forest-700">{b.customer_name}</td>
                    <td className="px-4 py-2.5 text-forest-600">{formatDate(b.completed_at ?? b.scheduled_date, lang)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-forest-900">
                      {money(Math.round(b.amount * (1 - PLATFORM_FEE)))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge tone={b.payment_status === 'paid' ? 'green' : b.payment_status === 'refunded' ? 'neutral' : 'amber'}>
                        {b.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
