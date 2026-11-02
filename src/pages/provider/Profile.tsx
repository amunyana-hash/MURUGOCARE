import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useRows } from '../../lib/hooks';
import { providerNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Avatar, Badge, Checkbox, Field, KeyValue, SectionHeader, SelectField, TextArea, TextInput } from '../../components/ui';
import type { Category, Provider } from '../../lib/types';
import { updateRow } from '../../lib/db';

const sectors = ['Nyamata', 'Rilima', 'Gashora', 'Mayange', 'Ruhuha', 'Ntarama', 'Rweru', 'Bugesera (all)'];

export default function ProviderProfile() {
  const { profile, updateProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = usePrefs();

  const { rows: providers } = useRows<Provider>('providers', { where: { user_id: profile?.id ?? '__none__' } });
  const provider = providers[0];
  const { rows: categories } = useRows<Category>('categories');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [sector, setSector] = useState('Nyamata');
  const [rate, setRate] = useState('5000');
  const [slugs, setSlugs] = useState<string[]>([]);
  const [skills, setSkills] = useState('');
  const [available, setAvailable] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    if (provider) {
      setBusinessName(provider.business_name);
      setBio(provider.bio);
      setSector(provider.sector || 'Nyamata');
      setRate(String(provider.hourly_rate));
      setSlugs(provider.category_slugs ?? []);
      setSkills((provider.skills ?? []).join(', '));
      setAvailable(provider.available);
    }
  }, [profile, provider]);

  const nav = providerNav(t as never);

  async function save() {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 3) next.fullName = 'Enter your full name.';
    if (!/^\+?[0-9 ]{9,15}$/.test(phone.trim())) next.phone = 'Enter a valid phone number.';
    if (businessName.trim().length < 3) next.businessName = 'Enter your trade or business name.';
    if (bio.trim().length < 30) next.bio = 'Write at least 30 characters.';
    if (!slugs.length) next.slugs = 'Select at least one service category.';
    const r = Number(rate);
    if (!rate || Number.isNaN(r) || r < 1000) next.rate = 'Set an hourly rate of at least RWF 1,000.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      if (provider) {
        await updateRow<Provider>('providers', provider.id, {
          full_name: fullName.trim(),
          business_name: businessName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          sector,
          hourly_rate: r,
          category_slugs: slugs,
          skills: skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          available,
        });
      }
      toast('Profile saved', 'Customers now see the updated details.');
    } catch (err) {
      toast('Save failed', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function toggleSlug(slug: string, on: boolean) {
    setSlugs((prev) => (on ? Array.from(new Set([...prev, slug])) : prev.filter((s) => s !== slug)));
  }

  return (
    <DashboardShell
      title={t('provider.profile', 'Provider profile')}
      subtitle="Your public listing: business name, skills, service area and rate."
      items={nav}
      accent={t('roles.provider', 'Provider')}
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card card-pad">
          <SectionHeader title="Account details" subtitle="Shown on your public provider card." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.fullName} htmlFor="p-name">
              <TextInput id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} invalid={Boolean(errors.fullName)} />
            </Field>
            <Field label="Phone (mobile money)" required error={errors.phone} htmlFor="p-phone">
              <TextInput id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} invalid={Boolean(errors.phone)} placeholder="+250 78 000 0000" />
            </Field>
            <Field label="Business name" required error={errors.businessName} htmlFor="p-biz">
              <TextInput id="p-biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} invalid={Boolean(errors.businessName)} />
            </Field>
            <Field label="Sector" htmlFor="p-sector">
              <SelectField id="p-sector" value={sector} onChange={(e) => setSector(e.target.value)}>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label="Hourly rate (RWF)" required error={errors.rate} htmlFor="p-rate">
              <TextInput id="p-rate" type="number" min={1000} step={500} value={rate} onChange={(e) => setRate(e.target.value)} invalid={Boolean(errors.rate)} />
            </Field>
            <Field label="Skills" hint="Comma separated." htmlFor="p-skills">
              <TextInput id="p-skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Deep cleaning, tank repair, solar" />
            </Field>
            <Field label="Professional summary" required error={errors.bio} className="sm:col-span-2" htmlFor="p-bio">
              <TextArea id="p-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} invalid={Boolean(errors.bio)} />
            </Field>
          </div>

          <div className="mt-4">
            <span className="label">Service categories</span>
            {errors.slugs && <p className="mb-1 text-[11.5px] font-medium text-red-600">{errors.slugs}</p>}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {categories.map((c) => (
                <Checkbox
                  key={c.slug}
                  checked={slugs.includes(c.slug)}
                  onChange={(v) => toggleSlug(c.slug, v)}
                  label={c.name_en}
                />
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Checkbox
              checked={available}
              onChange={setAvailable}
              label="Accepting new jobs"
              description="Uncheck when fully booked — your listing stays visible."
            />
          </div>

          <button type="button" className="btn-primary btn-sm mt-5" disabled={busy || !provider} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
          </button>
          {!provider && (
            <p className="mt-2 text-[11.5px] text-forest-500">
              Provider record is still being created for this account. Reload in a moment.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card card-pad">
            <p className="kicker">Public preview</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={fullName || 'Provider'} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-forest-900">{businessName || 'Business name'}</p>
                <p className="truncate text-[11.5px] text-forest-500">{fullName || 'Full name'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={provider?.verification_status === 'verified' ? 'green' : 'amber'}>
                {provider?.verification_status ?? 'pending'}
              </Badge>
              <Badge tone="gold">{sector}</Badge>
              {available ? <Badge tone="green">Available</Badge> : <Badge tone="neutral">Booked</Badge>}
            </div>
            <div className="mt-3 space-y-2">
              <KeyValue label="Hourly rate" value={`${Number(rate || 0).toLocaleString('en-RW')} RWF`} />
              <KeyValue label="Jobs completed" value={provider?.jobs_completed ?? 0} />
              <KeyValue label="Rating" value={provider?.rating ? `${provider.rating.toFixed(1)} / 5` : 'Not rated'} />
            </div>
          </div>

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <p className="kicker text-gold-300">Profile tip</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-forest-100/85">
              Providers with a photo, a specific summary and at least three skills receive twice as many quotation
              acceptances from diaspora families.
            </p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
