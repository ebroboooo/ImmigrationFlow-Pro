import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { WelcomeScreen } from '../components/onboarding/WelcomeScreen';
import { canAccessRoute } from '../../lib/permissions';
import { STORAGE_KEYS } from '../../lib/constants';

const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Clients = lazy(() => import('../pages/Clients').then(m => ({ default: m.Clients })));
const Leads = lazy(() => import('../pages/Leads').then(m => ({ default: m.Leads })));
const Cases = lazy(() => import('../pages/Cases').then(m => ({ default: m.Cases })));
const Tasks = lazy(() => import('../pages/Tasks').then(m => ({ default: m.Tasks })));
const Documents = lazy(() => import('../pages/Documents').then(m => ({ default: m.Documents })));
const Deadlines = lazy(() => import('../pages/Deadlines').then(m => ({ default: m.Deadlines })));
const Calendar = lazy(() => import('../pages/Calendar').then(m => ({ default: m.Calendar })));
const Billing = lazy(() => import('../pages/Billing').then(m => ({ default: m.Billing })));
const Settings = lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })));
const Reports = lazy(() => import('../pages/Reports').then(m => ({ default: m.Reports })));
const Notifications = lazy(() => import('../pages/Notifications').then(m => ({ default: m.Notifications })));
const Login = lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));

const PageLoader = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white text-sm">
        Loading ImmigrationFlow Pro...
      </div>
    );
  }
  if (!user) return <Navigate to="/welcome" replace />;
  if (!canAccessRoute(user.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const AppRouter = () => {
  const isSetupComplete = localStorage.getItem(STORAGE_KEYS.setupComplete) === 'true';

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/welcome" element={
            isSetupComplete ? <Navigate to="/" replace /> : <WelcomeScreen />
          } />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="clients" element={<Clients />} />
            <Route path="customers" element={<Navigate to="/clients" replace />} />
            <Route path="cases" element={<Cases />} />
            <Route path="deals" element={<Navigate to="/cases" replace />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="documents" element={<Documents />} />
            <Route path="deadlines" element={<Deadlines />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="billing" element={<Billing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
