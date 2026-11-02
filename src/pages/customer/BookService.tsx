import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  CreditCard,
  Loader2,
  MapPin,
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
  Badge,
  Checkbox,
  Field,
  KeyValue,
  RadioCard,
  SelectField,
  Stars,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/ui';
import type { Booking, FamilyMember, PaymentMethod, Property, Provider, Quotation } from '../../lib/types';
import { insertRow, publishNotification } from '../../lib/db';
import { addDaysISO, makeRef, todayISO, uid } from '../../lib/format';

const steps = ['service', 'details', 'schedule', 'review', 'payment'] as const;
type Step = (typeof steps)[number];

const slots = ['08:00 – 10:00', '10:00 – 12:00', '12:00 – 14:00', '14:00 – 16:00', '16:00 – 18:00'];

const payMethods: { value: PaymentMethod; label: string; note: string }[] = [
  { value: 'mtn_momo', label: 'MTN Mobile Money', note: 'Pay from your MoMo wallet · *182#' },
  { value: 'airtel_money', label: 'Airtel Money', note: 'Pay from your Airtel wallet' },
  { value: 'bank_transfer', label: 'Bank transfer', note: 'Bank of Kigali · 00012345678' },
  { value: 'cash', label: 'Cash on completion', note: 'Pay the provider directly after the visit' },
];

