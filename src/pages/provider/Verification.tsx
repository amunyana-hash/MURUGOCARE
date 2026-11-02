import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileCheck2, Loader2, ShieldCheck, ShieldX, Upload } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Badge, Checkbox, Field, KeyValue, SectionHeader, SelectField, TextArea, TextInput } from '../../components/ui';
import type { Provider } from '../../lib/types';
import { publishNotification, updateRow } from '../../lib/db';
import { formatDate } from '../../lib/format';

const steps = [
  { key: 'identity', title: 'Identity', body: 'National ID or passport number and photo on file.' },
  { key: 'business', title: 'Business details', body: 'Trade name, skills and service area in Bugesera.' },
  { key: 'documents', title: 'Certificates', body: 'Professional certificate or training proof if available.' },
  { key: 'review', title: 'Coordinator review', body: 'A URUGOCARE coordinator verifies before activation.' },
];

export default function ProviderVerification() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];

  const [idDocument, setIdDocument] = useState(provider?.id_document ?? '');
  const [certificate, setCertificate] = useState(provider?.certificate ?? '');
  const [years, setYears] = useState(String(provider?.years_experience ?? 1));
  const [bio, setBio] = useState(provider?.bio ?? '');
  const [available, setAvailable] = useState(provider?.available ?? true);
  const [language, setLanguage] = useState((provider?.languages?.[0] ?? 'Kinyarwanda') as string);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const nav = providerNav(t as never);
  const status = provider?.verification_status ?? 'pending';

  const progress = useMemo(() => {
    if (!provider) return 0;
    let done = 0;
    if (provider.id_document) done += 1;
    if (provider.business_name && provider.bio) done += 1;
    if (provider.certificate) done += 1;
    if (provider.verification_status === 'verified') done += 1;
    return Math.round((done / 4) * 100);
  }, [provider]);

  async function submit() {
    if (!provider) return;
    const next: Record<string, string> = {};
    if (idDocument.trim().length < 6) next.idDocument = 'Enter your national ID or passport number.';
    if (bio.trim().length < 40) next.bio = 'Write at least 40 characters about your experience.';
    const y = Number(years);
    if (!years || Number.isNaN(y) || y < 0 || y > 60) next.years = 'Years of experience must be 0–60.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await updateRow<Provider>('providers', provider.id, {
        id_document: idDocument.trim(),
        certificate: certificate.trim() || 'Not provided',
        years_experience: y,
        bio: bio.trim(),
        available,
        languages: [language],
        verification_status: 'pending',
      });
      await publishNotification({
        user_id: provider.user_id ?? profile?.id ?? provider.id,
        audience: 'provider',
        title: 'Verification submitted',
        body: 'Your documents were received. The Bugesera coordinator team reviews submissions within 48 hours.',
        kind: 'verification',
        link: '/provider/verification',
      });
      await publishNotification({
        user_id: 'u-admin-1',
        audience: 'admin',
        title: 'Provider verification to review',
        body: `${provider.full_name} (${provider.business_name}) submitted verification documents.`,
        kind: 'verification',
        link: '/admin/providers',
      });
      toast('Verification submitted', 'You will be notified once reviewed.');
    } catch (err) {
      toast('Submission failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability(v: boolean) {
    if (!provider) return;
    setAvailable(v);
    await updateRow<Provider>('providers', provider.id, { available: v });
    toast(v ? 'You are accepting jobs' : 'Availability paused', provider.business_name);
  }

  return (
    <DashboardShell
      title={t('provider.verification', 'Verification')}
      subtitle="Verified providers get the diaspora requests. Complete every section to be activated."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="kicker">Current status</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {status === 'verified' ? (
                    <ShieldCheck className="h-5 w-5 text-forest-600" />
                  ) : status === 'rejected' ? (
                    <ShieldX className="h-5 w-5 text-red-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-gold-500" />
                  )}
                  <p className="font-display text-xl capitalize text-forest-900">{status}</p>
                </div>
                {provider?.verified_at && (
                  <p className="mt-1 text-[11.5px] text-forest-500">Verified on {formatDate(provider.verified_at, lang)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="kicker">Profile completeness</p>
                <p className="font-display text-2xl text-forest-900">{progress}%</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-forest-100">
              <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-forest-600">
              {status === 'verified'
                ? 'Your account is fully verified. Keep your documents current — the coordinator re-checks annually.'
                : 'Until verification is complete you can quote on requests, but customers see an unverified label.'}
            </p>
          </section>

          <section className="card card-pad">
            <SectionHeader title="Verification documents" subtitle="All data is stored securely and used only for checks." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="National ID / passport number" required error={errors.idDocument} htmlFor="v-id">
                <TextInput
                  id="v-id"
                  value={idDocument}
                  onChange={(e) => setIdDocument(e.target.value)}
                  invalid={Boolean(errors.idDocument)}
                  placeholder="1198 8xxxxxx x xx"
                />
              </Field>
              <Field label="Professional certificate" hint="Reference number or issuing body." htmlFor="v-cert">
                <TextInput
                  id="v-cert"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  placeholder="RTB plumbing grade 2 — cert. 4471"
                />
              </Field>
              <Field label="Years of experience" required error={errors.years} htmlFor="v-years">
                <TextInput
                  id="v-years"
                  type="number"
                  min={0}
                  max={60}
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  invalid={Boolean(errors.years)}
                />
              </Field>
              <Field label="Primary language" htmlFor="v-lang">
                <SelectField id="v-lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="Kinyarwanda">Kinyarwanda</option>
                  <option value="English">English</option>
                  <option value="French">French</option>
                </SelectField>
              </Field>
              <Field
                label="Professional summary"
                required
                error={errors.bio}
                hint="Customers read this before accepting a quotation."
                htmlFor="v-bio"
                className="sm:col-span-2"
              >
                <TextArea
                  id="v-bio"
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  invalid={Boolean(errors.bio)}
                  placeholder="I have 6 years of experience in residential plumbing across Bugesera and Kigali, specialising in leak repair, water tank installation and bathroom fitting."
                />
              </Field>
            </div>

            <div className="mt-4 space-y-2">
              <Checkbox
                checked={available}
                onChange={(v) => void toggleAvailability(v)}
                label="I am currently accepting new jobs"
                description="Turn this off when you are fully booked; you stay visible in search."
              />
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-forest-200 bg-forest-50/50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest-800">
                <Upload className="h-3.5 w-3.5" /> Document upload
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-forest-600">
                When Supabase storage is connected you can attach the scanned ID and certificate here. For now, enter the
                reference numbers above and the coordinator will request the scans by phone.
              </p>
            </div>

            <button type="button" className="btn-primary btn-sm mt-4" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Submit for review
            </button>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker">Verification steps</p>
            <ol className="mt-3 space-y-3">
              {steps.map((s, i) => {
                const done =
                  (s.key === 'identity' && Boolean(provider?.id_document)) ||
                  (s.key === 'business' && Boolean(provider?.business_name && provider?.bio)) ||
                  (s.key === 'documents' && Boolean(provider?.certificate)) ||
                  (s.key === 'review' && provider?.verification_status === 'verified');
                return (
                  <li key={s.key} className="flex gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        done ? 'bg-forest-600 text-white' : 'border border-forest-200 text-forest-400'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-2.5 w-2.5" /> : i + 1}
                    </span>
                    <span>
                      <span className={`block text-[12.5px] font-semibold ${done ? 'text-forest-900' : 'text-forest-500'}`}>
                        {s.title}
                      </span>
                      <span className="block text-[11px] leading-relaxed text-forest-500">{s.body}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {provider && (
            <div className="card card-pad">
              <p className="kicker">On file</p>
              <div className="mt-2 space-y-2">
                <KeyValue label="Business name" value={provider.business_name} />
                <KeyValue label="Service area" value={`${provider.sector}, ${provider.district}`} />
                <KeyValue label="Categories" value={provider.category_slugs.join(', ').replace(/-/g, ' ')} />
                <KeyValue label="Rating" value={provider.rating ? `${provider.rating.toFixed(1)} / 5` : 'Not rated yet'} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(provider.skills ?? []).map((s) => (
                  <Badge key={s} tone="green">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <p className="kicker text-gold-300">Why verification matters</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-forest-100/85">
              Every diaspora customer lets a verified stranger into a family home. Verification is what makes that safe —
              and what makes your quotations competitive.
            </p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
