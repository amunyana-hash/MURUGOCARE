import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import {
  Avatar,
  Badge,
  EmptyState,
  Field,
  KeyValue,
  Modal,
  StarPicker,
  StatusBadge,
  Stars,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking, PaymentMethod, Provider, Quotation, Review } from '../../lib/types';
import { getRow, insertRow, updateRow, publishNotification } from '../../lib/db';
import { formatDate, formatDateTime, makeRef, uid } from '../../lib/format';

const timelineOrder = ['pending', 'quoted', 'confirmed', 'in_progress', 'completed'] as const;

export default function BookingDetail() {
  const { id = '' } = useParams();
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { money, toast } = usePrefs();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { rows: quotes } = useRows<Quotation>('quotations', { where: { booking_id: id } });
  const { rows: providers } = useRows<Provider>('providers');
  const { rows: reviews } = useRows<Review>('reviews', { where: { booking_id: id } });

  useEffect(() => {
    let active = true;
    getRow<Booking>('bookings', id)
      .then((row) => {
        if (active) setBooking(row);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, busy]);

  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);
  const provider = providers.find((p) => p.id === booking?.provider_id);
  const myReview = reviews[0];
  const canPay = booking && booking.amount > 0 && booking.payment_status !== 'paid' && booking.status !== 'cancelled';
  const canReview = booking && booking.status === 'completed' && !myReview;

  async function refresh() {
    const row = await getRow<Booking>('bookings', id);
    setBooking(row);
  }

  async function acceptQuote(quote: Quotation) {
    setBusy('quote');
    try {
      await updateRow<Quotation>('quotations', quote.id, { status: 'accepted' });
      for (const other of quotes.filter((q) => q.id !== quote.id && q.status === 'pending')) {
        await updateRow<Quotation>('quotations', other.id, { status: 'declined' });
      }
      await updateRow<Booking>('bookings', id, {
        status: 'confirmed',
        amount: quote.amount,
        provider_id: quote.provider_id,
        provider_name: quote.provider_name,
      });
      await publishNotification({
        user_id: 'u-provider-1',
        audience: 'provider',
        title: `Quotation accepted · ${quote.booking_ref}`,
        body: `${quote.provider_name} quoted ${money(quote.amount)}. The customer accepted — the job is confirmed.`,
        kind: 'booking',
        link: '/provider/jobs',
      });
      toast('Quotation accepted', `${quote.provider_name} · ${money(quote.amount)}`);
      await refresh();
    } catch (err) {
      toast('Could not accept quotation', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function declineQuote(quote: Quotation) {
    setBusy(`decline-${quote.id}`);
    try {
      await updateRow<Quotation>('quotations', quote.id, { status: 'declined' });
      toast('Quotation declined', `${quote.provider_name} has been informed.`);
      await refresh();
    } finally {
      setBusy('');
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    setBusy('cancel');
    try {
      await updateRow<Booking>('bookings', id, { status: 'cancelled' });
      await publishNotification({
        user_id: 'u-admin-1',
        audience: 'admin',
        title: `Booking cancelled · ${booking.ref}`,
        body: `${booking.customer_name} cancelled ${booking.category_name} scheduled for ${booking.scheduled_date}.`,
        kind: 'booking',
        link: '/admin/bookings',
      });
      toast('Booking cancelled', `${booking.ref} was cancelled. No charge applies.`);
      setCancelOpen(false);
      await refresh();
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <DashboardShell title={t('common.loading', 'Loading')} items={nav} accent={t('common.customer', 'Customer')}>
        <div className="card card-pad">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton mt-3 h-4 w-64" />
          <div className="skeleton mt-6 h-24 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (!booking) {
    return (
      <DashboardShell title={t('common.empty', 'Not found')} items={nav} accent={t('common.customer', 'Customer')}>
        <EmptyState
          icon="SearchX"
          title="Booking not found"
          body="This reference does not exist or was removed."
          action={
            <Link to="/dashboard/bookings" className="btn-primary btn-sm">
              {t('dash.myBookings', 'My bookings')}
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  const stepIndex = timelineOrder.indexOf(booking.status as (typeof timelineOrder)[number]);
  const pendingQuotes = quotes.filter((q) => q.status === 'pending');

  return (
    <DashboardShell
      title={`${booking.ref}`}
      subtitle={`${booking.category_name} · ${formatDate(booking.scheduled_date, lang)} · ${booking.time_slot}`}
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      <button type="button" onClick={() => navigate('/dashboard/bookings')} className="btn-ghost btn-sm mb-4">
        <ArrowLeft className="h-4 w-4" /> {t('dash.myBookings', 'My bookings')}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* status timeline */}
          <div className="card card-pad">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
                <StatusBadge status={booking.payment_status} />
                {booking.photo_report_requested && <Badge tone="gold">Photo report</Badge>}
              </div>
              <span className="text-[11.5px] text-forest-500">Created {formatDateTime(booking.created_at, lang)}</span>
            </div>

            {booking.status === 'cancelled' ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
                This booking was cancelled. Nothing was charged.
              </p>
            ) : (
              <ol className="mt-5 flex flex-wrap gap-1.5">
                {timelineOrder.map((step, i) => (
                  <li key={step} className="flex flex-1 items-center gap-1.5">
                    <div className="flex-1">
                      <div
                        className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-forest-600' : 'bg-forest-100'}`}
                        aria-hidden="true"
                      />
                      <p
                        className={`mt-1.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                          i <= stepIndex ? 'text-forest-800' : 'text-forest-400'
                        }`}
                      >
                        {t(`status.${step}`, step.replace('_', ' '))}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <KeyValue label={t('booking.date', 'Date')} value={formatDate(booking.scheduled_date, lang)} />
              <KeyValue label={t('booking.slot', 'Time slot')} value={booking.time_slot} />
              <KeyValue label={t('booking.address', 'Address')} value={`${booking.address}, ${booking.sector}`} />
              <KeyValue label={t('common.district', 'District')} value={booking.district} />
              <KeyValue label={t('booking.recurring', 'Frequency')} value={booking.recurring ?? 'once'} />
              <KeyValue label={t('common.amount', 'Amount')} value={money(booking.amount)} />
              <KeyValue
                label={t('booking.forFamily', 'Family desk')}
                value={booking.for_family ? t('common.yes', 'Yes') : t('common.no', 'No')}
              />
              <KeyValue
                label={t('booking.paymentMethod', 'Payment method')}
                value={booking.payment_method ? booking.payment_method.replace('_', ' ') : '—'}
              />
            </div>

            {booking.notes && (
              <div className="mt-3 rounded-xl bg-forest-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-500">{t('booking.notes', 'Notes')}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-forest-800">{booking.notes}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-forest-50 pt-4">
              {canPay && (
                <button type="button" className="btn-primary btn-sm" onClick={() => setPayOpen(true)}>
                  <Wallet className="h-4 w-4" /> {t('booking.payNow', 'Pay now')} · {money(booking.amount)}
                </button>
              )}
              {canReview && (
                <button type="button" className="btn-gold btn-sm" onClick={() => setReviewOpen(true)}>
                  <Star className="h-4 w-4" /> {t('booking.reviewProvider', 'Review provider')}
                </button>
              )}
              {myReview && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest-800">
                  <ShieldCheck className="h-4 w-4" /> You rated this visit {myReview.rating}/5
                </span>
              )}
              {['pending', 'quoted', 'confirmed'].includes(booking.status) && (
                <button type="button" className="btn-danger btn-sm" onClick={() => setCancelOpen(true)}>
                  <X className="h-4 w-4" /> {t('booking.cancel', 'Cancel booking')}
                </button>
              )}
              <Link to="/dashboard/complaints" className="btn-outline btn-sm">
                <AlertTriangle className="h-4 w-4" /> {t('dash.complaints', 'Report a problem')}
              </Link>
            </div>
          </div>

          {/* quotations */}
          <div className="card card-pad">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg text-forest-900">{t('dash.quotes', 'Quotations')}</h2>
              <span className="text-[11.5px] text-forest-500">{quotes.length} received</span>
            </div>
            {quotes.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-forest-200 px-4 py-5 text-center text-[12.5px] text-forest-600">
                No quotation yet. Verified providers usually respond within a few hours during working days.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {quotes.map((q) => (
                  <li
                    key={q.id}
                    className={`rounded-xl border p-3.5 ${
                      q.status === 'accepted' ? 'border-forest-400 bg-forest-50/50' : 'border-forest-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[13px] font-semibold text-forest-900">
                          {q.provider_name}
                          {q.status === 'accepted' && <Badge tone="green">Accepted</Badge>}
                          {q.status === 'declined' && <Badge tone="neutral">Declined</Badge>}
                        </p>
                        <p className="mt-1 max-w-md text-[12px] leading-relaxed text-forest-600">{q.message}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-forest-500">
                          <Clock className="h-3 w-3" /> Ready in {q.eta_days} day(s) · {formatDate(q.created_at, lang)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl text-forest-900">{money(q.amount)}</p>
                        {q.status === 'pending' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              disabled={busy === 'quote'}
                              onClick={() => void acceptQuote(q)}
                            >
                              {busy === 'quote' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              {t('booking.acceptQuote', 'Accept')}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              disabled={busy === `decline-${q.id}`}
                              onClick={() => void declineQuote(q)}
                            >
                              {t('booking.declineQuote', 'Decline')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pendingQuotes.length > 1 && (
              <p className="mt-3 text-[11.5px] leading-relaxed text-forest-500">
                Accepting one quotation automatically declines the others. The accepted price replaces the estimate.
              </p>
            )}
          </div>

          {booking.completion_report && (
            <div className="card card-pad">
              <h2 className="font-display text-lg text-forest-900">Completion report</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-forest-700">{booking.completion_report}</p>
              {booking.media_urls && booking.media_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {booking.media_urls.map((m) => (
                    <span key={m} className="chip">
                      {m}
                    </span>
                  ))}
                </div>
              )}
              <Link to="/family/reports" className="btn-outline btn-sm mt-3">
                Open the family desk reports
              </Link>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker">{t('common.provider', 'Provider')}</p>
            {provider ? (
              <>
                <div className="mt-2.5 flex items-center gap-3">
                  <Avatar name={provider.full_name} size={44} color="#1D6248" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-forest-900">{provider.business_name}</p>
                    <p className="truncate text-[11.5px] text-forest-600">{provider.full_name}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Stars rating={provider.rating} showValue size={13} />
                  <Badge tone={provider.verification_status === 'verified' ? 'green' : 'amber'}>
                    {provider.verification_status === 'verified' ? t('common.verified', 'Verified') : t('common.pending', 'Pending')}
                  </Badge>
                </div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-forest-600">{provider.bio}</p>
                <div className="mt-3 space-y-2.5">
                  <KeyValue label={t('common.sector', 'Sector')} value={provider.sector} />
                  <KeyValue label={t('common.rating', 'Jobs completed')} value={provider.jobs_completed} />
                  <KeyValue
                    label={t('common.phone', 'Phone')}
                    value={
                      <a href={`tel:${provider.phone}`} className="inline-flex items-center gap-1 text-forest-800 underline">
                        <Phone className="h-3 w-3" /> {provider.phone}
                      </a>
                    }
                  />
                </div>
                <Link to={`/providers`} className="btn-outline btn-sm mt-3 w-full">
                  View provider profile
                </Link>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-[12.5px] leading-relaxed text-forest-600">
                  No provider assigned yet. A coordinator matches a verified professional and sends you their profile.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2.5 text-[11.5px] text-forest-700">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Every provider is ID-checked before their first job.
                </div>
              </div>
            )}
          </div>

          <div className="card card-pad">
            <p className="kicker">Schedule</p>
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-forest-50/70 px-3 py-3">
              <CalendarDays className="h-5 w-5 text-forest-700" />
              <div>
                <p className="text-[12.5px] font-semibold text-forest-900">{formatDate(booking.scheduled_date, lang)}</p>
                <p className="text-[11.5px] text-forest-600">{booking.time_slot}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-forest-100 px-3 py-3">
              <MapPin className="h-5 w-5 text-gold-600" />
              <div>
                <p className="text-[12.5px] font-semibold text-forest-900">{booking.sector}</p>
                <p className="text-[11.5px] text-forest-600">{booking.address}</p>
              </div>
            </div>
            <Link to="/contact" className="btn-ghost btn-sm mt-3 w-full">
              <MessageSquare className="h-4 w-4" /> {t('dash.contactSupport', 'Request a schedule change')}
            </Link>
          </div>
        </aside>
      </div>

      <PaymentModal
        open={payOpen}
        booking={booking}
        onClose={() => setPayOpen(false)}
        onPaid={async () => {
          setPayOpen(false);
          toast('Payment received', `Receipt sent for ${booking.ref}.`);
          await refresh();
        }}
      />

      <ReviewModal
        open={reviewOpen}
        booking={booking}
        onClose={() => setReviewOpen(false)}
        onSubmitted={async () => {
          setReviewOpen(false);
          toast('Thank you for your review', 'It is now visible on the provider page.');
          await refresh();
        }}
      />

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('booking.cancel', 'Cancel booking')}
        description={`${booking.ref} · ${booking.category_name}`}
        footer={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setCancelOpen(false)}>
              {t('common.close', 'Keep booking')}
            </button>
            <button type="button" className="btn-danger btn-sm" disabled={busy === 'cancel'} onClick={() => void cancelBooking()}>
              {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {t('booking.cancel', 'Cancel booking')}
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-forest-700">
          Cancelling is free while the job has not started. The assigned provider and the coordinator are notified
          immediately, and any pending quotations are closed.
        </p>
      </Modal>
    </DashboardShell>
  );
}

function PaymentModal({
  open,
  booking,
  onClose,
  onPaid,
}: {
  open: boolean;
  booking: Booking;
  onClose: () => void;
  onPaid: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { money, toast } = usePrefs();
  const [method, setMethod] = useState<PaymentMethod>(booking.payment_method ?? 'mtn_momo');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);

  const methods: { value: PaymentMethod; label: string }[] = [
    { value: 'mtn_momo', label: 'MTN Mobile Money' },
    { value: 'airtel_money', label: 'Airtel Money' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'card', label: 'Card (Visa / Mastercard)' },
    { value: 'cash', label: 'Cash to provider' },
  ];

  async function pay() {
    if (!profile) return;
    if (!phone.trim() && method !== 'cash' && method !== 'bank_transfer') {
      toast('Enter a mobile money number', 'Use the format 07XX XXX XXX.', 'error');
      return;
    }
    setBusy(true);
    try {
      const providerRef =
        method === 'mtn_momo'
          ? `MOMO-${Math.floor(10000000 + Math.random() * 89999999)}`
          : method === 'airtel_money'
            ? `AIRTEL-${Math.floor(1000000 + Math.random() * 8999999)}`
            : method === 'bank_transfer'
              ? `BK-${makeRef('TRF').split('-')[1]}`
              : method === 'card'
                ? `CARD-${Math.floor(100000 + Math.random() * 899999)}`
                : `CASH-${booking.ref}`;

      await insertRow('payments', {
        id: uid(),
        booking_id: booking.id,
        booking_ref: booking.ref,
        customer_id: profile.id,
        customer_name: profile.full_name,
        amount: booking.amount,
        method,
        status: 'succeeded',
        provider_ref: providerRef,
        description: `${booking.category_name} — ${booking.sector}`,
        created_at: new Date().toISOString(),
      });
      await updateRow<Booking>('bookings', booking.id, { payment_status: 'paid', payment_method: method });
      await publishNotification({
        user_id: profile.id,
        audience: 'customer',
        title: `Payment confirmed · ${booking.ref}`,
        body: `${money(booking.amount)} received via ${method.replace('_', ' ')}. Reference ${providerRef}.`,
        kind: 'payment',
        link: `/dashboard/bookings/${booking.id}`,
      });
      await publishNotification({
        user_id: 'u-admin-1',
        audience: 'admin',
        title: `Payment received · ${booking.ref}`,
        body: `${money(booking.amount)} from ${profile.full_name} via ${method.replace('_', ' ')}.`,
        kind: 'payment',
        link: '/admin/payments',
      });
      await onPaid();
    } catch (err) {
      toast('Payment failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('booking.payNow', 'Pay now')}
      description={`${booking.ref} · ${money(booking.amount)}`}
      footer={
        <>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void pay()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            Pay {money(booking.amount)}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('booking.paymentMethod', 'Payment method')} htmlFor="pay-method">
          <div className="relative">
            <select id="pay-method" className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {methods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
        {method === 'mtn_momo' || method === 'airtel_money' ? (
          <Field label={t('common.phone', 'Mobile money number')} hint="A payment prompt is sent to this number." htmlFor="pay-phone">
            <TextInput id="pay-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0788 123 456" />
          </Field>
        ) : method === 'bank_transfer' ? (
          <div className="rounded-xl bg-forest-50 px-4 py-3 text-[12.5px] leading-relaxed text-forest-800">
            Bank of Kigali · URUGOCARE Ltd · Account <strong>00012345678</strong> · Use <strong>{booking.ref}</strong> as the
            reference. Confirm below once the transfer is done.
          </div>
        ) : method === 'card' ? (
          <div className="rounded-xl bg-forest-50 px-4 py-3 text-[12.5px] leading-relaxed text-forest-800">
            Card collection is handled by our PCI-compliant gateway. Confirm below to receive a secure checkout link by
            email.
          </div>
        ) : (
          <div className="rounded-xl bg-gold-50 px-4 py-3 text-[12.5px] leading-relaxed text-gold-900">
            Pay the provider in cash after the visit. Tap confirm so we can mark the receipt as recorded.
          </div>
        )}
        <div className="flex items-center justify-between rounded-xl border border-forest-100 px-4 py-3">
          <span className="text-[12.5px] text-forest-600">{t('common.total', 'Total')}</span>
          <span className="font-display text-xl text-forest-900">{money(booking.amount)}</span>
        </div>
      </div>
    </Modal>
  );
}

function ReviewModal({
  open,
  booking,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  booking: Booking;
  onClose: () => void;
  onSubmitted: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { toast } = usePrefs();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!profile || !booking.provider_id) {
      toast('No provider to review', 'This booking has no assigned provider yet.', 'error');
      return;
    }
    if (comment.trim().length < 10) {
      toast('Add a short comment', 'At least ten characters helps other families.', 'error');
      return;
    }
    setBusy(true);
    try {
      await insertRow('reviews', {
        id: uid(),
        booking_id: booking.id,
        provider_id: booking.provider_id,
        provider_name: booking.provider_name ?? 'Provider',
        customer_id: profile.id,
        customer_name: profile.full_name,
        rating,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      });
      await publishNotification({
        user_id: 'u-provider-1',
        audience: 'provider',
        title: `New ${rating}-star review`,
        body: `${profile.full_name} reviewed ${booking.ref}: “${comment.trim().slice(0, 90)}”`,
        kind: 'system',
        link: '/provider/reviews',
      });
      await onSubmitted();
    } catch (err) {
      toast('Review not saved', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('booking.reviewProvider', 'Review the provider')}
      description={`${booking.ref} · ${booking.provider_name ?? ''}`}
      footer={
        <>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            {t('common.submit', 'Submit review')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <StarPicker value={rating} onChange={setRating} label={t('common.rating', 'Rating')} />
        <Field label={t('common.message', 'Comment')} required htmlFor="rev-comment">
          <TextArea
            id="rev-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Was the work on time, clean and complete? Your note helps other Bugesera families."
          />
        </Field>
        <p className="text-[11.5px] leading-relaxed text-forest-500">
          Reviews are public on the provider profile and cannot be removed by the provider.
        </p>
      </div>
    </Modal>
  );
}
