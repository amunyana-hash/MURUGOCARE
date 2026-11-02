import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  DonutChart,
  EmptyState,
  Pagination,
  PillTabs,
  SectionHeader,
  StatCard,
  StatusBadge,
  TextInput,
} from '../../components/ui';
import type { Payment } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

type Tab = 'all' | Payment['status'];

const PAGE_SIZE = 15;

export default function AdminPayments() {
  const { t, lang } = useI18n();
  const { money } = usePrefs();
  const { rows: payments } = useRows<Payment>('payments', { order: { column: 'created_at', ascending: false } });

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const nav = adminNav(t as never);

  const totals = useMemo(() => {
    const succeeded = payments.filter((p) => p.status === 'succeeded');
    const pending = payments.filter((p) => p.status === 'pending');
    const refunded = payments.filter((p) => p.status === 'refunded');
    const failed = payments.filter((p) => p.status === 'failed');
    return {
      succeeded,
      pending,
      refunded,
      failed,
      collected: succeeded.reduce((s, p) => s + p.amount, 0),
      pendingValue: pending.reduce((s, p) => s + p.amount, 0),
      refundedValue: refunded.reduce((s, p) => s + p.amount, 0),
    };
  }, [payments]);

  const byMethod = useMemo(() => {
    const palette: Record<string, string> = {
      momo: '#C9A227',
      airtel: '#C05C5C',
      card: '#5B93C7',
      cash: '#2F7A5B',
    };
    const counts = new Map<string, number>();
    totals.succeeded.forEach((p) => counts.set(p.method, (counts.get(p.method) ?? 0) + p.amount));
    return Array.from(counts, ([label, value]) => ({ label: label.toUpperCase(), value, color: palette[label] ?? '#94A3B8' }));
  }, [totals.succeeded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      const inTab = tab === 'all' || p.status === tab;
      const inQuery =
        !q ||
        p.booking_ref.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.provider_ref.toLowerCase().includes(q);
      return inTab && inQuery;
    });
  }, [payments, tab, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function exportCsv() {
    const header = 'Reference,Customer,Description,Method,Provider reference,Amount RWF,Status,Created\n';
    const body = filtered
      .map((p) =>
        [p.booking_ref, p.customer_name, p.description, p.method, p.provider_ref, p.amount, p.status, p.created_at]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urugocare-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell
      title={t('admin.payments', 'Payments')}
      subtitle="Mobile money and card settlement across the platform."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={money(totals.collected)} hint={`${totals.succeeded.length} successful`} icon="Wallet" tone="green" />
        <StatCard label="Pending" value={money(totals.pendingValue)} hint={`${totals.pending.length} awaiting confirmation`} icon="Clock" tone="gold" />
        <StatCard label="Refunded" value={money(totals.refundedValue)} hint={`${totals.refunded.length} refunds issued`} icon="Undo2" tone="blue" />
        <StatCard label="Failed" value={totals.failed.length} hint="Customer retry required" icon="AlertTriangle" tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card card-pad">
          <SectionHeader title="Collected by method" subtitle="Successful payments only." />
          {byMethod.length ? (
            <DonutChart data={byMethod} />
          ) : (
            <EmptyState icon="Wallet" title="No settled payment" body="Confirmed mobile money payments appear here." />
          )}
        </section>

        <section className="card card-pad">
          <SectionHeader title="Settlement rules" subtitle="Applies to MTN MoMo, Airtel Money and card." />
          <div className="space-y-2.5">
            {[
              'Provider payout is released 24 hours after a completed job, minus the 12% platform fee.',
              'A refund is only possible while the booking is not yet in progress.',
              'Failed mobile money charges leave the booking unpaid — the customer can retry from the payments page.',
              'Subscription charges are billed separately from service bookings.',
            ].map((rule) => (
              <p key={rule} className="flex gap-2 text-[11.5px] leading-relaxed text-forest-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                {rule}
              </p>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-gold-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-gold-800">
            MTN MoMo and Airtel Money APIs are not yet connected — payments recorded here are simulated in demo mode and
            will settle through the live gateway once credentials are configured.
          </div>
        </section>
      </div>

      <div className="card card-pad mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <PillTabs<Tab>
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
            tabs={[
              { key: 'all', label: t('common.all', 'All'), count: payments.length },
              { key: 'succeeded', label: 'Succeeded', count: totals.succeeded.length },
              { key: 'pending', label: 'Pending', count: totals.pending.length },
              { key: 'refunded', label: 'Refunded', count: totals.refunded.length },
              { key: 'failed', label: 'Failed', count: totals.failed.length },
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
              placeholder="Reference, customer or provider ref"
              aria-label="Search payments"
              className="pl-9"
            />
          </div>
          <button type="button" className="btn-outline btn-sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon="Wallet" title="No payment matches" body="Change the filter or clear the search." />
        </div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead className="bg-forest-50/70 text-[11px] uppercase tracking-wide text-forest-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Reference</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Description</th>
                  <th className="px-4 py-2.5 font-semibold">Method</th>
                  <th className="px-4 py-2.5 font-semibold">Provider ref</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-t border-forest-50">
                    <td className="px-4 py-2.5 font-semibold text-forest-800">{p.booking_ref}</td>
                    <td className="px-4 py-2.5 text-forest-700">{p.customer_name}</td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-forest-600">{p.description}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={p.method === 'momo' ? 'gold' : p.method === 'airtel' ? 'red' : p.method === 'card' ? 'blue' : 'neutral'}>
                        {p.method.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-forest-500">{p.provider_ref}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-forest-900">{money(p.amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] text-forest-500">{formatDateTime(p.created_at, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={current} pageCount={pageCount} onPage={setPage} />
    </DashboardShell>
  );
}
