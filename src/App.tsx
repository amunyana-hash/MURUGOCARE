import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { PublicLayout } from './components/layout';
import { HomeRedirect, RedirectIfAuthed, RequireAuth } from './components/guards';
import { ToastStack } from './components/ui';
import { usePrefs } from './lib/prefs';

import Home from './pages/Home';
import { Services } from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Providers from './pages/Providers';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

import CustomerOverview from './pages/customer/Overview';
import BookService from './pages/customer/BookService';
import CustomerBookings from './pages/customer/Bookings';
import BookingDetail from './pages/customer/BookingDetail';
import CustomerPayments from './pages/customer/Payments';
import Subscription from './pages/customer/Subscription';
import Complaints from './pages/customer/Complaints';
import CustomerProfile from './pages/customer/Profile';
import NotificationsPage from './pages/Notifications';

import FamilyHome from './pages/family/Home';
import FamilyProperties from './pages/family/Properties';
import FamilyRelatives from './pages/family/Relatives';
import FamilyReports from './pages/family/Reports';

import ProviderOverview from './pages/provider/Overview';
import ProviderJobs from './pages/provider/Jobs';
import ProviderJobDetail from './pages/provider/JobDetail';
import ProviderMarketplace from './pages/provider/Marketplace';
import ProviderQuotations from './pages/provider/Quotations';
import ProviderVerification from './pages/provider/Verification';
import ProviderEarnings from './pages/provider/Earnings';
import ProviderReviews from './pages/provider/Reviews';
import ProviderProfile from './pages/provider/Profile';

import AdminOverview from './pages/admin/Overview';
import AdminProviders from './pages/admin/Providers';
import AdminBookings from './pages/admin/Bookings';
import AdminPayments from './pages/admin/Payments';
import AdminComplaints from './pages/admin/Complaints';
import AdminUsers from './pages/admin/Users';
import AdminPlans from './pages/admin/Plans';
import AdminMessages from './pages/admin/Messages';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  const { toasts, dismissToast } = usePrefs();

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* public site */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:slug" element={<ServiceDetail />} />
          <Route path="providers" element={<Providers />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route
            path="login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />
        </Route>

        {/* customer */}
        <Route path="dashboard" element={<RequireAuth roles={['customer']}><CustomerOverview /></RequireAuth>} />
        <Route path="dashboard/book" element={<RequireAuth roles={['customer']}><BookService /></RequireAuth>} />
        <Route path="dashboard/bookings" element={<RequireAuth roles={['customer']}><CustomerBookings /></RequireAuth>} />
        <Route path="dashboard/bookings/:id" element={<RequireAuth roles={['customer']}><BookingDetail /></RequireAuth>} />
        <Route path="dashboard/payments" element={<RequireAuth roles={['customer']}><CustomerPayments /></RequireAuth>} />
        <Route path="dashboard/subscription" element={<RequireAuth roles={['customer']}><Subscription /></RequireAuth>} />
        <Route path="dashboard/complaints" element={<RequireAuth roles={['customer']}><Complaints /></RequireAuth>} />
        <Route path="dashboard/profile" element={<RequireAuth roles={['customer', 'admin']}><CustomerProfile /></RequireAuth>} />

        {/* family desk (diaspora) */}
        <Route path="family" element={<RequireAuth roles={['customer']}><FamilyHome /></RequireAuth>} />
        <Route path="family/properties" element={<RequireAuth roles={['customer']}><FamilyProperties /></RequireAuth>} />
        <Route path="family/relatives" element={<RequireAuth roles={['customer']}><FamilyRelatives /></RequireAuth>} />
        <Route path="family/requests" element={<RequireAuth roles={['customer']}><BookService familyMode /></RequireAuth>} />
        <Route path="family/reports" element={<RequireAuth roles={['customer']}><FamilyReports /></RequireAuth>} />

        {/* provider */}
        <Route path="provider" element={<RequireAuth roles={['provider']}><ProviderOverview /></RequireAuth>} />
        <Route path="provider/jobs" element={<RequireAuth roles={['provider']}><ProviderJobs /></RequireAuth>} />
        <Route path="provider/jobs/:id" element={<RequireAuth roles={['provider']}><ProviderJobDetail /></RequireAuth>} />
        <Route path="provider/marketplace" element={<RequireAuth roles={['provider']}><ProviderMarketplace /></RequireAuth>} />
        <Route path="provider/quotations" element={<RequireAuth roles={['provider']}><ProviderQuotations /></RequireAuth>} />
        <Route path="provider/verification" element={<RequireAuth roles={['provider']}><ProviderVerification /></RequireAuth>} />
        <Route path="provider/earnings" element={<RequireAuth roles={['provider']}><ProviderEarnings /></RequireAuth>} />
        <Route path="provider/reviews" element={<RequireAuth roles={['provider']}><ProviderReviews /></RequireAuth>} />
        <Route path="provider/profile" element={<RequireAuth roles={['provider']}><ProviderProfile /></RequireAuth>} />

        {/* admin */}
        <Route path="admin" element={<RequireAuth roles={['admin']}><AdminOverview /></RequireAuth>} />
        <Route path="admin/providers" element={<RequireAuth roles={['admin']}><AdminProviders /></RequireAuth>} />
        <Route path="admin/bookings" element={<RequireAuth roles={['admin']}><AdminBookings /></RequireAuth>} />
        <Route path="admin/payments" element={<RequireAuth roles={['admin']}><AdminPayments /></RequireAuth>} />
        <Route path="admin/complaints" element={<RequireAuth roles={['admin']}><AdminComplaints /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
        <Route path="admin/plans" element={<RequireAuth roles={['admin']}><AdminPlans /></RequireAuth>} />
        <Route path="admin/messages" element={<RequireAuth roles={['admin']}><AdminMessages /></RequireAuth>} />

        {/* shared */}
        <Route path="notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="app" element={<HomeRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
