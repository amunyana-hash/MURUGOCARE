import { useMemo, useState } from 'react';
import { CheckCheck, Mail, MailOpen, Search } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { adminNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  EmptyState,
  KeyValue,
  Modal,
  PillTabs,
  SectionHeader,
  StatCard,
  TextInput,
} from '../../components/ui';
import type { ContactMessage } from '../../lib/types';
import { updateRow } from '../../lib/db';
import { formatDateTime, relativeTime } from '../../lib/format';

type Tab = 'new' | 'replied' | 'all';

const TOPICS: Record<string, string> = {
  booking: 'Booking question',
  provider: 'Provider application',
  diaspora: 'Family desk abroad',
  billing: 'Billing & payments',
  other: 'General enquiry',
};

export default function AdminMessages() {
  const { t, lang } = useI18n();
  const { toast } = usePrefs();

  const { rows: messages } = useRows<ContactMessage>('contact_messages', {
    order: { column: 'created_at', ascending: false },
  });

  const [tab, setTab] = useState<Tab>('new');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const nav = adminNav(t as never);

  const counts = useMemo(
    () => ({
      new: messages.filter((m) => m.status === 'new').length,
      replied: messages.filter((m) => m.status === 'replied').length,
      all: messages.length,
    }),
    [messages],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      const inTab = tab === 'all' || m.status === tab;
      const inQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q);
      return inTab && inQuery;
    });
  }, [messages, tab, query]);

  async function markReplied(m: ContactMessage) {
    setBusy(true);
    try {
      await updateRow<ContactMessage>('contact_messages', m.id, { status: 'replied' });
      toast('Marked as replied', m.subject);
      setActive(null);
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function reopen(m: ContactMessage) {
    setBusy(true);
    try {
      await updateRow<ContactMessage>('contact_messages', m.id, { status: 'new' });
      toast('Reopened', m.subject);
      setActive(null);
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const mailto = (m: ContactMessage) =>
    `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject} — URUGOCARE`)}&body=${encodeURIComponent(
      `Hello ${m.name},\n\nThank you for contacting URUGOCARE.\n\n`,
    )}`;

  return (
    <DashboardShell
      title={t('admin.messages', 'Messages')}
      subtitle="Enquiries submitted from the public contact page."
      items={nav}
      accent={t('roles.admin', 'Administrator')}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="New enquiries" value={counts.new} hint="Awaiting a reply" icon="Mail" tone="gold" />
        <StatCard label="Replied" value={counts.replied} hint="Closed by the desk" icon="CheckCheck" tone="green" />
        <StatCard label="Total received" value={counts.all} hint="All-time contact form" icon="Inbox" tone="blue" />
      </div>

      <div className="card card-pad mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <PillTabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'new', label: 'New', count: counts.new },
              { key: 'replied', label: 'Replied', count: counts.replied },
              { key: 'all', label: t('common.all', 'All'), count: counts.all },
            ]}
          />
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email or subject"
              aria-label="Search messages"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon="Mail"
            title={tab === 'new' ? 'No new enquiry' : 'Nothing here'}
            body="Messages submitted on the contact page land in this inbox."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((m) => (
            <article key={m.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={m.status === 'new' ? 'gold' : 'green'}>{m.status === 'new' ? 'New' : 'Replied'}</Badge>
                    <Badge tone="neutral">{TOPICS[m.subject] ?? m.subject}</Badge>
                    <span className="text-[11px] text-forest-500">{relativeTime(m.created_at, lang)}</span>
                  </div>
                  <p className="mt-1.5 font-display text-[15px] text-forest-900">{m.name}</p>
                  <p className="text-[11.5px] text-forest-500">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ''}
                    {m.country ? ` · ${m.country}` : ''}
                  </p>
                  <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-forest-700">{m.message}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <a href={mailto(m)} className="btn-outline btn-sm">
                    <MailOpen className="h-3.5 w-3.5" /> Reply by email
                  </a>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setActive(m)}>
                    Details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Enquiry detail"
        description={active?.email}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setActive(null)}>
              Close
            </button>
            {active && (
              <>
                <a href={mailto(active)} className="btn-outline btn-sm">
                  <Mail className="h-3.5 w-3.5" /> Reply by email
                </a>
                {active.status === 'new' ? (
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => void markReplied(active)}
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark replied
                  </button>
                ) : (
                  <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => void reopen(active)}>
                    Reopen
                  </button>
                )}
              </>
            )}
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <KeyValue label="Name" value={active.name} />
              <KeyValue label="Status" value={active.status} />
              <KeyValue label="Email" value={active.email} />
              <KeyValue label="Phone" value={active.phone || '—'} />
              <KeyValue label="Country" value={active.country || 'Rwanda'} />
              <KeyValue label="Received" value={formatDateTime(active.created_at, lang)} />
            </div>
            <div>
              <p className="kicker">Subject</p>
              <p className="mt-1 font-display text-[14px] text-forest-900">{TOPICS[active.subject] ?? active.subject}</p>
            </div>
            <div>
              <p className="kicker">Message</p>
              <p className="mt-1 whitespace-pre-line rounded-xl bg-forest-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-700">
                {active.message}
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-forest-500">
              Replies are sent from the operations mailbox. Marking the enquiry as replied keeps the inbox honest — the
              customer is not emailed automatically from this screen.
            </p>
          </div>
        )}
      </Modal>

      <section className="card card-pad mt-6">
        <SectionHeader title="Response standard" subtitle="What the public contact form promises." />
        <ul className="space-y-2">
          {[
            'Enquiries are answered within one working day, Monday to Saturday.',
            'Provider applications are routed to the verification queue with a same-day acknowledgement.',
            'Diaspora families receive a short call before the first property inspection is scheduled.',
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
