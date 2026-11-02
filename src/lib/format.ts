import type { Currency, Lang } from './types';

export const USD_RATE = 1300;

export function formatMoney(amount: number, currency: Currency = 'RWF', lang: Lang = 'en'): string {
  if (currency === 'USD') {
    const value = amount / USD_RATE;
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 100 ? 2 : 0,
    }).format(value);
  }
  const formatted = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} RWF`;
}

export function formatDate(value: string | null | undefined, lang: Lang = 'en'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = lang === 'fr' ? 'fr-FR' : lang === 'rw' ? 'en-GB' : 'en-GB';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined, lang: Lang = 'en'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(value: string, lang: Lang = 'en'): string {
  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'fr' ? 'fr' : 'en', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(-days, 'day');
  return formatDate(value, lang);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function makeRef(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function truncate(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function slugToLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
