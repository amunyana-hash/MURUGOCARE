import { useCallback, useEffect, useMemo, useState } from 'react';
import { listRows, subscribeToData, type ListOptions, type TableName } from './db';
import type { Category, Notification } from './types';
import { useAuth } from './auth';

/** Loads rows for a table and refreshes whenever the data layer changes. */
export function useRows<T>(table: TableName, options: ListOptions = {}): {
  rows: T[];
  loading: boolean;
  reload: () => void;
} {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const key = JSON.stringify(options);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listRows<T>(table, JSON.parse(key) as ListOptions)
      .then((data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [table, key, tick]);

  useEffect(() => subscribeToData(reload), [reload]);

  return { rows, loading, reload };
}

export function useCategories(): { categories: Category[]; loading: boolean } {
  const { rows, loading } = useRows<Category>('categories', {
    order: { column: 'base_price', ascending: true },
  });
  return { categories: rows, loading };
}

export function useNotifications(): {
  notifications: Notification[];
  unread: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loading: boolean;
} {
  const { profile } = useAuth();
  const { rows } = useRows<Notification>('notifications', {
    where: profile ? { user_id: profile.id } : { user_id: '__none__' },
    order: { column: 'created_at', ascending: false },
  });
  const [local, setLocal] = useState<Record<string, boolean>>({});

  const notifications = useMemo(
    () => rows.map((n) => (local[n.id] ? { ...n, read: true } : n)),
    [rows, local],
  );
  const unread = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    setLocal((prev) => ({ ...prev, [id]: true }));
    const { updateRow } = await import('./db');
    await updateRow<Notification>('notifications', id, { read: true });
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadRows = notifications.filter((n) => !n.read);
    setLocal((prev) => {
      const next = { ...prev };
      unreadRows.forEach((n) => {
        next[n.id] = true;
      });
      return next;
    });
    const { updateRow } = await import('./db');
    await Promise.all(unreadRows.map((n) => updateRow<Notification>('notifications', n.id, { read: true })));
  }, [notifications]);

  return { notifications, unread, markRead, markAllRead, loading: false };
}

export function useIsDiaspora(): boolean {
  const { profile } = useAuth();
  return Boolean(profile?.is_diaspora);
}
