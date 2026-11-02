import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <Compass className="h-12 w-12 text-forest-400" />
      <p className="mt-5 font-display text-5xl text-forest-900">404</p>
      <h1 className="mt-2 font-display text-2xl text-forest-900">{t('common.pageNotFound', 'Page not found')}</h1>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-forest-600">
        The page you followed does not exist or was moved. Start from the homepage, browse services or open your
        dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn-primary">{t('nav.home', 'Home')}</Link>
        <Link to="/services" className="btn-outline">{t('nav.services', 'Services')}</Link>
        <Link to="/app" className="btn-ghost">{t('nav.dashboard', 'Dashboard')}</Link>
      </div>
    </div>
  );
}
