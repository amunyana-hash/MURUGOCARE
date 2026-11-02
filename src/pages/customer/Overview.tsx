import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
  ClipboardList,
  MessageSquareWarning,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useCategories, useRows } from '../../lib/hooks';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  ArrowLink,
  EmptyState,
  KeyValue,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../../components/ui';
import type { Booking, Complaint, Payment, Quotation, Subscription } from '../../lib/types';
import { formatDate, relativeTime } from '../../lib/format';

export default function CustomerOverview() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();
  const { categories } = useCategories();

  const customerId = profile?.id ?? '__none__';
  const { rows: bookings } = useRows<Booking>('bookings', {
    where: { customer_id: customerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: payments } = useRows<Payment>('payments', {
    where: { customer_id: customerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: quotations } = useRows<Quotation>('quotations', { order: { column: 'created_at', ascending: false } });
  const { rows: complaints } = useRows<Complaint>('complaints', { where: { customer_id: customerId } });
  const { rows: subs } = useRows<Subscription>('subscriptions', { where: { customer_id: customerId } });

  const myBookingIds = new Set(bookings.map((b) => b.id));
  const pendingQuotes = quotations.filter((q) => q.status === 'pending' && myBookingIds.has(q.booking_id));
  const active = bookings.filter((b) => ['pending', 'quoted', 'confirmed', 'in_progress'].includes(b.status));
  const upcoming = active
    .slice()
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 3);
  const totalSpend = payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);
  const openComplaints = complaints.filter((c) => c.status !== 'resolved');
  const subscription = subs[0];
  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);

  const quickActions = [
    { to: '/dashboard/book', label: t('dash.newBooking', 'Book a service'), icon: CalendarPlus, hint: 'Five steps, no payment up front' },
    { to: '/dashboard/bookings', label: t('dash.myBookings', 'My bookings'), icon: ClipboardList, hint: `${active.length} active request(s)` },
    { to: '/dashboard/payments', label: t('dash.payments', 'Payments'), icon: Wallet, hint: `${money(totalSpend)} paid to date` },
    {
      to: '/dashboard/complaints',
      label: t('dash.complaints', 'Complaints'),
      icon: MessageSquareWarning,
      hint: openComplaints.length ? `${openComplaints.length} open case(s)` : 'No open cases',
    },
  ];

  return (
    <DashboardShell
      title={t('dash.greeting', 'Welcome back') + (profile ? `, ${profile.full_name.split(' ')[0]}` : '')}
      subtitle={t('dash.overview', 'Overview') + ' · Bugesera District, Rwanda'}
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dash.activeBookings', 'Active bookings')} value={active.length} icon="ClipboardList" hint="Requests in progress" />
        <StatCard label={t('dash.quotes', 'Quotations')} value={pendingQuotes.length} icon="FileText" tone="gold" hint="Waiting for your decision" />
        <StatCard label={t('dash.spend', 'Total spend')} value={money(totalSpend)} icon="Wallet" tone="blue" hint="Successful payments" />
        <StatCard
          label={t('dash.openComplaints', 'Open complaints')}
          value={openComplaints.length}
          icon="MessageSquareWarning"
          tone={openComplaints.length ? 'red' : 'green'}
          hint="Reviewed within one working day"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="card card-pad">
            <SectionHeader
              title={t('dash.upcoming', 'Upcoming visits')}
              action={<ArrowLink to="/dashboard/bookings">{t('common.viewAll', 'View all')}</ArrowLink>}
            />
            {upcoming.length === 0 ? (
              <EmptyState
                icon="CalendarPlus"
                title={t('common.empty', 'Nothing here yet')}
                body="Book your first service and a coordinator confirms a verified provider within one working day."
                action={
                  <Link to="/dashboard/book" className="btn-primary btn-sm">
                    {t('common.bookService', 'Book a service')}
                  </Link>
                }
              />
            ) : (
              <ul className="mt-4 space-y-2.5">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <Link
                      to={`/dashboard/bookings/${b.id}`}
                      className="card-hover flex flex-wrap items-center justify-between gap-3 rounded-xl border border-forest-100 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-forest-900">{b.category_name}</p>
                        <p className="mt-0.5 text-[11.5px] text-forest-600">
                          {formatDate(b.scheduled_date, lang)} · {b.time_slot} · {b.sector}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-forest-800">{money(b.amount)}</span>
                        <StatusBadge status={b.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader title={t('dash.quickActions', 'Quick actions')} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {quickActions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="card-hover flex items-start gap-3 rounded-2xl border border-forest-100 bg-white p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-forest-900">{a.label}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-forest-500">{a.hint}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-forest-300" />
                </Link>
              ))}
            </div>
          </section>

          <section className="card card-pad">
            <SectionHeader title={t('dash.recentActivity', 'Recent activity')} />
            <div className="mt-3 table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('common.reference', 'Reference')}</th>
                    <th>{t('booking.category', 'Service')}</th>
                    <th>{t('common.date', 'Date')}</th>
                    <th>{t('common.amount', 'Amount')}</th>
                    <th>{t('common.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 6).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link to={`/dashboard/bookings/${b.id}`} className="font-semibold text-forest-800 hover:underline">
                          {b.ref}
                        </Link>
                      </td>
                      <td>{b.category_name}</td>
                      <td className="whitespace-nowrap text-forest-600">{formatDate(b.scheduled_date, lang)}</td>
                      <td className="whitespace-nowrap">{money(b.amount)}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-forest-500">
                        {t('common.empty', 'No bookings yet')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {pendingQuotes.length > 0 && (
            <div className="card card-pad border-gold-200 bg-gold-50/60">
              <p className="kicker text-gold-700">{t('dash.quotes', 'Quotations waiting')}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-forest-700">
                {pendingQuotes.length} provider quotation(s) need your decision. The price you accept is the price you
                pay.
              </p>
              <ul className="mt-3 space-y-1.5">
                {pendingQuotes.slice(0, 3).map((q) => (
                  <li key={q.id}>
                    <Link
                      to={`/dashboard/bookings/${q.booking_id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-[12px] hover:bg-white"
                    >
                      <span className="min-w-0 truncate font-medium text-forest-800">{q.provider_name}</span>
                      <span className="font-semibold text-forest-900">{money(q.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card card-pad">
            <p className="kicker">{t('dash.subscription', 'Subscription')}</p>
            {subscription ? (
              <>
                <p className="mt-2 font-display text-lg text-forest-900">{subscription.plan_name}</p>
                <p className="text-[12px] text-forest-600">
                  {money(subscription.price)} · {t('common.active', 'Active')}
                </p>
                <div className="mt-3 space-y-2.5">
                  <KeyValue label="Renews" value={formatDate(subscription.renews_at, lang)} />
                  <KeyValue label="Payment" value={subscription.payment_method.replace('_', ' ')} />
                  <KeyValue label="Auto-renew" value={subscription.auto_renew ? t('common.yes', 'Yes') : t('common.no', 'No')} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-[12.5px] leading-relaxed text-forest-600">
                No plan yet. Members save on every visit and get priority booking windows.
              </p>
            )}
            <Link to="/dashboard/subscription" className="btn-outline btn-sm mt-3 w-full">
              {subscription ? 'Manage plan' : 'See plans'}
            </Link>
          </div>

          <div className="card card-pad">
            <p className="kicker">{t('dash.savedProviders', 'Popular services')}</p>
            <ul className="mt-2 space-y-1.5">
              {categories.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/dashboard/book?service=${c.slug}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-[12px] hover:bg-forest-50"
                  >
                    <span className="flex items-center gap-1.5 text-forest-800">
                      <Sparkles className="h-3.5 w-3.5 text-gold-500" />
                      {t(`service.${c.slug}`, c.name_en)}
                    </span>
                    <span className="text-forest-500">{money(c.base_price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <p className="kicker text-gold-300">{t('dash.needHelp', 'Need help?')}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-forest-100/85">
              Our Bugesera coordinators answer on WhatsApp every day from 07:00 to 20:00.
            </p>
            <Link to="/contact" className="btn-gold btn-sm mt-3 w-full">
              {t('dash.contactSupport', 'Contact support')}
            </Link>
          </div>

          {bookings.length > 0 && (
            <p className="px-1 text-[11px] text-forest-500">
              Last request {relativeTime(bookings[0].created_at, lang)} · {bookings[0].ref}
            </p>
          )}
        </aside>
      </div>
    </DashboardShell>
  );
}
