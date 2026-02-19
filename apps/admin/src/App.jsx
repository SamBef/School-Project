import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CreateCompanyPage from './pages/CreateCompanyPage';
import ProfilePage from './pages/ProfilePage';

const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));

function PageFallback() {
  return <p className="loading">Loading…</p>;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies/new"
        element={
          <ProtectedRoute>
            <CreateCompanyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies/:id"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageFallback />}>
              <CompanyDetailPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
