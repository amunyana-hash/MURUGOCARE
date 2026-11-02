import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import { demoAccounts, DEMO_PASSWORD } from '../lib/seed';
import { Field, TextInput } from '../components/ui';
import { LanguageSwitcher } from '../components/layout';

const rolePath = { customer: '/dashboard', provider: '/provider', admin: '/admin', family: '/family' } as const;

export default function Login() {
  const { t } = useI18n();
  const { toast } = usePrefs();
  const { signIn, signInDemo, requestPasswordReset, mode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  function afterLogin(target: string) {
    navigate(from ?? target, { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = t('auth.emailInvalid', 'Enter a valid email address.');
    if (password.length < 6) next.password = t('auth.minPassword', 'Password must be at least 6 characters.');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy('form');
    try {
      await signIn(email, password);
      toast(t('auth.welcomeBack', 'Welcome back'), t('auth.signedIn', 'You are now signed in.'));
      afterLogin('/app');
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not sign in.' });
    } finally {
      setBusy(null);
    }
  }

  async function handleDemo(account: (typeof demoAccounts)[number]) {
    setBusy(account.role);
    setErrors({});
    try {
      await signInDemo(account.email);
      toast(t('auth.demoSignedIn', 'Demo session started'), `${account.name} · ${account.label}`);
      afterLogin(rolePath[account.role as keyof typeof rolePath] ?? '/dashboard');
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not start demo session.' });
    } finally {
      setBusy(null);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrors({ email: t('auth.emailInvalid', 'Enter a valid email address.') });
      return;
    }
    setBusy('reset');
    try {
      await requestPasswordReset(email);
      setResetSent(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="grid overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-soft lg:grid-cols-[1.05fr_1fr]">
        {/* left: form */}
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="kicker">{t('auth.secured', 'Secure access')}</span>
            <div className="lg:hidden">
              <LanguageSwitcher compact />
            </div>
          </div>
          <h1 className="mt-2 font-display text-3xl text-forest-900">{t('auth.login.title', 'Welcome back')}</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-forest-600">
            {t('auth.login.subtitle', 'Sign in to manage bookings, family care and payments.')}
          </p>

          {errors.form && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <Field label={t('auth.email', 'Email address')} required error={errors.email} htmlFor="login-email">
              <TextInput
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                invalid={Boolean(errors.email)}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined, form: undefined }));
                }}
                placeholder="you@example.com"
              />
            </Field>
            <Field label={t('auth.password', 'Password')} required error={errors.password} htmlFor="login-password">
              <TextInput
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                invalid={Boolean(errors.password)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined, form: undefined }));
                }}
                placeholder="••••••••"
              />
            </Field>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setResetOpen((v) => !v);
                  setResetSent(false);
                }}
                className="text-[12.5px] font-semibold text-forest-700 underline decoration-gold-400 decoration-2 underline-offset-2"
              >
                {t('auth.forgot', 'Forgot your password?')}
              </button>
              <span className="inline-flex items-center gap-1 text-[11px] text-forest-500">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-600" /> {t('auth.secured', 'Encrypted session')}
              </span>
            </div>

            <button type="submit" disabled={busy === 'form'} className="btn-primary w-full">
              {busy === 'form' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {busy === 'form' ? t('common.loading', 'Signing in…') : t('auth.signIn', 'Sign in')}
            </button>
          </form>

          {resetOpen && (
            <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50/70 p-4">
              {resetSent ? (
                <p className="text-[12.5px] leading-relaxed text-gold-900">
                  {t(
                    'auth.resetSent',
                    'If that email belongs to an account, a reset link is on its way. In demo mode no email is actually sent — use a demo account below.',
                  )}
                </p>
              ) : (
                <form onSubmit={handleReset} className="space-y-3">
                  <p className="text-[12.5px] font-semibold text-gold-900">Reset your password</p>
                  <TextInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email for password reset"
                  />
                  <button type="submit" disabled={busy === 'reset'} className="btn-gold btn-sm">
                    {busy === 'reset' ? t('common.saving', 'Sending…') : t('auth.sendReset', 'Send reset link')}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-forest-100 bg-forest-50/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-forest-700">
              <Sparkles className="h-3.5 w-3.5 text-gold-600" /> {t('auth.demoTitle', 'Try a demo account')}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-forest-600">
              {t('auth.demoDetail', 'One click opens a fully seeded workspace. Password for all demo accounts:')}{' '}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-forest-800">{DEMO_PASSWORD}</code>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => void handleDemo(account)}
                  disabled={busy !== null}
                  className="flex items-center justify-between gap-2 rounded-xl border border-forest-200 bg-white px-3 py-2.5 text-left transition hover:border-forest-400 hover:shadow-soft disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-forest-900">{account.label}</span>
                    <span className="block truncate text-[10.5px] text-forest-500">{account.name}</span>
                  </span>
                  {busy === account.role ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-forest-600" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-forest-500" />
                  )}
                </button>
              ))}
            </div>
            {mode === 'demo' && (
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-forest-500">
                Demo data is stored in this browser only. Connect Supabase to persist to a real database.
              </p>
            )}
          </div>

          <p className="mt-6 text-[13px] text-forest-600">
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <Link to="/register" className="font-semibold text-forest-800 underline decoration-gold-400 decoration-2 underline-offset-2">
              {t('auth.signUp', 'Create one')}
            </Link>
          </p>
        </div>

        {/* right: brand panel */}
        <div className="relative hidden overflow-hidden bg-forest-900 p-10 text-white lg:block">
          <div className="hero-grain absolute inset-0 opacity-90" aria-hidden="true" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl tracking-tight">
                URUGO<span className="text-gold-400">CARE</span>
              </span>
              <LanguageSwitcher compact />
            </div>
            <div className="mt-12">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">Bugesera District, Rwanda</p>
              <h2 className="mt-3 font-display text-3xl leading-snug">
                One vetted network for your home, your family and your property back home.
              </h2>
              <p className="mt-4 text-[13.5px] leading-relaxed text-forest-100/85">
                Cleaning, plumbing, electrical, gardening, groceries, inspections and elderly companionship — arranged
                locally, reported back to you wherever you live.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {[
                'Every provider ID-checked and reference-verified',
                'Written quotations before any job starts',
                'Photo and video reports for diaspora families',
                'MTN MoMo and Airtel Money ready',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-forest-100/90">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <Mail className="h-4 w-4 text-gold-300" />
              <div className="text-[12px]">
                <p className="font-semibold text-white">hello@urugocare.rw</p>
                <p className="text-forest-200/70">+250 788 000 145 · Nyamata</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
