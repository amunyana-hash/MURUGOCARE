import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import type { Role } from '../lib/types';
import { EmptyState, LinkButton } from './ui';

function Loading() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-forest-200 border-t-forest-700" />
        <p className="text-sm text-forest-600">{t('common.loading')}</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(profile.role)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          icon="ShieldAlert"
          title="You do not have access to this area"
          body={`Your account role (${profile.role}) cannot open this page. Use the dashboard that matches your role.`}
          action={<LinkButton to="/">{t('nav.dashboard')}</LinkButton>}
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function HomeRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'provider') return <Navigate to="/provider" replace />;
  return <Navigate to={profile.is_diaspora ? '/family' : '/dashboard'} replace />;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'provider') return <Navigate to="/provider" replace />;
    return <Navigate to={profile.is_diaspora ? '/family' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}
