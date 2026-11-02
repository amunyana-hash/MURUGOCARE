import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Lang, Profile, Role } from './types';
import { supabase, dataMode } from './supabase';
import { getRow, insertRow, listRows, updateRow } from './db';
import { demoAccounts, DEMO_PASSWORD } from './seed';
import { addDaysISO, uid } from './format';

interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  country?: string;
  city?: string;
  isDiaspora?: boolean;
  language?: Lang;
}

interface AuthValue {
  profile: Profile | null;
  loading: boolean;
  mode: 'supabase' | 'demo';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  signInDemo: (email: string) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const DEMO_SESSION_KEY = 'urugocare:session';
const DEMO_ACCOUNTS_KEY = 'urugocare:accounts:v1';

const palette = ['#1D6248', '#A07D19', '#2E7A5A', '#7C5F16', '#144E39'];

interface DemoAccount {
  profile: Profile;
  password: string;
}

async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(`urugocare::${password}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback for non-secure contexts: reversible-free obfuscation, demo mode only.
  return `plain:${btoa(unescape(encodeURIComponent(password)))}`;
}

async function demoAccountsSeed(): Promise<DemoAccount[]> {
  const hashes = await Promise.all(demoAccounts.map((a) => hashPassword(a.password)));
  return demoAccounts.map((account, i) => {
    const profile: Profile = {
      id:
        account.role === 'customer'
          ? 'u-customer-1'
          : account.role === 'provider'
            ? 'u-provider-1'
            : account.role === 'admin'
              ? 'u-admin-1'
              : 'u-diaspora-1',
      role: account.role === 'admin' ? 'admin' : account.role === 'provider' ? 'provider' : 'customer',
      full_name: account.name,
      email: account.email,
      phone: account.role === 'customer' ? '+250 788 451 220' : undefined,
      country: account.role === 'customer' ? 'Rwanda' : undefined,
      city: account.role === 'customer' ? 'Nyamata' : undefined,
      district: 'Bugesera',
      language: account.role === 'customer' && account.email.startsWith('diaspora') ? 'fr' : 'en',
      is_diaspora: account.email.startsWith('diaspora'),
      avatar_color: palette[i % palette.length],
      created_at: addDaysISO(-200),
    };
    return { profile, password: hashes[i] };
  });
}

async function readDemoAccounts(): Promise<DemoAccount[]> {
  const seed = await demoAccountsSeed();
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(DEMO_ACCOUNTS_KEY);
    if (!raw) {
      window.localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(seed));
      return seed;
    }
    const stored = JSON.parse(raw) as DemoAccount[];
    return stored.length ? stored : seed;
  } catch {
    return seed;
  }
}

function writeDemoAccounts(accounts: DemoAccount[]): void {
  try {
    window.localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSupabaseProfile = useCallback(async (userId: string, email?: string): Promise<Profile | null> => {
    const existing = await getRow<Profile>('profiles', userId);
    if (existing) return existing;
    if (!email) return null;
    const created: Profile = {
      id: userId,
      role: 'customer',
      full_name: email.split('@')[0],
      email,
      district: 'Bugesera',
      avatar_color: palette[0],
      created_at: new Date().toISOString(),
    };
    try {
      return await insertRow('profiles', created);
    } catch {
      return created;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (dataMode === 'supabase' && supabase) {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (session?.user) {
          const p = await loadSupabaseProfile(session.user.id, session.user.email ?? undefined);
          if (active) setProfile(p);
        }
        if (active) setLoading(false);

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
          if (nextSession?.user) {
            const p = await loadSupabaseProfile(nextSession.user.id, nextSession.user.email ?? undefined);
            setProfile(p);
          } else {
            setProfile(null);
          }
        });
        return () => listener.subscription.unsubscribe();
      }

      const sessionId = window.localStorage.getItem(DEMO_SESSION_KEY);
      if (sessionId) {
        const accounts = await readDemoAccounts();
        const match = accounts.find((a) => a.profile.id === sessionId);
        if (match && active) setProfile(match.profile);
      }
      if (active) setLoading(false);
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadSupabaseProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (dataMode === 'supabase' && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message);
      const p = await loadSupabaseProfile(data.user.id, data.user.email ?? undefined);
      setProfile(p);
      return;
    }
    const accounts = await readDemoAccounts();
    const hashed = await hashPassword(password);
    const match = accounts.find(
      (a) => a.profile.email.toLowerCase() === email.trim().toLowerCase() && a.password === hashed,
    );
    if (!match) throw new Error('Invalid email or password. Try a demo account below.');
    window.localStorage.setItem(DEMO_SESSION_KEY, match.profile.id);
    setProfile(match.profile);
  }, [loadSupabaseProfile]);

  const signInDemo = useCallback(async (email: string) => {
    await signIn(email, DEMO_PASSWORD);
  }, [signIn]);

  const signUp = useCallback(
    async (input: SignUpInput) => {
      if (dataMode === 'supabase' && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim().toLowerCase(),
          password: input.password,
          options: {
            data: {
              full_name: input.fullName,
              role: input.role,
              phone: input.phone,
              country: input.country,
              city: input.city,
              is_diaspora: input.isDiaspora ? 'true' : 'false',
            },
          },
        });
        if (error) throw new Error(error.message);
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            role: input.role,
            full_name: input.fullName,
            email: input.email.trim().toLowerCase(),
            phone: input.phone,
            country: input.country,
            city: input.city,
            district: 'Bugesera',
            language: input.language ?? 'en',
            is_diaspora: Boolean(input.isDiaspora),
            avatar_color: palette[Math.floor(Math.random() * palette.length)],
            created_at: new Date().toISOString(),
          };
          try {
            await insertRow('profiles', newProfile);
          } catch {
            /* profile row may already exist via trigger */
          }
          if (data.session) setProfile(newProfile);
        }
        return { needsConfirmation: !data.session };
      }

      const accounts = await readDemoAccounts();
      const email = input.email.trim().toLowerCase();
      if (accounts.some((a) => a.profile.email.toLowerCase() === email)) {
        throw new Error('An account with this email already exists. Please sign in.');
      }
      const newProfile: Profile = {
        id: uid(),
        role: input.role,
        full_name: input.fullName,
        email,
        phone: input.phone,
        country: input.country,
        city: input.city,
        district: 'Bugesera',
        language: input.language ?? 'en',
        is_diaspora: Boolean(input.isDiaspora),
        avatar_color: palette[Math.floor(Math.random() * palette.length)],
        created_at: new Date().toISOString(),
      };
      const hashed = await hashPassword(input.password);
      writeDemoAccounts([...accounts, { profile: newProfile, password: hashed }]);
      await insertRow('profiles', newProfile);
      if (input.role === 'provider') {
        await insertRow('providers', {
          id: uid(),
          user_id: newProfile.id,
          full_name: input.fullName,
          business_name: `${input.fullName.split(' ')[0]} Home Services`,
          category_slugs: ['home-cleaning'],
          skills: [],
          bio: 'New URUGOCARE provider — profile being completed.',
          verification_status: 'pending',
          rating: 0,
          reviews_count: 0,
          jobs_completed: 0,
          hourly_rate: 6000,
          district: 'Bugesera',
          sector: input.city || 'Nyamata',
          phone: input.phone ?? '',
          email,
          languages: ['Kinyarwanda'],
          id_document: 'Pending upload',
          certificate: 'Pending upload',
          years_experience: 1,
          available: true,
          verified_at: null,
          created_at: new Date().toISOString(),
        });
      }
      await insertRow('notifications', {
        user_id: newProfile.id,
        audience: newProfile.role,
        title: 'Welcome to URUGOCARE',
        body:
          input.role === 'provider'
            ? 'Upload your ID and certificate to start receiving jobs. Verification usually takes one working day.'
            : 'Your account is ready. Book your first service or open a family desk to manage relatives in Rwanda.',
        kind: 'system',
        read: false,
        link: input.role === 'provider' ? '/provider/verification' : '/dashboard',
        created_at: new Date().toISOString(),
      });
      window.localStorage.setItem(DEMO_SESSION_KEY, newProfile.id);
      setProfile(newProfile);
      return { needsConfirmation: false };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (dataMode === 'supabase' && supabase) {
      await supabase.auth.signOut();
    } else {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
    }
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!profile) throw new Error('Not signed in');
      await updateRow<Profile>('profiles', profile.id, patch);
      const next = { ...profile, ...patch };
      setProfile(next);
      if (dataMode === 'demo') {
        const accounts = await readDemoAccounts();
        writeDemoAccounts(
          accounts.map((a) => (a.profile.id === next.id ? { ...a, profile: next } : a)),
        );
      }
    },
    [profile],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    if (dataMode === 'supabase' && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw new Error(error.message);
    }
    // Demo mode: nothing is sent; the UI always shows a neutral confirmation.
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      profile,
      loading,
      mode: dataMode,
      signIn,
      signUp,
      signOut,
      signInDemo,
      updateProfile,
      requestPasswordReset,
    }),
    [profile, loading, signIn, signUp, signOut, signInDemo, updateProfile, requestPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useAccountsCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    void listRows<Profile>('profiles').then((rows) => setCount(rows.length));
  }, []);
  return count;
}
