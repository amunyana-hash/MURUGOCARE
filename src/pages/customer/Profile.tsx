import { useEffect, useState } from 'react';
import { Loader2, LogOut, Save, ShieldCheck, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { customerNav, familyNav } from '../../lib/nav';
import { DashboardShell } from '../../components/layout';
import { Avatar, Checkbox, Field, SectionHeader, SelectField, TextInput } from '../../components/ui';
import type { Lang } from '../../lib/types';
import { formatDate } from '../../lib/format';

const districts = ['Bugesera', 'Kigali', 'Ngoma', 'Rwamagana', 'Kayonza', 'Huye', 'Musanze', 'Rubavu', 'Other'];

export default function CustomerProfile() {
  const { profile, updateProfile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = usePrefs();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    district: 'Bugesera',
    language: 'en' as Lang,
    is_diaspora: false,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone ?? '',
      country: profile.country ?? 'Rwanda',
      city: profile.city ?? '',
      district: profile.district ?? 'Bugesera',
      language: profile.language ?? 'en',
      is_diaspora: Boolean(profile.is_diaspora),
    });
  }, [profile]);

  const nav = profile?.is_diaspora ? familyNav(t as never) : customerNav(t as never);

  async function save() {
    if (!profile) return;
    if (form.full_name.trim().length < 3) {
      toast('Check your name', 'Enter your full name as on your ID.', 'error');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        district: form.district,
        language: form.language,
        is_diaspora: form.is_diaspora,
      });
      setLang(form.language);
      toast('Profile updated', 'Your details are saved on every device.');
    } catch (err) {
      toast('Profile not saved', err instanceof Error ? err.message : 'Please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  }

  if (!profile) return null;

  return (
    <DashboardShell
      title={t('dash.profile', 'Profile')}
      subtitle="Your account details, language and family-desk settings."
      items={nav}
      accent={t('common.customer', 'Customer')}
    >
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="card card-pad">
            <SectionHeader title="Personal details" subtitle="Used on quotations, receipts and provider job sheets." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('register.fullName', 'Full name')} required htmlFor="pf-name">
                <TextInput id="pf-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label={t('common.email', 'Email')} htmlFor="pf-email" hint="Contact support to change your sign-in email.">
                <TextInput id="pf-email" value={form.email} readOnly className="bg-forest-50/60" />
              </Field>
              <Field label={t('common.phone', 'Phone')} htmlFor="pf-phone">
                <TextInput
                  id="pf-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0788 123 456"
                />
              </Field>
              <Field label={t('common.country', 'Country')} htmlFor="pf-country">
                <TextInput
                  id="pf-country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Rwanda"
                />
              </Field>
              <Field label={t('common.city', 'City')} htmlFor="pf-city">
                <TextInput
                  id="pf-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Kigali / Brussels / Toronto"
                />
              </Field>
              <Field label={t('common.district', 'District in Rwanda')} htmlFor="pf-district">
                <SelectField
                  id="pf-district"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectField>
              </Field>
              <Field label={t('common.language', 'Preferred language')} htmlFor="pf-lang">
                <SelectField
                  id="pf-lang"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value as Lang })}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="rw">Kinyarwanda</option>
                </SelectField>
              </Field>
            </div>

            <div className="mt-4">
              <Checkbox
                checked={form.is_diaspora}
                onChange={(v) => setForm({ ...form, is_diaspora: v })}
                label="I manage a home in Rwanda from abroad"
                description="Enables the family desk: properties, relatives, remote service requests and photo reports."
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('common.save', 'Save changes')}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>

          <div className="card card-pad">
            <SectionHeader title="Security" subtitle="Your account is protected by Supabase authentication." />
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 rounded-xl border border-forest-100 p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-forest-600" />
                <div>
                  <p className="text-[13px] font-semibold text-forest-900">Password</p>
                  <p className="text-[11.5px] leading-relaxed text-forest-600">
                    Use at least 8 characters with a number and a symbol. Reset links are sent to {profile.email}.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-forest-100 p-3.5">
                <UserCog className="mt-0.5 h-4 w-4 text-forest-600" />
                <div>
                  <p className="text-[13px] font-semibold text-forest-900">Role and permissions</p>
                  <p className="text-[11.5px] leading-relaxed text-forest-600">
                    Signed in as <strong className="uppercase">{profile.role}</strong>. Role changes are made by an
                    administrator to protect payments and provider records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad text-center">
            <div className="flex justify-center">
              <Avatar name={profile.full_name} size={72} color={profile.avatar_color ?? '#1D6248'} />
            </div>
            <p className="mt-3 font-display text-lg text-forest-900">{profile.full_name}</p>
            <p className="text-[12px] text-forest-500">{profile.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest-700">
              {profile.is_diaspora ? 'Family desk member' : profile.role}
            </p>
            <div className="mt-4 space-y-2 border-t border-forest-50 pt-3 text-left">
              <p className="flex items-center justify-between text-[12px] text-forest-600">
                <span>{t('common.memberSince', 'Member since')}</span>
                <span className="font-semibold text-forest-900">{formatDate(profile.created_at, lang)}</span>
              </p>
              <p className="flex items-center justify-between text-[12px] text-forest-600">
                <span>{t('common.language', 'Language')}</span>
                <span className="font-semibold uppercase text-forest-900">{lang}</span>
              </p>
              <p className="flex items-center justify-between text-[12px] text-forest-600">
                <span>{t('common.district', 'District')}</span>
                <span className="font-semibold text-forest-900">{profile.district ?? '—'}</span>
              </p>
            </div>
          </div>

          <div className="card card-pad">
            <p className="kicker">{t('common.account', 'Account')}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-forest-600">
              Signing out closes this session on this device. Your bookings and family records stay safe.
            </p>
            <button type="button" className="btn-danger btn-sm mt-3 w-full" disabled={signingOut} onClick={() => void handleSignOut()}>
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {t('nav.logout', 'Sign out')}
            </button>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
