import { useMemo, useState } from 'react';
import { Search, UserCog } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Avatar,
  Badge,
  EmptyState,
  KeyValue,
  Modal,
  PillTabs,
  SectionHeader,
  SelectField,
  StatCard,
  TextInput,
} from '../../components/ui';
import type { Profile, Role } from '../../lib/types';
import { publishNotification, updateRow } from '../../lib/db';
import { formatDate } from '../../lib/format';

type Tab = 'all' | Role;

const ROLES: Role[] = ['customer', 'provider', 'admin'];

export default function AdminUsers() {
  const { profile: me } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = usePrefs();

  const { rows: profiles } = useRows<Profile>('profiles', { order: { column: 'created_at', ascending: false } });

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>('customer');
  const [busy, setBusy] = useState(false);

  const nav = adminNav(t as never);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: profiles.length };
    profiles.forEach((p) => {
      map[p.role] = (map[p.role] ?? 0) + 1;
    });
    return map;
  }, [profiles]);

  const diaspora = profiles.filter((p) => p.is_diaspora).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      const inTab = tab === 'all' || p.role === tab;
      const inQuery =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.city ?? '').toLowerCase().includes(q);
      return inTab && inQuery;
    });
  }, [profiles, tab, query]);

  function openUser(p: Profile) {
    setActive(p);
    setRole(p.role);
  }

  async function saveRole() {
    if (!active) return;
    if (active.id === me?.id && role !== 'admin') {
      toast('Not allowed', 'You cannot remove your own administrator access.', 'error');
      return;
    }
    setBusy(true);
    try {
      await updateRow<Profile>('profiles', active.id, { role });
      await publishNotification({
        user_id: active.id,
        audience: role,
        title: 'Your account role changed',
        body: `A URUGOCARE administrator set your role to ${role}. Sign in again to see the matching dashboard.`,
        kind: 'system',
        link: '/login',
      });
      toast('Role updated', `${active.full_name} → ${role}`);
      setActive(null);
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title={t('admin.users', 'Users')}
      subtitle="Every account on the platform, with role control."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={counts.customer ?? 0} hint="Book services in Rwanda" icon="Users" tone="green" />
        <StatCard label="Providers" value={counts.provider ?? 0} hint="Supply verified services" icon="Briefcase" tone="gold" />
        <StatCard label="Diaspora accounts" value={diaspora} hint="Managing family remotely" icon="Globe2" tone="blue" />
        <StatCard label="Administrators" value={counts.admin ?? 0} hint="Operations desk" icon="ShieldCheck" tone="neutral" />
      </div>

      <div className="card card-pad mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <PillTabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'all', label: t('common.all', 'All'), count: counts.all },
              { key: 'customer', label: 'Customers', count: counts.customer ?? 0 },
              { key: 'provider', label: 'Providers', count: counts.provider ?? 0 },
              { key: 'admin', label: 'Admins', count: counts.admin ?? 0 },
            ]}
          />
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, phone or city"
              aria-label="Search users"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon="Users" title="No account matches" body="Try another role tab or clear the search." />
        </div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead className="bg-forest-50/70 text-[11px] uppercase tracking-wide text-forest-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Account</th>
                  <th className="px-4 py-2.5 font-semibold">Contact</th>
                  <th className="px-4 py-2.5 font-semibold">Location</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Joined</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-t border-forest-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.full_name} color={p.avatar_color} size={30} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-forest-800">{p.full_name}</p>
                          <p className="truncate text-[11px] text-forest-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-forest-600">{p.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-forest-600">
                      {[p.city, p.country].filter(Boolean).join(', ') || '—'}
                      {p.is_diaspora && (
                        <span className="ml-1.5">
                          <Badge tone="blue">Diaspora</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={p.role === 'admin' ? 'gold' : p.role === 'provider' ? 'green' : 'neutral'}>{p.role}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-forest-500">{formatDate(p.created_at, lang)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" className="btn-outline btn-sm" onClick={() => openUser(p)}>
                        <UserCog className="h-3.5 w-3.5" /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Account control"
        description={active?.email}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setActive(null)}>
              Close
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void saveRole()}>
              Save role
            </button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <KeyValue label="Full name" value={active.full_name} />
              <KeyValue label="Role" value={active.role} />
              <KeyValue label="Email" value={active.email} />
              <KeyValue label="Phone" value={active.phone || '—'} />
              <KeyValue label="Country" value={active.country || '—'} />
              <KeyValue label="City" value={active.city || 'Bugesera'} />
              <KeyValue label="Language" value={(active.language ?? 'en').toUpperCase()} />
              <KeyValue label="Joined" value={formatDate(active.created_at, lang)} />
            </div>
            <div>
              <span className="label">Platform role</span>
              <SelectField value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r === 'customer' ? 'Customer' : r === 'provider' ? 'Service provider' : 'Administrator'}
                  </option>
                ))}
              </SelectField>
              <p className="mt-1 text-[11px] leading-relaxed text-forest-500">
                Changing a role changes which dashboard the account can open after signing in again.
              </p>
            </div>
            <p className="text-[11px] text-forest-500">Reviewed by {me?.full_name ?? 'administrator'}.</p>
          </div>
        )}
      </Modal>

      <section className="card card-pad mt-6">
        <SectionHeader title="Access rules" subtitle="Role-based permissions enforced in the interface." />
        <ul className="space-y-2">
          {[
            'Customers book services, pay, review and raise complaints — they never see another customer’s data.',
            'Providers only see the marketplace and the jobs assigned to their verified profile.',
            'Administrators approve providers, override bookings and resolve complaints.',
            'Diaspora customers additionally open the family desk for properties, relatives and reports.',
          ].map((rule) => (
            <li key={rule} className="flex gap-2 text-[11.5px] leading-relaxed text-forest-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
