import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Currency } from './types';
import { formatMoney } from './format';
import { useI18n } from './i18n';
import { uid } from './format';
import type { ToastData } from '../components/ui';

interface PrefsValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  money: (amount: number) => string;
  toast: (title: string, body?: string, tone?: ToastData['tone']) => void;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);
const CURRENCY_KEY = 'urugocare:currency';

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window === 'undefined') return 'RWF';
    return (window.localStorage.getItem(CURRENCY_KEY) as Currency | null) ?? 'RWF';
  });
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timers = useRef<Record<string, number>>({});

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) window.clearTimeout(timer);
    delete timers.current[id];
  }, []);

  const toast = useCallback(
    (title: string, body?: string, tone: ToastData['tone'] = 'success') => {
      const id = uid();
      setToasts((prev) => [...prev.slice(-2), { id, title, body, tone }]);
      timers.current[id] = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 5200);
    },
    [],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      Object.values(map).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({
      currency,
      setCurrency,
      money: (amount: number) => formatMoney(amount, currency, lang),
      toast,
      toasts,
      dismissToast,
    }),
    [currency, setCurrency, lang, toast, toasts, dismissToast],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PreferencesProvider');
  return ctx;
}
