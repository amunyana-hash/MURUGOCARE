import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  PlayCircle,
  Send,
  User,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Badge,
  EmptyState,
  Field,
  KeyValue,
  Modal,
  SectionHeader,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking, Provider, Quotation, Review } from '../../lib/types';
import { getRow, insertRow, publishNotification, updateRow } from '../../lib/db';
import { formatDate, formatDateTime, makeRef, uid } from '../../lib/format';

export default function ProviderJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();

  const [job, setJob] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState('');
  const [media, setMedia] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteEta, setQuoteEta] = useState('2');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];
  const providerId = provider?.id ?? '__none__';

  const { rows: quotes } = useRows<Quotation>('quotations', { where: { booking_id: id ?? '__none__' } });
  const { rows: reviews } = useRows<Review>('reviews', { where: { booking_id: id ?? '__none__' } });

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      const row = await getRow<Booking>('bookings', id);
      if (alive) {
        setJob(row);
        setLoading(false);
        if (row?.completion_report) setReport(row.completion_report);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [id]);

  const nav = providerNav(t as never);
  const myQuote = useMemo(() => quotes.find((q) => q.provider_id === providerId), [quotes, providerId]);
  const review = reviews[0];

  async function patchJob(patch: Partial<Booking>, title: string, body: string) {
    if (!job) return;
    setBusy(true);
    try {
      await updateRow<Booking>('bookings', job.id, patch);
      const fresh = await getRow<Booking>('bookings', job.id);
      setJob(fresh);
      await publishNotification({
        user_id: job.customer_id,
        audience: 'customer',
        title,
        body,
        kind: 'booking',
        link: `/dashboard/bookings/${job.id}`,
      });
      toast(title, job.ref);
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function startJob() {
    if (!job) return;
    await patchJob(
      { status: 'in_progress' },
      'Provider started the job',
      `${provider?.full_name ?? 'Your provider'} has started work on ${job.category_name} at ${job.sector}.`,
    );
  }

  async function completeJob() {
    if (!job) return;
    if (report.trim().length < 20) {
      setErrors({ report: 'Describe the work performed in at least 20 characters.' });
      return;
    }
    setErrors({});
    const mediaList = media
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ kind: 'photo' as const, label }));
    setBusy(true);
    try {
      await updateRow<Booking>('bookings', job.id, {
        status: 'completed',
        completion_report: report.trim(),
        media_urls: mediaList.map((m) => m.label),
        completed_at: new Date().toISOString(),
      });
      const fresh = await getRow<Booking>('bookings', job.id);
      setJob(fresh);
      await publishNotification({
        user_id: job.customer_id,
        audience: 'customer',
        title: 'Job completed — report ready',
        body: `${job.category_name} at ${job.sector} was completed. ${mediaList.length} photo note(s) attached to your report.`,
        kind: 'report',
        link: `/dashboard/bookings/${job.id}`,
      });
      if (job.for_family && job.property_id) {
        await insertRow('care_reports', {
          id: uid(),
          owner_id: job.customer_id,
          property_id: job.property_id,
          family_member_id: job.family_member_id ?? null,
          booking_ref: job.ref,
          title: `${job.category_name} — ${job.ref}`,
          summary: report.trim(),
          type: 'maintenance',
          media: mediaList,
          status: 'submitted',
          author_name: provider?.full_name ?? 'URUGOCARE provider',
          date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        });
      }
      if (provider && provider.jobs_completed < 9999) {
        await updateRow<Provider>('providers', provider.id, { jobs_completed: provider.jobs_completed + 1 });
      }
      setReportOpen(false);
      setMedia('');
      toast('Completion submitted', 'The customer and coordinator were notified.');
    } catch (err) {
      toast('Could not complete job', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitQuote() {
    if (!job || !provider) return;
    const amount = Number(quoteAmount);
    const next: Record<string, string> = {};
    if (!quoteAmount || Number.isNaN(amount) || amount < 1000) next.amount = 'Enter a quote of at least RWF 1,000.';
    if (quoteMessage.trim().length < 15) next.message = 'Explain what is included in at least 15 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (myQuote) {
        await updateRow<Quotation>('quotations', myQuote.id, {
          amount,
          message: quoteMessage.trim(),
          eta_days: Number(quoteEta) || 1,
          status: 'pending',
        });
      } else {
        await insertRow('quotations', {
          id: uid(),
          booking_id: job.id,
          booking_ref: job.ref,
          provider_id: provider.id,
          provider_name: provider.full_name,
          amount,
          message: quoteMessage.trim(),
          eta_days: Number(quoteEta) || 1,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
      if (job.status === 'pending') {
        await updateRow<Booking>('bookings', job.id, { status: 'quoted' });
        const fresh = await getRow<Booking>('bookings', job.id);
        setJob(fresh);
      }
      await publishNotification({
        user_id: job.customer_id,
        audience: 'customer',
        title: 'New quotation received',
        body: `${provider.full_name} quoted ${money(amount)} for ${job.category_name} (${job.ref}).`,
        kind: 'booking',
        link: `/dashboard/bookings/${job.id}`,
      });
      setQuoteOpen(false);
      toast('Quotation sent', `${money(amount)} for ${job.ref}`);
    } catch (err) {
      toast('Quotation not sent', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title={t('provider.myJobs', 'Job')} items={nav} accent={t('roles.provider', 'Provider')}>
        <div className="card card-pad flex items-center gap-2 text-[13px] text-forest-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading job…
        </div>
      </DashboardShell>
    );
  }

  if (!job) {
    return (
      <DashboardShell title={t('provider.myJobs', 'Job')} items={nav} accent={t('roles.provider', 'Provider')}>
        <EmptyState
          icon="SearchX"
          title="Job not found"
          body="This job may have been reassigned or removed."
          action={
            <Link to="/provider/jobs" className="btn-primary btn-sm">
              Back to my jobs
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  const timeline = [
    { label: 'Request created', at: job.created_at, done: true },
    { label: 'Quotation sent', at: myQuote?.created_at, done: Boolean(myQuote) },
    { label: 'Booking confirmed', at: job.status !== 'pending' && job.status !== 'quoted' ? job.created_at : null, done: ['confirmed', 'in_progress', 'completed'].includes(job.status) },
    { label: 'Work started', at: null, done: ['in_progress', 'completed'].includes(job.status) },
    { label: 'Completed', at: job.completed_at, done: job.status === 'completed' },
  ];

  return (
    <DashboardShell
      title={`${job.category_name}`}
      subtitle={`${job.ref} · ${formatDate(job.scheduled_date, lang)} at ${job.time_slot}`}
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <button type="button" className="btn-ghost btn-sm mb-4" onClick={() => navigate('/provider/jobs')}>
        <ArrowLeft className="h-4 w-4" /> {t('provider.myJobs', 'My jobs')}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={job.status} />
                  <StatusBadge status={job.payment_status} />
                  {job.for_family && <Badge tone="blue">Diaspora request</Badge>}
                  {job.photo_report_requested && <Badge tone="gold">Photo report required</Badge>}
                </div>
                <h2 className="mt-2 font-display text-xl text-forest-900">{job.category_name}</h2>
                <p className="mt-0.5 text-[12px] text-forest-600">
                  Customer: <span className="font-semibold text-forest-900">{job.customer_name}</span>
                </p>
              </div>
              <p className="font-display text-2xl text-forest-900">{money(job.amount)}</p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <KeyValue label={t('common.date', 'Scheduled date')} value={formatDate(job.scheduled_date, lang)} />
              <KeyValue label="Time slot" value={job.time_slot} />
              <KeyValue label="District / sector" value={`${job.sector}, ${job.district}`} />
              <KeyValue label="Payment" value={`${job.payment_status}${job.payment_method ? ` · ${job.payment_method}` : ''}`} />
              <KeyValue label="Address" value={job.address} />
              <KeyValue label="Requested" value={formatDateTime(job.created_at, lang)} />
            </div>

            {job.notes && (
              <div className="mt-3 rounded-xl bg-forest-50/70 px-4 py-3">
                <p className="kicker mb-1">Customer notes</p>
                <p className="text-[12.5px] leading-relaxed text-forest-700">{job.notes}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {job.status === 'confirmed' && (
                <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void startJob()}>
                  <PlayCircle className="h-4 w-4" /> Start job
                </button>
              )}
              {job.status === 'in_progress' && (
                <button type="button" className="btn-primary btn-sm" onClick={() => setReportOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Submit completion report
                </button>
              )}
              {['pending', 'quoted'].includes(job.status) && (
                <button
                  type="button"
                  className="btn-gold btn-sm"
                  onClick={() => {
                    setQuoteAmount(myQuote ? String(myQuote.amount) : String(job.amount));
                    setQuoteMessage(myQuote?.message ?? '');
                    setQuoteEta(String(myQuote?.eta_days ?? 2));
                    setErrors({});
                    setQuoteOpen(true);
                  }}
                >
                  <Send className="h-4 w-4" /> {myQuote ? 'Revise quotation' : 'Send quotation'}
                </button>
              )}
              {job.status === 'completed' && (
                <span className="badge badge-green">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed — awaiting payment settlement
                </span>
              )}
              <a href={`tel:${job.customer_id}`} className="btn-outline btn-sm" onClick={(e) => e.preventDefault()}>
                <Phone className="h-4 w-4" /> Customer phone visible after confirmation
              </a>
            </div>
          </section>

          {job.completion_report && (
            <section className="card card-pad">
              <SectionHeader title="Completion report" subtitle="Submitted by you after the visit." />
              <p className="text-[12.5px] leading-relaxed text-forest-700">{job.completion_report}</p>
              {job.media_urls && job.media_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.media_urls.map((m, i) => (
                    <span
                      key={`${job.id}-media-${i}`}
                      className="flex items-center gap-1.5 rounded-lg border border-forest-100 bg-forest-50/60 px-2.5 py-1.5 text-[11px] font-medium text-forest-700"
                    >
                      <Camera className="h-3.5 w-3.5" /> {m}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-outline btn-sm" onClick={() => setReportOpen(true)}>
                  Update report
                </button>
              </div>
            </section>
          )}

          {review && (
            <section className="card card-pad">
              <SectionHeader title="Customer review" />
              <div className="rounded-xl border border-forest-100 px-4 py-3">
                <p className="text-[12.5px] font-semibold text-forest-900">{review.customer_name}</p>
                <p className="text-[11.5px] text-gold-600">{'★'.repeat(review.rating)}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-forest-700">{review.comment}</p>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Job timeline
            </p>
            <ol className="mt-3 space-y-3">
              {timeline.map((s) => (
                <li key={s.label} className="flex gap-2.5">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      s.done ? 'bg-forest-600 text-white' : 'border border-forest-200 bg-white'
                    }`}
                  >
                    {s.done && <CheckCircle2 className="h-2.5 w-2.5" />}
                  </span>
                  <span>
                    <span className={`block text-[12.5px] font-semibold ${s.done ? 'text-forest-900' : 'text-forest-400'}`}>
                      {s.label}
                    </span>
                    {s.at && <span className="block text-[10.5px] text-forest-400">{formatDateTime(s.at, lang)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card card-pad">
            <p className="kicker flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Location
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-forest-700">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {job.address}, {job.sector}, {job.district}
            </p>
            <p className="mt-2 text-[11.5px] text-forest-500">
              The coordinator shares the caretaker number once the visit is confirmed.
            </p>
            <Link to="/provider/marketplace" className="btn-outline btn-sm mt-3 w-full">
              Find more jobs
            </Link>
          </div>

          {myQuote && (
            <div className="card card-pad">
              <p className="kicker flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" /> Your quotation
              </p>
              <p className="mt-2 font-display text-xl text-forest-900">{money(myQuote.amount)}</p>
              <div className="mt-1.5 space-y-1.5 text-[12px] text-forest-600">
                <p>ETA: {myQuote.eta_days} day(s)</p>
                <p>
                  Status: <StatusBadge status={myQuote.status} />
                </p>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-forest-600">{myQuote.message}</p>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Completion report"
        description="What did you do on site? This is sent to the customer, including diaspora clients."
        wide
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setReportOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void completeJob()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit report
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Work performed"
            required
            error={errors.report}
            htmlFor="rep-work"
            hint="Mention arrival time, tasks completed, materials used and anything needing follow-up."
          >
            <TextArea
              id="rep-work"
              rows={6}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              invalid={Boolean(errors.report)}
              placeholder="Arrived 09:10, replaced kitchen tap washer, tested for leaks, cleaned the area. Recommend replacing the bathroom pipe next month."
            />
          </Field>
          <Field label="Photo notes (one per line)" htmlFor="rep-media" hint="e.g. 'Kitchen before repair', 'New tap installed'.">
            <TextArea
              id="rep-media"
              rows={3}
              value={media}
              onChange={(e) => setMedia(e.target.value)}
              placeholder={'Kitchen sink before\nNew tap installed\nCompound gate checked'}
            />
          </Field>
          <div className="rounded-xl bg-forest-50/70 px-4 py-3 text-[11.5px] leading-relaxed text-forest-700">
            Submitting marks the job completed and notifies the customer. For diaspora requests a care report entry is
            created automatically in the family desk.
          </div>
        </div>
      </Modal>

      <Modal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        title={myQuote ? 'Revise quotation' : 'Send a quotation'}
        description={`${job.ref} · ${job.category_name}`}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setQuoteOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void submitQuote()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send quote
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (RWF)" required error={errors.amount} htmlFor="q-amount">
            <TextInput
              id="q-amount"
              type="number"
              min={1000}
              step={500}
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              invalid={Boolean(errors.amount)}
              placeholder="25000"
            />
          </Field>
          <Field label="Delivery time (days)" htmlFor="q-eta">
            <TextInput id="q-eta" type="number" min={1} max={60} value={quoteEta} onChange={(e) => setQuoteEta(e.target.value)} />
          </Field>
          <Field label="What is included" required error={errors.message} htmlFor="q-msg">
            <TextArea
              id="q-msg"
              rows={4}
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              invalid={Boolean(errors.message)}
              placeholder="Labour, transport and materials for a full deep clean of 3 bedrooms and 2 bathrooms."
            />
          </Field>
          <p className="text-[11px] text-forest-500">
            Quotations are binding for 7 days. The customer sees your rating and verification badge alongside the price.
          </p>
        </div>
      </Modal>
    </DashboardShell>
  );
}