export default function BookService({ familyMode = false }: { familyMode?: boolean }) {
  const { t, categoryName, lang } = useI18n();
  const { money, toast } = usePrefs();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { categories } = useCategories();

  const { rows: allProviders } = useRows<Provider>('providers', { where: { verification_status: 'verified' } });
  const { rows: properties } = useRows<Property>('properties', { where: profile ? { owner_id: profile.id } : {} });
  const { rows: relatives } = useRows<FamilyMember>('family_members', { where: profile ? { owner_id: profile.id } : {} });

  const [step, setStep] = useState<Step>('service');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Booking | null>(null);

  const initialSlug = params.get('service') ?? '';
  const initialProvider = params.get('provider') ?? '';

  const [form, setForm] = useState({
    category_slug: initialSlug,
    provider_id: initialProvider,
    for_family: familyMode,
    property_id: '',
    family_member_id: '',
    address: profile?.district ? 'Nyamata, Bugesera' : '',
    sector: 'Nyamata',
    date: addDaysISO(1),
    slot: slots[1],
    notes: '',
    recurring: 'once',
    photo_report: familyMode,
    payment_method: 'mtn_momo' as PaymentMethod,
    request_quote: false,
  });

  const category = categories.find((c) => c.slug === form.category_slug);
  const matchingProviders = useMemo(
    () => allProviders.filter((p) => p.category_slugs.includes(form.category_slug)),
    [allProviders, form.category_slug],
  );
  const selectedProvider = allProviders.find((p) => p.id === form.provider_id);
  const estimate = category ? category.base_price : 0;
  const total = estimate;

  const nav = profile?.is_diaspora || familyMode ? familyNav(t as never) : customerNav(t as never);
  const stepIndex = steps.indexOf(step);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate(current: Step): boolean {
    const next: Record<string, string> = {};
    if (current === 'service' && !form.category_slug) next.category_slug = 'Choose the service you need.';
    if (current === 'details') {
      if (!form.address.trim()) next.address = 'Enter the address where the service happens.';
      if (form.for_family && !form.family_member_id) next.family_member_id = 'Select the relative this service is for.';
    }
    if (current === 'schedule' && !form.date) next.date = 'Choose a date.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validate(step)) return;
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)]);
  }

  function goBack() {
    setStep(steps[Math.max(stepIndex - 1, 0)]);
  }

  async function submitBooking() {
    if (!profile || !category) return;
    setBusy(true);
    try {
      const ref = makeRef('UGC');
      const booking: Booking = {
        id: uid(),
        ref,
        customer_id: profile.id,
        customer_name: profile.full_name,
        provider_id: form.provider_id || null,
        provider_name: selectedProvider?.business_name ?? null,
        category_slug: category.slug,
        category_name: categoryName(category),
        status: form.request_quote || form.provider_id ? 'quoted' : 'pending',
        scheduled_date: form.date,
        time_slot: form.slot,
        address: form.address.trim(),
        district: 'Bugesera',
        sector: form.sector,
        notes: form.notes.trim() || undefined,
        amount: form.request_quote ? 0 : total,
        payment_status: form.payment_method === 'cash' ? 'unpaid' : 'unpaid',
        payment_method: form.payment_method,
        for_family: form.for_family,
        property_id: form.property_id || null,
        family_member_id: form.family_member_id || null,
        recurring: form.recurring,
        photo_report_requested: form.photo_report,
        completion_report: null,
        media_urls: [],
        created_at: new Date().toISOString(),
      };
      const saved = await insertRow<Booking>('bookings', booking);
      setCreated(saved);

      await publishNotification({
        user_id: profile.id,
        audience: 'customer',
        title: `Booking ${ref} received`,
        body: `${categoryName(category)} on ${form.date} · ${form.slot}. ${
          form.request_quote ? 'Providers will send quotations shortly.' : 'We are matching a verified provider now.'
        }`,
        kind: 'booking',
        link: `/dashboard/bookings/${saved.id}`,
      });
      await publishNotification({
        user_id: 'u-admin-1',
        audience: 'admin',
        title: `New booking ${ref}`,
        body: `${profile.full_name} booked ${categoryName(category)} in ${form.sector}, Bugesera.`,
        kind: 'booking',
        link: '/admin/bookings',
      });

      if (form.provider_id) {
        const provider = allProviders.find((p) => p.id === form.provider_id);
        await publishNotification({
          user_id: provider?.user_id ?? 'u-provider-1',
          audience: 'provider',
          title: `New job request ${ref}`,
          body: `${categoryName(category)} in ${form.sector} on ${form.date}. Open the marketplace to send your quotation.`,
          kind: 'booking',
          link: '/provider/marketplace',
        });
      }

      toast(t('booking.created', 'Booking created'), `${ref} · ${categoryName(category)}`);
    } catch (err) {
      toast('Booking not saved', err instanceof Error ? err.message : 'Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <DashboardShell
        title={t('booking.created', 'Booking created')}
        subtitle={`${created.ref} · ${created.category_name}`}
        items={nav}
        accent={t('nav.services', 'Services')}
      >
        <div className="mx-auto max-w-2xl">
          <div className="card card-pad text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <ClipboardCheck className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-2xl text-forest-900">
              {t('booking.createdBody', 'Your request is with the URUGOCARE team.')}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-forest-600">
              Reference <strong className="text-forest-900">{created.ref}</strong>. A coordinator confirms the provider
              and quotation within one working day. You will receive a notification for every change.
            </p>
            <div className="mt-5 grid gap-2.5 text-left sm:grid-cols-2">
              <KeyValue label={t('common.date', 'Date')} value={`${created.scheduled_date} · ${created.time_slot}`} />
              <KeyValue label={t('common.address', 'Address')} value={`${created.sector}, ${created.district}`} />
              <KeyValue label={t('common.amount', 'Amount')} value={created.amount ? money(created.amount) : 'Quotation pending'} />
              <KeyValue label={t('common.status', 'Status')} value={<StatusBadge status={created.status} />} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to={`/dashboard/bookings/${created.id}`} className="btn-primary">
                {t('booking.viewBooking', 'View booking')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to={familyMode ? '/family' : '/dashboard'} className="btn-outline">
                {t('nav.dashboard', 'Dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={familyMode ? t('family.bookForRelative', 'Book for a relative') : t('booking.title', 'Book a service')}
      subtitle={t('booking.subtitle', 'Choose a service, tell us where and when, then confirm. No payment is taken before a price is agreed.')}
      items={nav}
      accent={familyMode ? t('nav.family', 'Family desk') : t('nav.services', 'Services')}
    >
      {/* stepper */}
      <ol className="mb-6 flex flex-wrap items-center gap-2">
        {steps.map((s, i) => {
          const active = s === step;
          const done = i < stepIndex;
          return (
            <li key={s} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i <= stepIndex && setStep(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                  active
                    ? 'bg-forest-800 text-white'
                    : done
                      ? 'bg-forest-50 text-forest-700'
                      : 'bg-white text-forest-400 ring-1 ring-forest-100'
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px]">
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {t(`booking.step.${s}`, s)}
              </button>
              {i < steps.length - 1 && <span className="hidden h-px w-4 bg-forest-200 sm:block" />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="card card-pad">
          {step === 'service' && (
            <div>
              <h2 className="font-display text-xl text-forest-900">{t('booking.step.service', 'Service')}</h2>
              <p className="mt-1 text-[13px] text-forest-600">Pick the category that matches your need.</p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {categories.map((c) => (
                  <RadioCard
                    key={c.id}
                    name="category"
                    checked={form.category_slug === c.slug}
                    onChange={() => set('category_slug', c.slug)}
                    title={categoryName(c)}
                    description={`${money(c.base_price)} / ${c.unit}`}
                    icon={<Sparkles className="h-4 w-4 text-gold-600" />}
                  />
                ))}
              </div>
              {errors.category_slug && <p className="err mt-2">{errors.category_slug}</p>}

              <div className="mt-6">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-forest-700">{t('booking.providerOptional', 'Preferred provider (optional)')}</h3>
                <p className="mt-1 text-[12px] text-forest-600">
                  {t('booking.anyProvider', 'Leave empty and our team assigns the best-rated verified professional.')}
                </p>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => set('provider_id', '')}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      form.provider_id === '' ? 'border-forest-500 bg-forest-50/60' : 'border-forest-100 hover:border-forest-300'
                    }`}
                  >
                    <span className="text-[13px] font-semibold text-forest-900">{t('booking.anyProvider', 'Assign automatically')}</span>
                    <span className="mt-0.5 block text-[11.5px] text-forest-500">Best rated available professional for this category</span>
                  </button>
                  {matchingProviders.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set('provider_id', p.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                        form.provider_id === p.id ? 'border-forest-500 bg-forest-50/60' : 'border-forest-100 hover:border-forest-300'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-forest-900">{p.business_name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-forest-500">
                          <Stars rating={p.rating} size={11} showValue /> · {p.jobs_completed} jobs · {money(p.hourly_rate)}/hr
                        </span>
                      </span>
                      <Badge tone={p.available ? 'green' : 'neutral'}>{p.available ? t('common.active', 'Available') : t('common.paused', 'Busy')}</Badge>
                    </button>
                  ))}
                  {form.category_slug && matchingProviders.length === 0 && (
                    <p className="rounded-xl border border-dashed border-forest-200 px-3 py-3 text-[12px] text-forest-600">
                      No verified provider is listed for this category yet — submit the request and the team will source
                      one for you.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div>
              <h2 className="font-display text-xl text-forest-900">{t('booking.step.details', 'Details')}</h2>
              <p className="mt-1 text-[13px] text-forest-600">Where should the provider go, and what should they know?</p>
              <div className="mt-4 space-y-4">
                <Checkbox
                  checked={form.for_family}
                  onChange={(v) => set('for_family', v)}
                  label={t('booking.forFamily', 'This service is for a relative in Rwanda')}
                  description="We send photo and written reports to you after every visit."
                />
                {form.for_family && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('booking.selectRelative', 'Relative')} required error={errors.family_member_id} htmlFor="b-rel">
                      <SelectField
                        id="b-rel"
                        value={form.family_member_id}
                        invalid={Boolean(errors.family_member_id)}
                        onChange={(e) => set('family_member_id', e.target.value)}
                      >
                        <option value="">Select a relative</option>
                        {relatives.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.full_name} · {r.relationship}
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                    <Field label={t('booking.selectProperty', 'Property')} htmlFor="b-prop">
                      <SelectField id="b-prop" value={form.property_id} onChange={(e) => set('property_id', e.target.value)}>
                        <option value="">Not linked to a property</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                    {relatives.length === 0 && (
                      <p className="text-[12px] text-forest-600 sm:col-span-2">
                        No relatives registered yet.{' '}
                        <Link to="/family/relatives" className="font-semibold text-forest-800 underline">
                          Add a relative
                        </Link>{' '}
                        first, or continue without linking.
                      </p>
                    )}
                  </div>
                )}
                <Field label={t('booking.address', 'Address')} required error={errors.address} htmlFor="b-address">
                  <TextInput
                    id="b-address"
                    value={form.address}
                    invalid={Boolean(errors.address)}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="KG 12 Ave, house with blue gate"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('common.sector', 'Sector')} htmlFor="b-sector">
                    <SelectField id="b-sector" value={form.sector} onChange={(e) => set('sector', e.target.value)}>
                      {['Nyamata', 'Ruhuha', 'Rilima', 'Ntarama', 'Mayange', 'Mareba', 'Gashora', 'Rweru'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </SelectField>
                  </Field>
                  <Field label={t('common.district', 'District')} htmlFor="b-district">
                    <TextInput id="b-district" value="Bugesera" readOnly className="bg-forest-50/60" />
                  </Field>
                </div>
                <Field label={t('booking.notes', 'Notes for the provider')} htmlFor="b-notes" hint="Access instructions, gate codes, preferences.">
                  <TextArea
                    id="b-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder={t('booking.notesPlaceholder', 'e.g. Key with the caretaker, two dogs in the compound, call before arriving.')}
                  />
                </Field>
                <Checkbox
                  checked={form.photo_report}
                  onChange={(v) => set('photo_report', v)}
                  label={t('booking.photoReport', 'Request a photo report after completion')}
                  description="The provider uploads photos and a written summary, visible in your bookings and the family desk."
                />
              </div>
            </div>
          )}

          {step === 'schedule' && (
            <div>
              <h2 className="font-display text-xl text-forest-900">{t('booking.step.schedule', 'Schedule')}</h2>
              <p className="mt-1 text-[13px] text-forest-600">Same-day requests are confirmed by phone when possible.</p>
              <div className="mt-4 space-y-4">
                <Field label={t('booking.date', 'Preferred date')} required error={errors.date} htmlFor="b-date">
                  <TextInput
                    id="b-date"
                    type="date"
                    min={todayISO()}
                    value={form.date}
                    invalid={Boolean(errors.date)}
                    onChange={(e) => set('date', e.target.value)}
                  />
                </Field>
                <div>
                  <p className="label">{t('booking.slot', 'Time slot')}</p>
                  <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set('slot', s)}
                        className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition ${
                          form.slot === s ? 'border-forest-600 bg-forest-800 text-white' : 'border-forest-100 text-forest-800 hover:border-forest-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label={t('booking.recurring', 'Frequency')} htmlFor="b-rec">
                  <SelectField id="b-rec" value={form.recurring} onChange={(e) => set('recurring', e.target.value)}>
                    <option value="once">{t('booking.recurringOnce', 'One-off visit')}</option>
                    <option value="weekly">{t('booking.recurringWeekly', 'Every week')}</option>
                    <option value="monthly">{t('booking.recurringMonthly', 'Every month')}</option>
                  </SelectField>
                </Field>
                <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-[12.5px] leading-relaxed text-gold-900">
                  Recurring bookings are billed per visit. Manage or cancel any single visit from your bookings list.
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div>
              <h2 className="font-display text-xl text-forest-900">{t('booking.step.review', 'Review')}</h2>
              <p className="mt-1 text-[13px] text-forest-600">Check the details before sending your request.</p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <KeyValue label={t('booking.category', 'Service')} value={categoryName(category ?? { name_en: '—', name_fr: '—', name_rw: '—' })} />
                <KeyValue label={t('common.provider', 'Provider')} value={selectedProvider?.business_name ?? t('booking.anyProvider', 'Assign automatically')} />
                <KeyValue label={t('booking.date', 'Date')} value={form.date} />
                <KeyValue label={t('booking.slot', 'Time slot')} value={form.slot} />
                <KeyValue label={t('booking.address', 'Address')} value={`${form.address || '—'}, ${form.sector}`} />
                <KeyValue label={t('booking.recurring', 'Frequency')} value={form.recurring === 'once' ? 'One-off' : form.recurring} />
                {form.for_family && (
                  <KeyValue
                    label={t('booking.forFamily', 'For relative')}
                    value={relatives.find((r) => r.id === form.family_member_id)?.full_name ?? 'Not linked'}
                  />
                )}
                <KeyValue label={t('booking.photoReport', 'Photo report')} value={form.photo_report ? t('common.yes', 'Yes') : t('common.no', 'No')} />
              </div>
              {form.notes && (
                <div className="mt-3 rounded-xl bg-forest-50/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-500">{t('booking.notes', 'Notes')}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-forest-800">{form.notes}</p>
                </div>
              )}
              <div className="mt-5">
                <Checkbox
                  checked={form.request_quote}
                  onChange={(v) => set('request_quote', v)}
                  label={t('booking.requestQuote', 'Ask for written quotations before confirming')}
                  description="Recommended for larger jobs. Providers send a price, you accept the one you prefer."
                />
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div>
              <h2 className="font-display text-xl text-forest-900">{t('booking.step.payment', 'Payment')}</h2>
              <p className="mt-1 text-[13px] text-forest-600">
                {form.request_quote
                  ? 'Nothing is charged now. You pay after accepting a quotation.'
                  : 'Choose how you will pay once the job is confirmed.'}
              </p>
              <div className="mt-4 space-y-2.5">
                {payMethods.map((m) => (
                  <RadioCard
                    key={m.value}
                    name="payment"
                    checked={form.payment_method === m.value}
                    onChange={() => set('payment_method', m.value)}
                    title={m.label}
                    description={m.note}
                    icon={<Wallet className="h-4 w-4 text-gold-600" />}
                  />
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-[12.5px] leading-relaxed text-forest-800">
                <strong>Mobile money is ready.</strong> MTN MoMo and Airtel Money collections are wired through the
                payment ledger; a merchant code is issued on confirmation so you can pay from any phone.
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-forest-50 pt-4">
            <button type="button" onClick={goBack} disabled={stepIndex === 0} className="btn-ghost btn-sm">
              <ArrowLeft className="h-4 w-4" /> {t('common.back', 'Back')}
            </button>
            {step === 'payment' ? (
              <button type="button" onClick={() => void submitBooking()} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {busy ? t('common.saving', 'Saving…') : t('booking.confirm', 'Confirm booking')}
              </button>
            ) : (
              <button type="button" onClick={goNext} className="btn-primary">
                {t('common.continue', 'Continue')} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* summary */}
        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker">{t('booking.summary', 'Summary')}</p>
            <p className="mt-2 font-display text-lg text-forest-900">
              {category ? categoryName(category) : 'Select a service'}
            </p>
            {category && (
              <p className="mt-0.5 text-[12px] text-forest-600">
                {money(category.base_price)} / {category.unit} · {category.duration}
              </p>
            )}
            <div className="mt-4 space-y-2 border-t border-forest-50 pt-3 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-forest-600">{t('booking.estimate', 'Estimate')}</span>
                <span className="font-semibold text-forest-900">{money(estimate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-forest-600">{t('booking.date', 'Date')}</span>
                <span className="font-medium text-forest-800">{form.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-forest-600">{t('booking.slot', 'Slot')}</span>
                <span className="font-medium text-forest-800">{form.slot}</span>
              </div>
              <div className="flex justify-between border-t border-forest-50 pt-2">
                <span className="font-semibold text-forest-900">{t('common.total', 'Total')}</span>
                <span className="font-display text-lg text-forest-900">
                  {form.request_quote ? '—' : money(total)}
                </span>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-forest-500">
              <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('booking.estimateNote', 'Final price is confirmed by quotation. Estimates include labour and standard materials.')}
            </p>
          </div>

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <MapPin className="h-5 w-5 text-gold-300" />
            <p className="mt-2 font-display text-base">Serving all of Bugesera</p>
            <p className="mt-1 text-[12px] leading-relaxed text-forest-100/80">
              Nyamata, Ruhuha, Rilima, Ntarama, Mayange, Mareba, Gashora and Rweru. Outside the district? Contact the team
              for a travel quote.
            </p>
            <Link to="/contact" className="btn-gold btn-sm mt-3 w-full">
              {t('nav.contact', 'Contact us')}
            </Link>
          </div>

          <div className="rounded-2xl border border-forest-100 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-forest-600">Recent bookings</p>
            <RecentBookings customerId={profile?.id} money={money} lang={lang} t={t} />
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}

function RecentBookings({
  customerId,
  money,
  lang,
  t,
}: {
  customerId?: string;
  money: (n: number) => string;
  lang: 'en' | 'fr' | 'rw';
  t: (k: string, f?: string) => string;
}) {
  const { rows } = useRows<Booking>('bookings', {
    where: customerId ? { customer_id: customerId } : { customer_id: '__none__' },
    order: { column: 'created_at', ascending: false },
    limit: 3,
  });
  void lang;
  if (rows.length === 0) {
    return <p className="mt-2 text-[12px] text-forest-500">{t('common.empty', 'No bookings yet.')}</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {rows.map((b) => (
        <li key={b.id}>
          <Link
            to={`/dashboard/bookings/${b.id}`}
            className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 hover:bg-forest-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-forest-900">{b.category_name}</span>
              <span className="block text-[10.5px] text-forest-500">{b.ref} · {money(b.amount)}</span>
            </span>
            <StatusBadge status={b.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function QuotationPicker({
  bookingId,
  onAccepted,
}: {
  bookingId: string;
  onAccepted: () => void;
}) {
  const { money } = usePrefs();
  const { rows: quotes } = useRows<Quotation>('quotations', { where: { booking_id: bookingId } });
  void onAccepted;
  if (quotes.length === 0) return null;
  return (
    <div className="space-y-2">
      {quotes.map((q) => (
        <div key={q.id} className="flex items-center justify-between gap-2 rounded-xl border border-forest-100 p-3">
          <div>
            <p className="text-[12.5px] font-semibold text-forest-900">{q.provider_name}</p>
            <p className="text-[11px] text-forest-500">{q.message}</p>
          </div>
          <span className="font-display text-base text-forest-900">{money(q.amount)}</span>
        </div>
      ))}
    </div>
  );
}
