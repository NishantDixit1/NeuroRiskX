import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Brain, History, LogOut, Stethoscope } from 'lucide-react';

import { AssessmentPage } from './pages/AssessmentPage';
import { HistoryPage } from './pages/HistoryPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';

const FullPageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
  </div>
);

/** Gates the app behind a valid session. */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isReady } = useAuthStore();
  const location = useLocation();

  if (!isReady) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
};

/** Chrome shown only on the signed-in pages. The public pages own their whole canvas. */
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const resetAssessment = useStore((s) => s.reset);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const signOut = () => {
    logout();
    resetAssessment();
    navigate('/');
  };

  const navLink = (to: string, label: string, Icon: typeof History) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/assess" className="flex items-center gap-2.5">
            <Brain className="h-7 w-7 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">NeuroRiskX</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLink('/assess', 'Assess', Stethoscope)}
            {navLink('/history', 'History', History)}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{user?.email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

/** Already signed in? Skip the auth screens. */
const RedirectIfAuthed: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isReady } = useAuthStore();
  if (!isReady) return <FullPageSpinner />;
  if (user) return <Navigate to="/assess" replace />;
  return <>{children}</>;
};

const LoginRoute = () => {
  const { login, error, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/assess';

  useEffect(() => clearError, [clearError]);

  return (
    <LoginPage
      isLoading={isLoading}
      error={error}
      onSubmit={async (email, password) => {
        await login(email, password);
        navigate(from, { replace: true });
      }}
      onSwitchToSignup={() => navigate('/signup')}
    />
  );
};

const SignupRoute = () => {
  const { signup, error, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => clearError, [clearError]);

  return (
    <SignupPage
      isLoading={isLoading}
      error={error}
      onSubmit={async (email, password) => {
        await signup(email, password);
        navigate('/assess', { replace: true });
      }}
      onSwitchToLogin={() => navigate('/login')}
    />
  );
};

const LandingRoute = () => {
  const navigate = useNavigate();
  return (
    <LandingPage
      onGetStarted={() => navigate('/signup')}
      onLogin={() => navigate('/login')}
    />
  );
};

function App() {
  const restore = useAuthStore((s) => s.restore);

  // Exchange any stored token for the current user before rendering routes.
  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginRoute />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <SignupRoute />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/assess"
          element={
            <RequireAuth>
              <AppLayout>
                <AssessmentPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <AppLayout>
                <HistoryPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
