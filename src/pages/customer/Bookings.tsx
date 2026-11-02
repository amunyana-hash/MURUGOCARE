import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useCategories, useRows } from '../../lib/hooks';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { EmptyState, PillTabs, StatusBadge, TextInput } from '../../components/ui';
import type { Booking, Quotation } from '../../lib/types';
import { formatDate } from '../../lib/format';

type Filter = 'all' | 'active' | 'quoted' | 'completed' | 'cancelled';

export default function CustomerBookings() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const customerId = profile?.id ?? '__none__';
  const { rows: bookings } = useRows<Booking>('bookings', {
    where: { customer_id: customerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: quotations } = useRows<Quotation>('quotations', { order: { column: 'created_at', ascending: false } });
  const { categories } = useCategories();

  const quoteCount = useMemo(() => {
    const map: Record<string, number> = {};
    quotations
      .filter((q) => q.status === 'pending')
      .forEach((q) => {
        map[q.booking_id] = (map[q.booking_id] ?? 0) + 1;
      });
    return map;
  }, [quotations]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (filter === 'active' && !['pending', 'quoted', 'confirmed', 'in_progress'].includes(b.status)) return false;
      if (filter === 'quoted' && b.status !== 'quoted') return false;
      if (filter === 'completed' && b.status !== 'completed') return false;
      if (filter === 'cancelled' && b.status !== 'cancelled') return false;
      if (!q) return true;
      return (
        b.ref.toLowerCase().includes(q) ||
        b.category_name.toLowerCase().includes(q) ||
        (b.provider_name ?? '').toLowerCase().includes(q) ||
        b.sector.toLowerCase().includes(q)
      );
    });
  }, [bookings, filter, query]);

  const counts = {
    all: bookings.length,
    active: bookings.filter((b) => ['pending', 'quoted', 'confirmed', 'in_progress'].includes(b.status)).length,
    quoted: bookings.filter((b) => b.status === 'quoted').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);

  return (
    <DashboardShell
      title={t('dash.myBookings', 'My bookings')}
      subtitle="Every request, quotation and completed visit in one place."
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'all', label: t('common.all', 'All'), count: counts.all },
            { key: 'active', label: t('common.active', 'Active'), count: counts.active },
            { key: 'quoted', label: t('dash.quotes', 'Quotations'), count: counts.quoted },
            { key: 'completed', label: 'Completed', count: counts.completed },
            { key: 'cancelled', label: t('booking.cancel', 'Cancelled'), count: counts.cancelled },
          ]}
        />
        <Link to="/dashboard/book" className="btn-primary btn-sm">
          <CalendarPlus className="h-4 w-4" /> {t('common.bookService', 'Book a service')}
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search', 'Search')}
            className="pl-9"
            aria-label="Search bookings"
          />
        </div>
        <span className="text-[12px] text-forest-500">{visible.length} result(s)</span>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="ClipboardList"
            title={t('common.empty', 'No bookings here')}
            body={
              bookings.length === 0
                ? 'Book a cleaning, repair or care visit and it appears here instantly.'
                : 'No booking matches this filter. Try another tab or clear the search.'
            }
            action={
              <Link to="/dashboard/book" className="btn-primary btn-sm">
                {t('common.newBooking', 'New booking')}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((b) => {
            const category = categories.find((c) => c.slug === b.category_slug);
            const pending = quoteCount[b.id] ?? 0;
            return (
              <li key={b.id} className="card card-pad">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-forest-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-forest-700">
                        {b.ref}
                      </span>
                      <StatusBadge status={b.status} />
                      <StatusBadge status={b.payment_status} />
                      {b.for_family && <span className="chip">Family desk</span>}
                      {pending > 0 && <span className="chip bg-gold-100 text-gold-800">{pending} quote(s)</span>}
                    </div>
                    <p className="mt-2 font-display text-lg text-forest-900">
                      {t(`service.${b.category_slug}`, b.category_name)}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-forest-600">
                      {b.provider_name ?? 'Provider to be assigned'} · {formatDate(b.scheduled_date, lang)} · {b.time_slot}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-forest-500">
                      {b.address}, {b.sector} · {category ? category.duration : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-forest-900">{money(b.amount)}</p>
                    <p className="text-[11px] text-forest-500">{b.payment_method?.replace('_', ' ') ?? 'Payment pending'}</p>
                    <Link to={`/dashboard/bookings/${b.id}`} className="btn-outline btn-sm mt-2">
                      {t('common.viewDetails', 'View details')}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
