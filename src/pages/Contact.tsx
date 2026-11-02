import { useState } from 'react';
import { CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { insertRow } from '../lib/db';
import { uid } from '../lib/format';
import type { ContactMessage } from '../lib/types';
import { Field, SelectField, TextArea, TextInput } from '../components/ui';
import { usePrefs } from '../lib/prefs';

export default function Contact() {
  const { t } = useI18n();
  const { toast } = usePrefs();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'Rwanda',
    subject: 'Service booking',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Please tell us your name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 12) next.message = 'Please describe your request in at least 12 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await insertRow<ContactMessage>('contact_messages', {
        id: uid(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        country: form.country,
        subject: form.subject,
        message: form.message.trim(),
        status: 'new',
        created_at: new Date().toISOString(),
      });
      setSent(true);
      toast(t('contact.sent'), t('contact.sentBody'));
    } catch (err) {
      toast('Message not sent', err instanceof Error ? err.message : 'Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="border-b border-forest-100 bg-white">
        <div className="container-x py-12">
          <p className="kicker">{t('nav.contact')}</p>
          <h1 className="mt-2 font-display text-3xl text-forest-900 sm:text-4xl">{t('contact.title')}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-forest-600">{t('contact.subtitle')}</p>
        </div>
      </div>

      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1fr_0.85fr]">
        <div className="card card-pad">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-forest-600" />
              <h2 className="mt-4 font-display text-2xl text-forest-900">{t('contact.sent')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-forest-600">{t('contact.sentBody')}</p>
              <div className="mt-6 rounded-xl bg-forest-50 p-4 text-left">
                <p className="text-[12px] font-semibold text-forest-900">Reference</p>
                <p className="mt-0.5 font-mono text-[13px] text-forest-700">
                  MSG-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 9000) + 1000)}
                </p>
                <p className="mt-2 text-[12px] text-forest-600">
                  A copy of your message is stored in the URUGOCARE support desk and is visible to the admin team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setForm({ name: '', email: '', phone: '', country: 'Rwanda', subject: 'Service booking', message: '' });
                }}
                className="btn-outline mt-6"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="font-display text-xl text-forest-900">Send a message</h2>
              <p className="mt-1 text-[13px] text-forest-600">
                We reply within one working day. For urgent bookings call the field line below.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label={t('common.name')} required error={errors.name} htmlFor="c-name">
                  <TextInput
                    id="c-name"
                    value={form.name}
                    invalid={Boolean(errors.name)}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Aline Uwase"
                    autoComplete="name"
                  />
                </Field>
                <Field label={t('common.email')} required error={errors.email} htmlFor="c-email">
                  <TextInput
                    id="c-email"
                    type="email"
                    value={form.email}
                    invalid={Boolean(errors.email)}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>
                <Field label={t('common.phone')} htmlFor="c-phone">
                  <TextInput
                    id="c-phone"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+250 788 000 000"
                    autoComplete="tel"
                  />
                </Field>
                <Field label={t('auth.country')} htmlFor="c-country">
                  <SelectField id="c-country" value={form.country} onChange={(e) => update('country', e.target.value)}>
                    {['Rwanda', 'Belgium', 'France', 'United Kingdom', 'United States', 'Canada', 'United Arab Emirates', 'South Africa', 'Other'].map(
                      (c) => (
                        <option key={c} value={c}>{c}</option>
                      ),
                    )}
                  </SelectField>
                </Field>
                <Field label={t('contact.subject')} htmlFor="c-subject" className="sm:col-span-2">
                  <SelectField id="c-subject" value={form.subject} onChange={(e) => update('subject', e.target.value)}>
                    {['Service booking', 'Diaspora family desk', 'Provider application', 'Billing and payments', 'Complaint', 'Partnership'].map(
                      (s) => (
                        <option key={s} value={s}>{s}</option>
                      ),
                    )}
                  </SelectField>
                </Field>
                <Field label={t('common.message')} required error={errors.message} htmlFor="c-message" className="sm:col-span-2">
                  <TextArea
                    id="c-message"
                    rows={5}
                    value={form.message}
                    invalid={Boolean(errors.message)}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder="Tell us what you need, where in Bugesera, and when."
                  />
                </Field>
              </div>
              <button type="submit" disabled={busy} className="btn-primary mt-5 w-full sm:w-auto">
                <Send className="h-4 w-4" /> {busy ? t('common.saving') : t('common.submit')}
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <h2 className="font-display text-lg text-forest-900">{t('contact.office')}</h2>
            <ul className="mt-4 space-y-3.5 text-[13px]">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <span className="text-forest-700">
                  URUGOCARE Office, Nyamata Town Centre
                  <br />
                  Bugesera District, Eastern Province, Rwanda
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <span className="text-forest-700">
                  +250 788 000 145
                  <br />
                  +250 722 000 145
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <a href="mailto:hello@urugocare.rw" className="text-forest-700 underline">
                  hello@urugocare.rw
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <span className="text-forest-700">{t('contact.hours')}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <MessageCircle className="h-5 w-5 text-gold-300" />
            <p className="mt-2 font-display text-lg">WhatsApp support</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-forest-100/80">
              Diaspora families can request a call back in their timezone. Send “CALLBACK” with your country and the
              preferred hour.
            </p>
            <a
              href="https://wa.me/250788000145"
              target="_blank"
              rel="noreferrer"
              className="btn-gold btn-sm mt-4 w-full"
            >
              Open WhatsApp
            </a>
          </div>

          <div className="rounded-2xl border border-gold-200 bg-gold-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-700">Urgent safety issue</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-gold-900">
              For gas, electrical or water emergencies affecting an elderly relative, call the field line directly and
              then open a complaint from the booking so the case is documented.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
