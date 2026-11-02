import type { SidebarItem } from '../components/layout';

type T = (key: string, fallback?: string) => string;

export function customerNav(t: T, opts: { unread?: number; diaspora?: boolean } = {}): SidebarItem[] {
  return [
    { to: '/dashboard', label: t('dash.overview'), icon: 'LayoutDashboard', end: true },
    { to: '/dashboard/book', label: t('nav.services'), icon: 'CalendarPlus' },
    { to: '/dashboard/bookings', label: t('dash.myBookings'), icon: 'ClipboardList' },
    { to: '/dashboard/payments', label: t('dash.payments'), icon: 'Wallet' },
    { to: '/dashboard/subscription', label: t('dash.subscription'), icon: 'Crown' },
    { to: '/family', label: t('nav.family'), icon: 'Home', count: opts.diaspora ? undefined : undefined },
    { to: '/dashboard/complaints', label: t('dash.complaints'), icon: 'MessageSquareWarning' },
    { to: '/notifications', label: t('nav.notifications'), icon: 'Bell', count: opts.unread },
    { to: '/dashboard/profile', label: t('dash.profile'), icon: 'UserCog' },
  ];
}

export function familyNav(t: T, opts: { unread?: number } = {}): SidebarItem[] {
  return [
    { to: '/family', label: t('family.title'), icon: 'HouseHeart', end: true },
    { to: '/family/properties', label: t('family.properties'), icon: 'Building2' },
    { to: '/family/relatives', label: t('family.relatives'), icon: 'Users' },
    { to: '/family/requests', label: t('family.requests'), icon: 'CalendarPlus' },
    { to: '/family/reports', label: t('family.reports'), icon: 'FileImage' },
    { to: '/dashboard/bookings', label: t('dash.myBookings'), icon: 'ClipboardList' },
    { to: '/dashboard/payments', label: t('dash.payments'), icon: 'Wallet' },
    { to: '/dashboard/subscription', label: t('dash.subscription'), icon: 'Crown' },
    { to: '/notifications', label: t('nav.notifications'), icon: 'Bell', count: opts.unread },
    { to: '/dashboard/profile', label: t('dash.profile'), icon: 'UserCog' },
  ];
}

export function providerNav(t: T, opts: { unread?: number; openJobs?: number } = {}): SidebarItem[] {
  return [
    { to: '/provider', label: t('dash.overview'), icon: 'LayoutDashboard', end: true },
    { to: '/provider/jobs', label: t('provider.myJobs'), icon: 'Briefcase', count: opts.openJobs },
    { to: '/provider/marketplace', label: t('provider.jobsAvailable'), icon: 'Search' },
    { to: '/provider/quotations', label: t('provider.quotations'), icon: 'FileText' },
    { to: '/provider/verification', label: t('provider.verification'), icon: 'ShieldCheck' },
    { to: '/provider/earnings', label: t('provider.earnings'), icon: 'Wallet' },
    { to: '/provider/reviews', label: t('common.reviews'), icon: 'Star' },
    { to: '/notifications', label: t('nav.notifications'), icon: 'Bell', count: opts.unread },
    { to: '/provider/profile', label: t('provider.profile'), icon: 'UserCog' },
  ];
}

export function adminNav(
  t: T,
  opts: { unread?: number; pendingProviders?: number; openComplaints?: number } = {},
): SidebarItem[] {
  return [
    { to: '/admin', label: t('dash.overview'), icon: 'LayoutDashboard', end: true },
    { to: '/admin/providers', label: t('admin.providers'), icon: 'ShieldCheck', count: opts.pendingProviders },
    { to: '/admin/bookings', label: t('admin.bookings'), icon: 'ClipboardList' },
    { to: '/admin/payments', label: t('admin.payments'), icon: 'Wallet' },
    { to: '/admin/complaints', label: t('admin.complaints'), icon: 'MessageSquareWarning', count: opts.openComplaints },
    { to: '/admin/users', label: t('admin.users'), icon: 'Users' },
    { to: '/admin/plans', label: t('admin.plans'), icon: 'Crown' },
    { to: '/admin/messages', label: t('admin.messages'), icon: 'Mail' },
    { to: '/notifications', label: t('nav.notifications'), icon: 'Bell', count: opts.unread },
  ];
}
