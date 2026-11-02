import { useEffect, useId, useMemo, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ArrowRight, Check, ChevronDown, Star, X } from 'lucide-react';
import { initials } from '../lib/format';
import { useI18n } from '../lib/i18n';

/* ------------------------------------------------------------------ icons */
export function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const map = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Cmp = map[name] ?? Icons.Sparkles;
  return <Cmp className={className} />;
}

/* ----------------------------------------------------------------- badges */
type Tone = 'green' | 'gold' | 'red' | 'blue' | 'neutral' | 'amber';

const toneClasses: Record<Tone, string> = {
  green: 'bg-forest-50 text-forest-700 border-forest-200',
  gold: 'bg-gold-50 text-gold-700 border-gold-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${toneClasses[tone]}`}>{children}</span>;
}

const statusTones: Record<string, Tone> = {
  pending: 'amber',
  quoted: 'blue',
  confirmed: 'green',
  in_progress: 'gold',
  completed: 'green',
  cancelled: 'red',
  unpaid: 'amber',
  paid: 'green',
  refunded: 'neutral',
  succeeded: 'green',
  failed: 'red',
  open: 'red',
  investigating: 'amber',
  resolved: 'green',
  verified: 'green',
  rejected: 'red',
  suspended: 'red',
  active: 'green',
  expired: 'neutral',
  trial: 'blue',
  submitted: 'blue',
  reviewed: 'green',
  managed: 'green',
  monitoring: 'gold',
  vacant: 'neutral',
  paused: 'neutral',
  new: 'amber',
  replied: 'green',
  low: 'neutral',
  normal: 'blue',
  urgent: 'red',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label = t(`status.${status}`, status.replace(/_/g, ' '));
  const tone = statusTones[status] ?? 'neutral';
  return (
    <span className={`badge ${toneClasses[tone]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === 'green'
            ? 'bg-forest-500'
            : tone === 'gold' || tone === 'amber'
              ? 'bg-gold-400'
              : tone === 'red'
                ? 'bg-red-500'
                : tone === 'blue'
                  ? 'bg-sky-500'
                  : 'bg-slate-400'
        }`}
      />
      <span className="capitalize">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ stars */
export function Stars({ rating, size = 14, showValue = false }: { rating: number; size?: number; showValue?: boolean }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= rounded ? 'fill-gold-400 text-gold-400' : 'text-forest-200'}
        />
      ))}
      {showValue && <span className="ml-1 text-xs font-semibold text-forest-700">{rating.toFixed(1)}</span>}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex gap-1.5" role="radiogroup" aria-label={label ?? 'Rating'}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            onClick={() => onChange(i)}
            className="rounded-lg p-1 transition hover:scale-110"
          >
            <Star
              width={26}
              height={26}
              className={i <= value ? 'fill-gold-400 text-gold-400' : 'text-forest-200'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- avatar */
export function Avatar({
  name,
  color = '#1D6248',
  size = 40,
  ring,
}: {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        ring ? 'ring-2 ring-white ring-offset-2 ring-offset-forest-50' : ''
      }`}
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------------------------------------- form bits */
export function Field({
  label,
  children,
  error,
  hint,
  required,
  htmlFor,
  className = '',
}: {
  label?: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-gold-600">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

export function TextInput({
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} className={`input ${invalid ? 'input-error' : ''} ${props.className ?? ''}`} />;
}

export function TextArea({
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={4}
      {...props}
      className={`input resize-y ${invalid ? 'input-error' : ''} ${props.className ?? ''}`}
    />
  );
}

export function SelectField({
  children,
  invalid,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`input appearance-none pr-9 ${invalid ? 'input-error' : ''} ${props.className ?? ''}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-500" />
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: string;
  id?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
        checked ? 'border-forest-400 bg-forest-50/70' : 'border-forest-100 bg-white hover:border-forest-200'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          checked ? 'border-forest-600 bg-forest-600 text-white' : 'border-forest-300 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <input
        id={inputId}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-forest-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-forest-600">{description}</span>}
      </span>
    </label>
  );
}

