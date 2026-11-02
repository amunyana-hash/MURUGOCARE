import { supabase, dataMode } from './supabase';
import * as seed from './seed';
import { uid } from './format';

export type TableName =
  | 'profiles'
  | 'categories'
  | 'providers'
  | 'properties'
  | 'family_members'
  | 'bookings'
  | 'quotations'
  | 'payments'
  | 'reviews'
  | 'complaints'
  | 'notifications'
  | 'care_reports'
  | 'plans'
  | 'subscriptions'
  | 'contact_messages';

export interface Where {
  [column: string]: string | number | boolean | null;
}

export interface ListOptions {
  where?: Where;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

const STORAGE_KEY = 'urugocare:db:v1';

type Store = Record<TableName, Record<string, unknown>[]>;

function seedStore(): Store {
  return {
    profiles: structuredClone(seed.profiles) as unknown as Record<string, unknown>[],
    categories: structuredClone(seed.categories) as unknown as Record<string, unknown>[],
    providers: structuredClone(seed.providers) as unknown as Record<string, unknown>[],
    properties: structuredClone(seed.properties) as unknown as Record<string, unknown>[],
    family_members: structuredClone(seed.familyMembers) as unknown as Record<string, unknown>[],
    bookings: structuredClone(seed.bookings) as unknown as Record<string, unknown>[],
    quotations: structuredClone(seed.quotations) as unknown as Record<string, unknown>[],
    payments: structuredClone(seed.payments) as unknown as Record<string, unknown>[],
    reviews: structuredClone(seed.reviews) as unknown as Record<string, unknown>[],
    complaints: structuredClone(seed.complaints) as unknown as Record<string, unknown>[],
    notifications: structuredClone(seed.notifications) as unknown as Record<string, unknown>[],
    care_reports: structuredClone(seed.careReports) as unknown as Record<string, unknown>[],
    plans: structuredClone(seed.plans) as unknown as Record<string, unknown>[],
    subscriptions: structuredClone(seed.subscriptions) as unknown as Record<string, unknown>[],
    contact_messages: structuredClone(seed.contactMessages) as unknown as Record<string, unknown>[],
  };
}

let memoryStore: Store | null = null;

function readStore(): Store {
  if (typeof window === 'undefined') return (memoryStore ??= seedStore());
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = seedStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<Store>;
    const base = seedStore();
    return { ...base, ...parsed } as Store;
  } catch {
    return (memoryStore ??= seedStore());
  }
}

function writeStore(store: Store): void {
  memoryStore = store;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* storage may be full or blocked; keep the in-memory copy */
    }
  }
}

const listeners = new Set<() => void>();

export function subscribeToData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let version = 0;
export function dataVersion(): number {
  return version;
}

function emit(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function matches(row: Record<string, unknown>, where?: Where): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

export async function listRows<T>(table: TableName, options: ListOptions = {}): Promise<T[]> {
  if (dataMode === 'supabase' && supabase) {
    let query = supabase.from(table).select('*');
    if (options.where) {
      Object.entries(options.where).forEach(([column, value]) => {
        query = value === null ? query.is(column, null) : query.eq(column, value);
      });
    }
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as T[];
  }

  const store = readStore();
  let rows = [...(store[table] ?? [])].filter((row) => matches(row, options.where));
  if (options.order) {
    const { column, ascending = false } = options.order;
    rows.sort((a, b) => {
      const av = a[column] as string | number;
      const bv = b[column] as string | number;
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (ascending ? 1 : -1);
    });
  }
  if (options.limit) rows = rows.slice(0, options.limit);
  return rows as T[];
}

export async function getRow<T>(table: TableName, id: string): Promise<T | null> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data as T) ?? null;
  }
  const store = readStore();
  return ((store[table] ?? []).find((row) => row.id === id) as T) ?? null;
}

export async function insertRow<T extends { id?: string }>(table: TableName, row: T): Promise<T> {
  const withId = { ...row, id: row.id ?? uid() } as T;
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from(table).insert(withId as never).select().single();
    if (error) throw new Error(`${table}: ${error.message}`);
    emit();
    return data as T;
  }
  const store = readStore();
  store[table] = [withId as unknown as Record<string, unknown>, ...(store[table] ?? [])];
  writeStore(store);
  emit();
  return withId;
}

export async function updateRow<T>(table: TableName, id: string, patch: Partial<T>): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from(table).update(patch as never).eq('id', id);
    if (error) throw new Error(`${table}: ${error.message}`);
    emit();
    return;
  }
  const store = readStore();
  store[table] = (store[table] ?? []).map((row) =>
    row.id === id ? { ...row, ...(patch as Record<string, unknown>) } : row,
  );
  writeStore(store);
  emit();
}

export async function removeRow(table: TableName, id: string): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`${table}: ${error.message}`);
    emit();
    return;
  }
  const store = readStore();
  store[table] = (store[table] ?? []).filter((row) => row.id !== id);
  writeStore(store);
  emit();
}

export async function publishNotification(
  rows: {
    user_id: string;
    audience: 'customer' | 'provider' | 'admin' | 'all';
    title: string;
    body: string;
    kind: string;
    link?: string;
  },
): Promise<void> {
  await insertRow('notifications', {
    id: uid(),
    read: false,
    created_at: new Date().toISOString(),
    ...rows,
  });
}

/** Restores the demo dataset (only meaningful when Supabase is not configured). */
export function resetDemoData(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  writeStore(seedStore());
  emit();
}
