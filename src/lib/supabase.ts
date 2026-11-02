import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type RuntimeConfig = { supabaseUrl?: string; supabaseAnonKey?: string };

declare global {
  interface Window {
    __URUGOCARE_CONFIG__?: RuntimeConfig;
    __URUGOCARE_ENV__?: RuntimeConfig;
  }
}

function readConfig(): RuntimeConfig {
  const runtime = typeof window !== 'undefined' ? window.__URUGOCARE_CONFIG__ : undefined;
  const env = typeof window !== 'undefined' ? window.__URUGOCARE_ENV__ : undefined;
  const merged = { ...env, ...runtime } as RuntimeConfig;
  return {
    supabaseUrl: merged.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: merged.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };
}

const config = readConfig();

export const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(config.supabaseUrl as string, config.supabaseAnonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const dataMode: 'supabase' | 'demo' = supabaseConfigured ? 'supabase' : 'demo';
