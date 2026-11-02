import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Globe,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n, languageOptions } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import { useNotifications } from '../lib/hooks';
import { relativeTime } from '../lib/format';
import { Avatar, Badge } from './ui';

/* --------------------------------------------------------------- language */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = languageOptions.find((o) => o.value === lang);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-forest-800 transition hover:border-forest-400"
      >
        <Globe className="h-3.5 w-3.5" />
        {compact ? current?.short : current?.label}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-forest-100 bg-white py-1 shadow-lift"
        >
          {languageOptions.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === lang}>
              <button
                type="button"
                onClick={() => {
                  setLang(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition hover:bg-forest-50 ${
                  option.value === lang ? 'font-semibold text-forest-800' : 'text-forest-700'
                }`}
              >
                {option.label}
                <span className="text-[10px] font-bold text-forest-400">{option.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- currency */
export function CurrencySwitcher() {
  const { currency, setCurrency } = usePrefs();
  return (
    <div className="flex items-center rounded-full border border-forest-200 bg-white p-0.5" role="group" aria-label="Currency">
      {(['RWF', 'USD'] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          aria-pressed={currency === c}
          className={`rounded-full px-2 py-1 text-[11px] font-bold transition ${
            currency === c ? 'bg-forest-700 text-white' : 'text-forest-600 hover:text-forest-900'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- notifications */
export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${t('nav.notifications')}${unread ? ` (${unread} unread)` : ''}`}
        className="relative rounded-full border border-forest-200 bg-white p-2 text-forest-700 transition hover:border-forest-400"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-forest-900">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[19rem] overflow-hidden rounded-xl border border-forest-100 bg-white shadow-lift sm:w-80">
          <div className="flex items-center justify-between border-b border-forest-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-forest-900">{t('nav.notifications')}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] font-semibold text-forest-600 hover:text-forest-900"
              >
                {t('common.all')} ✓
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-forest-500">{t('common.empty')}</li>
            )}
            {notifications.slice(0, 8).map((n) => (
              <li key={n.id} className="border-b border-forest-50 last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    void markRead(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                  className={`flex w-full gap-2.5 px-4 py-3 text-left transition hover:bg-forest-50/60 ${
                    n.read ? '' : 'bg-gold-50/40'
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-forest-200' : 'bg-gold-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-snug text-forest-900">{n.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-forest-600">{n.body}</span>
                    <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-forest-400">
                      {relativeTime(n.created_at, lang)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-forest-100 bg-forest-50/50 px-4 py-2.5 text-center text-[12px] font-semibold text-forest-700 hover:bg-forest-50"
          >
            {t('common.viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- user menu */
function UserMenu() {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!profile) return null;
  const home =
    profile.role === 'admin'
      ? '/admin'
      : profile.role === 'provider'
        ? '/provider'
        : profile.is_diaspora
          ? '/family'
          : '/dashboard';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-forest-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-forest-400"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={profile.full_name} color={profile.avatar_color} size={28} />
        <span className="hidden max-w-[110px] truncate text-xs font-semibold text-forest-900 sm:block">
          {profile.full_name.split(' ')[0]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-forest-500" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-forest-100 bg-white py-1 shadow-lift">
          <div className="border-b border-forest-100 px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-forest-900">{profile.full_name}</p>
            <p className="truncate text-[11px] text-forest-600">{profile.email}</p>
            <Badge tone={profile.is_diaspora ? 'gold' : 'green'}>
              {profile.is_diaspora ? t('family.diasporaBadge') : profile.role}
            </Badge>
          </div>
          <Link
            to={home}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-forest-800 transition hover:bg-forest-50"
          >
            {t('nav.dashboard')}
          </Link>
          {profile.role === 'customer' && (
            <>
              <Link
                to="/family"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-forest-800 transition hover:bg-forest-50"
              >
                {t('nav.family')}
              </Link>
              <Link
                to="/dashboard/profile"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-forest-800 transition hover:bg-forest-50"
              >
                {t('dash.profile')}
              </Link>
            </>
          )}
          {profile.role === 'provider' && (
            <Link
              to="/provider/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-forest-800 transition hover:bg-forest-50"
            >
              {t('provider.profile')}
            </Link>
          )}
          {profile.role === 'admin' && (
            <Link
              to="/admin/users"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-forest-800 transition hover:bg-forest-50"
            >
              {t('admin.users')}
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
            className="flex w-full items-center gap-2 border-t border-forest-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- public header */
const publicNav = [
  { to: '/services', key: 'nav.services' },
  { to: '/providers', key: 'nav.providers' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' },
];

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          light ? 'bg-white/10 text-gold-300 ring-1 ring-white/20' : 'bg-forest-700 text-gold-300'
        }`}
      >
        <Sparkles className="h-4.5 w-4.5" />
      </span>
      <span className="leading-none">
        <span className={`block font-display text-lg tracking-tight ${light ? 'text-white' : 'text-forest-900'}`}>
          URUGOCARE
        </span>
        <span className={`block text-[9px] font-semibold uppercase tracking-[0.16em] ${light ? 'text-gold-300' : 'text-gold-600'}`}>
          Rwanda
        </span>
      </span>
    </Link>
  );
}

export function PublicLayout() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const home =
    profile?.role === 'admin'
      ? '/admin'
      : profile?.role === 'provider'
        ? '/provider'
        : profile?.is_diaspora
          ? '/family'
          : '/dashboard';

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-40 border-b border-forest-100/80 bg-cream/85 backdrop-blur-md">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-forest-50 text-forest-900' : 'text-forest-700 hover:bg-forest-50/70'
                  }`
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <CurrencySwitcher />
              <LanguageSwitcher compact />
            </div>
            {profile ? (
              <Link to={home} className="btn-primary btn-sm hidden sm:inline-flex">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary btn-sm hidden sm:inline-flex">
                  {t('nav.register')}
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              className="rounded-full border border-forest-200 bg-white p-2 text-forest-800 lg:hidden"
            >
              {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-forest-100 bg-white px-4 pb-4 pt-2 lg:hidden">
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {publicNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-forest-50 text-forest-900' : 'text-forest-700'}`
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-2">
              <CurrencySwitcher />
              <LanguageSwitcher compact />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {profile ? (
                <Link to={home} className="btn-primary">
                  {t('nav.dashboard')}
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-outline">
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="btn-primary">
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-forest-800/40 bg-forest-900 text-forest-100">
        <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand light />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-forest-200/80">{t('footer.about')}</p>
            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-gold-300">
              <MapPin className="h-3.5 w-3.5" /> Nyamata, Bugesera District, Rwanda
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">{t('footer.platform')}</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-forest-200/85">
              <li><Link to="/services" className="hover:text-white">{t('nav.services')}</Link></li>
              <li><Link to="/providers" className="hover:text-white">{t('nav.providers')}</Link></li>
              <li><Link to="/pricing" className="hover:text-white">{t('nav.pricing')}</Link></li>
              <li><Link to="/register?role=provider" className="hover:text-white">Become a provider</Link></li>
              <li><Link to="/family" className="hover:text-white">{t('nav.family')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">{t('footer.support')}</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-forest-200/85">
              <li><Link to="/contact" className="hover:text-white">{t('nav.contact')}</Link></li>
              <li><Link to="/dashboard/complaints" className="hover:text-white">{t('dash.complaints')}</Link></li>
              <li><Link to="/about" className="hover:text-white">{t('nav.about')}</Link></li>
              <li className="text-forest-300/70">{t('contact.hours')}</li>
              <li className="text-forest-300/70">+250 788 000 145</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">{t('footer.legal')}</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-forest-200/85">
              <li>Service terms</li>
              <li>Privacy policy</li>
              <li>Provider code of conduct</li>
              <li className="flex items-center gap-1.5 text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" /> RURA-aligned safety
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4">
          <div className="container-x flex flex-wrap items-center justify-between gap-2 text-[11px] text-forest-300/70">
            <p>© {new Date().getFullYear()} URUGOCARE Ltd. {t('footer.rights')}</p>
            <p>{t('footer.builtIn')} • EN / FR / RW • RWF</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------- dashboard shell */
export interface SidebarItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  count?: number;
}

export function DashboardShell({
  title,
  subtitle,
  items,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  items: SidebarItem[];
  children: React.ReactNode;
  accent?: string;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { unread } = useNotifications();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const nav = useMemo(() => items, [items]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-forest-100 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle dashboard menu"
              className="rounded-lg border border-forest-200 p-2 text-forest-800 lg:hidden"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Brand />
            <span className="hidden h-6 w-px bg-forest-100 sm:block" />
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-gold-600 sm:block">
              {accent}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <CurrencySwitcher />
              <LanguageSwitcher compact />
            </div>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 overflow-y-auto border-r border-forest-100 bg-white pt-4 transition-transform duration-200 lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-4 pb-3 lg:hidden">
            <Brand />
          </div>
          <nav className="space-y-1 px-3 pb-6" aria-label="Dashboard navigation">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <NavItemLabel item={item} unread={unread} />
              </NavLink>
            ))}
          </nav>
          <div className="mx-3 mb-6 rounded-xl bg-gradient-to-br from-forest-800 to-forest-900 p-4 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-300">{t('dash.needHelp')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-forest-100/85">{t('dash.needHelpBody')}</p>
            <Link to="/contact" className="mt-2.5 inline-flex text-[11px] font-semibold text-gold-300 underline">
              {t('dash.contactSupport')}
            </Link>
          </div>
          {profile && (
            <div className="mx-3 mb-6 flex items-center gap-2.5 rounded-xl border border-forest-100 p-3">
              <Avatar name={profile.full_name} color={profile.avatar_color} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-forest-900">{profile.full_name}</p>
                <p className="truncate text-[10px] uppercase tracking-wide text-forest-500">
                  {profile.is_diaspora ? t('family.diasporaBadge') : profile.role}
                </p>
              </div>
            </div>
          )}
        </aside>

        {mobileOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-forest-950/40 lg:hidden"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="border-b border-forest-100 bg-white px-4 py-5 sm:px-6 lg:px-8">
            <h1 className="font-display text-2xl text-forest-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-forest-600">{subtitle}</p>}
          </div>
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function NavItemLabel({ item, unread }: { item: SidebarItem; unread: number }) {
  const IconCmp = requireIcon(item.icon);
  const count = item.to === '/notifications' ? unread : item.count;
  return (
    <>
      <IconCmp className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full bg-gold-400 px-1.5 py-0.5 text-[10px] font-bold text-forest-900">{count}</span>
      )}
    </>
  );
}

function requireIcon(name: string) {
  // Lazy-free icon lookup shared with the UI kit's mapping.
  const icons = require_icons();
  return icons[name] ?? icons.Circle;
}

function require_icons(): Record<string, React.ComponentType<{ className?: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return iconsModule;
}

import * as iconsModule from 'lucide-react';
