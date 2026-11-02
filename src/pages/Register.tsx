import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { Checkbox, Field, RadioCard, SelectField, TextInput } from '../components/ui';

type AccountKey = 'customer' | 'diaspora' | 'provider';

export default function Register() {
  const { t } = useI18n();
  const { toast } = usePrefs();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initial = (params.get('role') as AccountKey | null) ?? 'customer';
  const [account, setAccount] = useState<AccountKey>(['customer', 'diaspora', 'provider'].includes(initial) ? initial : 'customer');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    country: 'Rwanda',
    city: 'Nyamata',
    terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ needsConfirmation: boolean } | null>(null);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '', form: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 3) next.fullName = t('auth.nameRequired', 'Enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = t('auth.emailInvalid', 'Enter a valid email address.');
    if (form.password.length < 8) next.password = t('auth.minPassword', 'Use at least 8 characters.');
    if (form.password !== form.confirm) next.confirm = t('auth.passwordMismatch', 'Passwords do not match.');
    if (!form.terms) next.terms = t('auth.termsRequired', 'Please accept the terms to continue.');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const result = await signUp({
        fullName: form.fullName.trim(),
        email: form.email,
        password: form.password,
        role: account === 'provider' ? 'provider' : 'customer',
        phone: form.phone.trim() || undefined,
        country: form.country,
        city: form.city,
        isDiaspora: account === 'diaspora',
      });
      setDone(result);
      toast(t('auth.accountCreated', 'Account created'), t('auth.welcomeNew', 'Welcome to URUGOCARE.'));
      if (!result.needsConfirmation) {
        navigate(account === 'provider' ? '/provider' : account === 'diaspora' ? '/family' : '/dashboard', { replace: true });
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not create the account.' });
    } finally {
      setBusy(false);
    }
  }

  if (done?.needsConfirmation) {
    return (
      <div className="container-x max-w-lg py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-forest-600" />
        <h1 className="mt-4 font-display text-2xl text-forest-900">{t('auth.checkEmail', 'Confirm your email')}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-forest-600">
          We sent a confirmation link to <span className="font-semibold text-forest-900">{form.email}</span>. Open it to
          activate your URUGOCARE account, then sign in.
        </p>
        <Link to="/login" className="btn-primary mt-6">
          {t('auth.signIn', 'Go to sign in')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="kicker">{t('auth.signUp', 'Create account')}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">{t('auth.register.title', 'Join URUGOCARE')}</h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-forest-600">
          {t('auth.register.subtitle', 'Choose how you will use the platform. You can add family members and properties later.')}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <RadioCard
            name="account"
            checked={account === 'customer'}
            onChange={() => setAccount('customer')}
            title={t('auth.type.customer', 'Customer')}
            description={t('auth.type.customerDesc', 'Book services for your own home in Rwanda.')}
            icon={<span className="text-lg">🏠</span>}
          />
          <RadioCard
            name="account"
            checked={account === 'diaspora'}
            onChange={() => setAccount('diaspora')}
            title={t('auth.type.diaspora', 'Family abroad')}
            description={t('auth.type.diasporaDesc', 'Manage relatives and property in Rwanda remotely.')}
            icon={<span className="text-lg">🌍</span>}
          />
          <RadioCard
            name="account"
            checked={account === 'provider'}
            onChange={() => setAccount('provider')}
            title={t('auth.type.provider', 'Provider')}
            description={t('auth.type.providerDesc', 'Offer services and receive jobs in Bugesera.')}
            icon={<span className="text-lg">🛠️</span>}
          />
        </div>

        {account === 'provider' && (
          <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-[12.5px] leading-relaxed text-gold-900">
            Provider accounts start as <strong>pending verification</strong>. You can browse the job marketplace right
            away; jobs can be quoted and accepted once our team verifies your ID and references.
          </div>
        )}
        {account === 'diaspora' && (
          <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-[12.5px] leading-relaxed text-forest-800">
            Your dashboard opens the <strong>Family Desk</strong> automatically: register relatives and properties, request
            services and receive photo/video completion reports.
          </div>
        )}

        {errors.form && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{errors.form}</div>
        )}

        <form onSubmit={submit} className="card card-pad mt-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('auth.fullName', 'Full name')} required error={errors.fullName} htmlFor="reg-name">
              <TextInput
                id="reg-name"
                value={form.fullName}
                invalid={Boolean(errors.fullName)}
                onChange={(e) => update('fullName', e.target.value)}
                autoComplete="name"
                placeholder="Aline Uwase"
              />
            </Field>
            <Field label={t('auth.email', 'Email address')} required error={errors.email} htmlFor="reg-email">
              <TextInput
                id="reg-email"
                type="email"
                value={form.email}
                invalid={Boolean(errors.email)}
                onChange={(e) => update('email', e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>
            <Field label={t('auth.phone', 'Phone (with country code)')} htmlFor="reg-phone">
              <TextInput
                id="reg-phone"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                autoComplete="tel"
                placeholder="+250 788 000 000"
              />
            </Field>
            <Field label={t('auth.country', 'Country of residence')} htmlFor="reg-country">
              <SelectField id="reg-country" value={form.country} onChange={(e) => update('country', e.target.value)}>
                {['Rwanda', 'Belgium', 'France', 'United Kingdom', 'United States', 'Canada', 'Netherlands', 'United Arab Emirates', 'South Africa', 'Kenya', 'Other'].map(
                  (c) => (
                    <option key={c} value={c}>{c}</option>
                  ),
                )}
              </SelectField>
            </Field>
            <Field label={t('common.city', 'City / town')} htmlFor="reg-city">
              <TextInput id="reg-city" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Nyamata" />
            </Field>
            <div className="hidden sm:block" />
            <Field label={t('auth.password', 'Password')} required error={errors.password} htmlFor="reg-password" hint={t('auth.minPassword', 'At least 8 characters.')}>
              <TextInput
                id="reg-password"
                type="password"
                value={form.password}
                invalid={Boolean(errors.password)}
                onChange={(e) => update('password', e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </Field>
            <Field label={t('auth.confirmPassword', 'Confirm password')} required error={errors.confirm} htmlFor="reg-confirm">
              <TextInput
                id="reg-confirm"
                type="password"
                value={form.confirm}
                invalid={Boolean(errors.confirm)}
                onChange={(e) => update('confirm', e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Checkbox
              checked={form.terms}
              onChange={(v) => update('terms', v)}
              label={t('auth.terms', 'I accept the URUGOCARE terms of service and privacy policy')}
              description="Your data is used to arrange services and keep families informed. We never sell personal information."
            />
            {errors.terms && <p className="err mt-1">{errors.terms}</p>}
          </div>

          <button type="submit" disabled={busy} className="btn-primary mt-5 w-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {busy ? t('common.saving', 'Creating account…') : t('auth.signUp', 'Create account')}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-5 text-[13px] text-forest-600">
          {t('auth.hasAccount', 'Already registered?')}{' '}
          <Link to="/login" className="font-semibold text-forest-800 underline decoration-gold-400 decoration-2 underline-offset-2">
            {t('auth.signIn', 'Sign in')}
          </Link>
        </p>
      </div>
    </div>
  );
}
