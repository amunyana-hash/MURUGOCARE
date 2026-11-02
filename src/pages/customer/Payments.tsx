import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Receipt, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  EmptyState,
  KeyValue,
  Modal,
  PillTabs,
  SectionHeader,
  StatCard,
  StatusBadge,
  TextInput,
} from '../../components/ui';
import type { Payment } from '../../lib/types';
import { formatDate, formatDateTime } from '../../lib/format';

type Filter = 'all' | 'succeeded' | 'pending' | 'refunded';

const methodLabel: Record<string, string> = {
  mtn_momo: 'MTN Mobile Money',
  airtel_money: 'Airtel Money',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cash: 'Cash',
};

export default function CustomerPayments() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const customerId = profile?.id ?? '__none__';
  const { rows: payments } = useRows<Payment>('payments', {
    where: { customer_id: customerId },
    order: { column: 'created_at', ascending: false },
  });

  const paid = payments.filter((p) => p.status === 'succeeded');
  const total = paid.reduce((s, p) => s + p.amount, 0);
  const thisMonth = paid
    .filter((p) => p.created_at.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const refunded = payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.booking_ref.toLowerCase().includes(q) ||
        p.provider_ref.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        methodLabel[p.method]?.toLowerCase().includes(q) === true
      );
    });
  }, [payments, filter, query]);

  function exportCsv() {
    const header = ['Date', 'Reference', 'Booking', 'Description', 'Method', 'Status', 'Amount RWF'];
    const lines = visible.map((p) =>
      [
        p.created_at.slice(0, 10),
        p.provider_ref,
        p.booking_ref,
        `"${p.description.replace(/"/g, "'")}"`,
        methodLabel[p.method] ?? p.method,
        p.status,
        p.amount,
      ].join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urugocare-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Statement downloaded', `${visible.length} transaction(s) exported as CSV.`);
  }

  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);

  return (
    <DashboardShell
      title={t('dash.payments', 'Payments')}
      subtitle="Every mobile money, bank and card transaction with a downloadable statement."
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dash.totalPaid', 'Total paid')} value={money(total)} icon="Wallet" hint={`${paid.length} successful payment(s)`} />
        <StatCard label="This month" value={money(thisMonth)} icon="CalendarDays" tone="gold" hint="Calendar month to date" />
        <StatCard label={t('common.pending', 'Pending')} value={money(pendingTotal)} icon="Clock" tone="blue" hint="Awaiting confirmation" />
        <StatCard label={t('common.refunded', 'Refunded')} value={money(refunded)} icon="RotateCcw" tone="red" hint="Returned to your wallet" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <PillTabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'all', label: t('common.all', 'All'), count: payments.length },
            { key: 'succeeded', label: 'Successful', count: paid.length },
            { key: 'pending', label: 'Pending', count: payments.filter((p) => p.status === 'pending').length },
            { key: 'refunded', label: 'Refunded', count: payments.filter((p) => p.status === 'refunded').length },
          ]}
        />
        <button type="button" className="btn-outline btn-sm" onClick={exportCsv} disabled={visible.length === 0}>
          <Download className="h-4 w-4" /> {t('common.download', 'Download statement')}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <TextInput
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search', 'Search reference or method')}
            aria-label="Search payments"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="Receipt"
            title={t('common.empty', 'No transactions yet')}
            body="Payments appear here as soon as you settle a booking with MTN MoMo, Airtel Money, bank transfer or card."
            action={
              <Link to="/dashboard/bookings" className="btn-primary btn-sm">
                {t('dash.myBookings', 'My bookings')}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.date', 'Date')}</th>
                  <th>{t('common.reference', 'Reference')}</th>
                  <th>{t('booking.title', 'Booking')}</th>
                  <th>{t('common.method', 'Method')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th className="text-right">{t('common.amount', 'Amount')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap text-forest-600">{formatDate(p.created_at, lang)}</td>
                    <td className="whitespace-nowrap font-mono text-[11.5px] text-forest-800">{p.provider_ref}</td>
                    <td>
                      <Link to={`/dashboard/bookings/${p.booking_id}`} className="font-semibold text-forest-800 hover:underline">
                        {p.booking_ref}
                      </Link>
                      <p className="text-[11px] text-forest-500">{p.description}</p>
                    </td>
                    <td className="whitespace-nowrap">{methodLabel[p.method] ?? p.method}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-forest-900">{money(p.amount)}</td>
                    <td className="text-right">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setReceipt(p)}>
                        <Receipt className="h-3.5 w-3.5" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <SectionHeader title="Accepted payment methods" subtitle="All methods settle in Rwandan Francs." />
          <ul className="space-y-2">
            {Object.entries(methodLabel).map(([key, label]) => {
              const count = payments.filter((p) => p.method === key).length;
              return (
                <li key={key} className="flex items-center justify-between rounded-lg border border-forest-100 px-3 py-2">
                  <span className="text-[12.5px] font-medium text-forest-800">{label}</span>
                  <Badge tone={count ? 'green' : 'neutral'}>{count ? `${count} used` : 'Available'}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card card-pad">
          <SectionHeader title="Need a refund?" subtitle="Refunds for cancelled or incomplete visits are processed within 3 working days." />
          <p className="text-[12.5px] leading-relaxed text-forest-700">
            Open a complaint linked to the booking and our Bugesera coordinator reviews it with the provider. Approved refunds
            return to the same mobile money wallet or bank account used for the payment.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/complaints" className="btn-primary btn-sm">
              {t('dash.complaints', 'Open a complaint')}
            </Link>
            <Link to="/contact" className="btn-outline btn-sm">
              {t('dash.contactSupport', 'Contact support')}
            </Link>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={t('common.receipt', 'Payment receipt')}
        description={receipt ? `${receipt.booking_ref} · ${formatDateTime(receipt.created_at, lang)}` : undefined}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setReceipt(null)}>
              {t('common.close', 'Close')}
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                if (!receipt) return;
                const body = [
                  'URUGOCARE LTD — PAYMENT RECEIPT',
                  'Bugesera District, Eastern Province, Rwanda',
                  'TIN: 102 938 471',
                  '',
                  `Receipt no: ${receipt.provider_ref}`,
                  `Booking:    ${receipt.booking_ref}`,
                  `Date:       ${formatDateTime(receipt.created_at, lang)}`,
                  `Customer:   ${receipt.customer_name}`,
                  `Service:    ${receipt.description}`,
                  `Method:     ${methodLabel[receipt.method] ?? receipt.method}`,
                  `Status:     ${receipt.status}`,
                  `Amount:     RWF ${receipt.amount.toLocaleString('en-US')}`,
                  '',
                  'Thank you for trusting URUGOCARE.',
                ].join('\n');
                const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `urugocare-receipt-${receipt.provider_ref}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast('Receipt downloaded', receipt.provider_ref);
              }}
            >
              <Download className="h-4 w-4" /> {t('common.download', 'Download')}
            </button>
          </>
        }
      >
        {receipt && (
          <div className="space-y-3">
            <div className="rounded-xl bg-forest-50 px-4 py-4 text-center">
              <p className="kicker">{t('common.amount', 'Total paid')}</p>
              <p className="font-display text-3xl text-forest-900">{money(receipt.amount)}</p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status={receipt.status} />
              </div>
            </div>
            <div className="space-y-2.5">
              <KeyValue label="Receipt no" value={<span className="font-mono text-[12px]">{receipt.provider_ref}</span>} />
              <KeyValue label={t('booking.title', 'Booking')} value={receipt.booking_ref} />
              <KeyValue label={t('common.date', 'Date')} value={formatDateTime(receipt.created_at, lang)} />
              <KeyValue label={t('common.method', 'Method')} value={methodLabel[receipt.method] ?? receipt.method} />
              <KeyValue label="Service" value={receipt.description} />
              <KeyValue label={t('common.customer', 'Customer')} value={receipt.customer_name} />
            </div>
            <p className="text-[11px] leading-relaxed text-forest-500">
              URUGOCARE Ltd · Bugesera District · TIN 102 938 471. This receipt is generated automatically from the payment
              record and is valid without a signature.
            </p>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