export function RadioCard({
  checked,
  onChange,
  title,
  description,
  icon,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  name: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
        checked ? 'border-forest-500 bg-forest-50/70 shadow-soft' : 'border-forest-100 hover:border-forest-300'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? 'border-forest-600' : 'border-forest-300'
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-forest-600" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-forest-900">
          {icon}
          {title}
        </span>
        {description && <span className="mt-1 block text-xs leading-relaxed text-forest-600">{description}</span>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ modal */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-lift sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-forest-100 bg-white px-5 py-4">
          <div>
            <h3 className="font-display text-lg text-forest-900">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-forest-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-forest-500 transition hover:bg-forest-50 hover:text-forest-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-forest-100 bg-white px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ toast */
export interface ToastData {
  id: string;
  title: string;
  body?: string;
  tone?: 'success' | 'error' | 'info';
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lift ${
            toast.tone === 'error'
              ? 'border-red-200'
              : toast.tone === 'info'
                ? 'border-sky-200'
                : 'border-forest-200'
          }`}
        >
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
              toast.tone === 'error' ? 'bg-red-500' : toast.tone === 'info' ? 'bg-sky-500' : 'bg-forest-600'
            }`}
          >
            {toast.tone === 'error' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-forest-900">{toast.title}</p>
            {toast.body && <p className="mt-0.5 text-xs text-forest-600">{toast.body}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded p-1 text-forest-400 hover:text-forest-700"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- stati/empty */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'green',
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  tone?: 'green' | 'gold' | 'blue' | 'red';
  trend?: { value: string; positive?: boolean };
}) {
  const tones = {
    green: 'bg-forest-50 text-forest-700',
    gold: 'bg-gold-50 text-gold-700',
    blue: 'bg-sky-50 text-sky-700',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card-pad">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-forest-600">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon name={icon} className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
      <p className="stat-value mt-3">{value}</p>
      {(hint || trend) && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-forest-600">
          {trend && (
            <span className={trend.positive ? 'font-semibold text-forest-600' : 'font-semibold text-red-500'}>
              {trend.value}
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  icon = 'Inbox',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest-200 bg-white/70 px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-500">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="font-display text-lg text-forest-900">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-forest-600">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="kicker mb-1">{eyebrow}</p>}
        <h2 className="font-display text-xl text-forest-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-forest-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ tabs */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="pill-tabs no-scrollbar max-w-full overflow-x-auto" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`pill-tab whitespace-nowrap ${value === tab.key ? 'pill-tab-active' : ''}`}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className="ml-1.5 rounded-full bg-forest-100 px-1.5 py-0.5 text-[10px] font-bold text-forest-700">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- mini charts */
export function BarChart({ data, unit }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const shown = useMemo(() => data, [data]);
  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {shown.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold text-forest-700">
            {unit === 'RWF' ? `${Math.round(d.value / 1000)}k` : d.value}
          </span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-forest-600 to-forest-400 transition-all"
            style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
            role="img"
            aria-label={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-forest-600">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#EDF4F0" strokeWidth="16" />
        {data.map((d) => {
          const length = (d.value / total) * circ;
          const el = (
            <circle
              key={d.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${length} ${circ - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return el;
        })}
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-forest-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-semibold text-forest-900">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = 'green' }: { value: number; max?: number; tone?: 'green' | 'gold' }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-forest-100">
      <div
        className={`h-full rounded-full ${tone === 'gold' ? 'bg-gold-400' : 'bg-forest-600'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- pagination */
export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-forest-600">
        Page {page} / {pageCount}
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- misc bits */
export function LinkButton({
  to,
  children,
  variant = 'primary',
  className = '',
}: {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'gold' | 'ghost';
  className?: string;
}) {
  const map = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    gold: 'btn-gold',
    ghost: 'btn-ghost',
  };
  return (
    <Link to={to} className={`${map[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function ArrowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900">
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-forest-50/60 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-forest-500">{label}</span>
      <span className="text-sm font-medium text-forest-900">{value}</span>
    </div>
  );
}

export function DemoBanner() {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="bg-gold-100/80 px-4 py-2 text-center text-[12px] font-medium text-gold-800">
      <span className="mr-1.5 inline-block rounded bg-gold-400 px-1.5 py-0.5 text-[10px] font-bold uppercase text-forest-900">
        Demo
      </span>
      {t('auth.demoNotice')}
      <button type="button" onClick={() => setOpen(false)} className="ml-2 font-bold underline">
        {t('common.close')}
      </button>
    </div>
  );
}
