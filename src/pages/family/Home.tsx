import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarPlus,
  FileImage,
  Globe2,
  HeartHandshake,
  Home,
  Users,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Badge, EmptyState, KeyValue, SectionHeader, StatCard, StatusBadge } from '../../components/ui';
import type { Booking, CareReport, FamilyMember, Property } from '../../lib/types';
import { formatDate, relativeTime } from '../../lib/format';

export default function FamilyHome() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money } = usePrefs();
  const ownerId = profile?.id ?? '__none__';

  const { rows: properties } = useRows<Property>('properties', { where: { owner_id: ownerId } });
  const { rows: relatives } = useRows<FamilyMember>('family_members', { where: { owner_id: ownerId } });
  const { rows: reports } = useRows<CareReport>('care_reports', {
    where: { owner_id: ownerId },
    order: { column: 'created_at', ascending: false },
  });
  const { rows: bookings } = useRows<Booking>('bookings', {
    where: { customer_id: ownerId },
    order: { column: 'created_at', ascending: false },
  });

  const familyBookings = bookings.filter((b) => b.for_family);
  const activeRequests = bookings.filter((b) => ['pending', 'quoted', 'confirmed', 'in_progress'].includes(b.status));
  const monthlyBudget = relatives.reduce((s, r) => s + r.monthly_budget, 0);
  const nav = familyNav(t as never);

  return (
    <DashboardShell
      title={t('family.title', 'Family desk')}
      subtitle="Manage your home and relatives in Rwanda from anywhere in the world."
      items={nav}
      accent={t('family.diasporaBadge', 'Diaspora')}
    >
      <div className="card card-pad border-forest-200 bg-gradient-to-br from-forest-900 via-forest-800 to-forest-900 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="kicker text-gold-300">Remote care, verified locally</p>
            <p className="mt-1.5 font-display text-2xl leading-snug">
              {profile?.full_name.split(' ')[0]}, your Bugesera home is looked after today.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-forest-100/85">
              Every visit is executed by an ID-verified provider and documented with photos and a written completion
              report, so you see exactly what happened.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/family/requests" className="btn-gold btn-sm">
              <CalendarPlus className="h-4 w-4" /> {t('family.newRequest', 'New request')}
            </Link>
            <Link to="/family/reports" className="btn-outline btn-sm border-white/30 text-white">
              <FileImage className="h-4 w-4" /> {t('family.reports', 'View reports')}
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Properties', value: properties.length },
            { label: 'Relatives', value: relatives.length },
            { label: 'Active requests', value: activeRequests.length },
            { label: 'Reports', value: reports.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-forest-100/70">{s.label}</p>
              <p className="font-display text-xl">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('family.properties', 'Properties')} value={properties.length} icon="Building2" hint="Under URUGOCARE management" />
        <StatCard label={t('family.relatives', 'Relatives')} value={relatives.length} icon="Users" tone="gold" hint="Registered family members" />
        <StatCard
          label={t('family.monthlyBudget', 'Monthly budget')}
          value={money(monthlyBudget)}
          icon="Wallet"
          tone="blue"
          hint="Committed care budget"
        />
        <StatCard
          label={t('family.requests', 'Requests')}
          value={familyBookings.length}
          icon="CalendarPlus"
          tone={activeRequests.length ? 'red' : 'green'}
          hint={`${activeRequests.length} in progress`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card card-pad">
            <SectionHeader
              title={t('family.properties', 'Properties')}
              action={
                <Link to="/family/properties" className="text-[12px] font-semibold text-forest-700 hover:underline">
                  Manage <ArrowRight className="inline h-3 w-3" />
                </Link>
              }
            />
            {properties.length === 0 ? (
              <EmptyState
                icon="Building2"
                title="No property registered"
                body="Add the home, farm or commercial space you want URUGOCARE to inspect and maintain."
                action={
                  <Link to="/family/properties" className="btn-primary btn-sm">
                    <Building2 className="h-4 w-4" /> Add a property
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {properties.map((p) => (
                  <li key={p.id} className="rounded-xl border border-forest-100 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-forest-900">{p.name}</p>
                        <p className="truncate text-[11.5px] text-forest-600">
                          {p.sector}, {p.district}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      <KeyValue label="Type" value={p.type} />
                      <KeyValue label="Caretaker" value={p.caretaker_name} />
                      <KeyValue label="Last inspection" value={p.last_inspection ? formatDate(p.last_inspection, lang) : 'Not yet'} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card card-pad">
            <SectionHeader
              title={t('family.requests', 'Service requests')}
              action={
                <Link to="/dashboard/bookings" className="text-[12px] font-semibold text-forest-700 hover:underline">
                  All bookings <ArrowRight className="inline h-3 w-3" />
                </Link>
              }
            />
            {familyBookings.length === 0 ? (
              <EmptyState
                icon="CalendarPlus"
                title="No remote request yet"
                body="Book a cleaning, inspection or companionship visit for a relative without leaving your country."
                action={
                  <Link to="/family/requests" className="btn-primary btn-sm">
                    {t('family.newRequest', 'New request')}
                  </Link>
                }
              />
            ) : (
              <div className="table-wrap">
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
                    {familyBookings.slice(0, 6).map((b) => (
                      <tr key={b.id}>
                        <td>
                          <Link to={`/dashboard/bookings/${b.id}`} className="font-semibold text-forest-800 hover:underline">
                            {b.ref}
                          </Link>
                        </td>
                        <td>{b.category_name}</td>
                        <td className="whitespace-nowrap text-forest-600">{formatDate(b.scheduled_date, lang)}</td>
                        <td>{money(b.amount)}</td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <FileImage className="h-3.5 w-3.5" /> {t('family.reports', 'Latest reports')}
            </p>
            {reports.length === 0 ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-forest-600">
                Reports appear after the first visit. Each includes photos and a written summary from the coordinator.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {reports.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/family/reports"
                      className="block rounded-xl border border-forest-100 px-3 py-2.5 hover:border-forest-300"
                    >
                      <p className="truncate text-[12.5px] font-semibold text-forest-900">{r.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-forest-500">
                        <Badge tone="gold">{r.type}</Badge>
                        {relativeTime(r.created_at, lang)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/family/reports" className="btn-outline btn-sm mt-3 w-full">
              {t('family.reports', 'All reports')}
            </Link>
          </div>

          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5" /> {t('family.relatives', 'Relatives')}
            </p>
            {relatives.length === 0 ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-forest-600">
                Register a parent, grandparent or child so we know who to visit and what support they need.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {relatives.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-forest-900">{r.full_name}</p>
                      <p className="truncate text-[11px] text-forest-500">
                        {r.relationship} · {r.age} yrs
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
            <Link to="/family/relatives" className="btn-outline btn-sm mt-3 w-full">
              {t('family.relatives', 'Manage relatives')}
            </Link>
          </div>

          <div className="rounded-2xl bg-gold-50 p-5">
            <p className="kicker text-gold-700 flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5" /> International support
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-forest-800">
              Pay from Belgium, Canada, the UK or the Gulf. We accept card and bank transfer, and quote everything in RWF
              with an indicative USD conversion.
            </p>
            <Link to="/contact" className="btn-primary btn-sm mt-3 w-full">
              Talk to a coordinator
            </Link>
          </div>

          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" /> How it works
            </p>
            <ol className="mt-2 space-y-2 text-[12px] leading-relaxed text-forest-700">
              <li>1. Register your property and relatives.</li>
              <li>2. Request a service and pick a date.</li>
              <li>3. A verified provider does the visit.</li>
              <li>4. Photos and a report land in your inbox.</li>
            </ol>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
