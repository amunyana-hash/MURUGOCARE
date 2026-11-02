import { Link } from 'react-router-dom';
import { BellRing, CheckCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/hooks';
import { customerNav, adminNav, familyNav, providerNav } from '../lib/nav';
import { DashboardShell } from '../components/layout';
import { EmptyState, PillTabs } from '../components/ui';
import { relativeTime } from '../lib/format';
import { useState } from 'react';

const kindTone: Record<string, string> = {
  booking: 'bg-forest-50 text-forest-700',
  payment: 'bg-gold-50 text-gold-700',
  verification: 'bg-sky-50 text-sky-700',
  report: 'bg-forest-50 text-forest-700',
  complaint: 'bg-red-50 text-red-600',
  system: 'bg-forest-100 text-forest-700',
};

export default function NotificationsPage() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const nav = !profile
    ? []
    : profile.role === 'admin'
      ? adminNav(t as never, { unread })
      : profile.role === 'provider'
        ? providerNav(t as never, { unread })
        : profile.is_diaspora
          ? familyNav(t as never, { unread })
          : customerNav(t as never, { unread });

  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <DashboardShell
      title={t('nav.notifications', 'Notifications')}
      subtitle="Booking updates, quotations, payments, verification decisions and care reports."
      items={nav}
      accent={t('common.account', 'Account')}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          tabs={[
            { key: 'all', label: t('common.all', 'All'), count: notifications.length },
            { key: 'unread', label: t('nav.unread', 'Unread'), count: unread },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unread === 0}
          className="btn-outline btn-sm"
        >
          <CheckCheck className="h-4 w-4" /> {t('nav.markAllRead', 'Mark all as read')}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="Bell"
          title={filter === 'unread' ? 'No unread notifications' : 'Nothing here yet'}
          body="Notifications appear when a booking is created, a provider quotes, a payment settles or an admin verifies an account."
          action={<Link to="/dashboard/book" className="btn-primary btn-sm">{t('common.bookService', 'Book a service')}</Link>}
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((n) => (
            <li
              key={n.id}
              className={`card flex items-start gap-3 p-4 ${n.read ? 'opacity-80' : 'border-forest-200 bg-white'}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kindTone[n.kind] ?? kindTone.system}`}>
                <BellRing className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-forest-900">{n.title}</p>
                  <span className="text-[11px] text-forest-500">{relativeTime(n.created_at, lang)}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-forest-600">{n.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={() => void markRead(n.id)}
                      className="text-[12px] font-semibold text-forest-800 underline decoration-gold-400 decoration-2 underline-offset-2"
                    >
                      {t('common.viewDetails', 'View details')}
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="text-[12px] font-semibold text-forest-500 hover:text-forest-800"
                    >
                      {t('nav.markRead', 'Mark as read')}
                    </button>
                  )}
                </div>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-400" aria-label="Unread" />}
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
