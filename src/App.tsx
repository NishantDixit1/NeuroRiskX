import React, { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AlertCircle, ArrowRight, Brain, History, LogOut, Stethoscope } from 'lucide-react';

import { AssessmentPage } from './pages/AssessmentPage';
import { HistoryPage } from './pages/HistoryPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { predictionService } from './services/api';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';
import { Assessment } from './types';

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

/** Fetches the user's real saved assessments and hands them to the page as props. */
const HistoryRoute = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    predictionService
      .getHistory()
      .then((rows) => {
        setAssessments(rows);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Could not load your history. Please try again.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {error}{' '}
          <button
            onClick={load}
            className="rounded font-semibold underline underline-offset-2 hover:text-rose-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            Retry
          </button>
        </p>
      </div>
    );
  }

  return (
    <HistoryPage
      assessments={assessments}
      isLoading={isLoading}
      onStartAssessment={() => navigate('/assess')}
    />
  );
};

const LandingRoute = () => {
  const navigate = useNavigate();
  return (
    <LandingPage
      onGetStarted={() => navigate('/signup')}
      onLogin={() => navigate('/login')}
      onTryDemo={() => navigate('/demo')}
    />
  );
};

/**
 * The public demo. Scores through /simulate, so a visitor gets the real model, the
 * real SHAP explanation and the working what-if panel without an account and without
 * writing a row. Signing up is what you do to *save* a result, not to see one.
 */
const DemoRoute = () => {
  const navigate = useNavigate();
  const resetAssessment = useStore((s) => s.reset);
  const clearResult = useStore((s) => s.clearResult);

  // A result left over from an earlier assessment must not greet a demo visitor.
  useEffect(() => {
    resetAssessment();
  }, [resetAssessment]);

  const leave = (to: string) => {
    resetAssessment();
    navigate(to);
  };

  // Signing up keeps what they typed, so the real intake is prefilled and one click
  // saves it. Only the demo's unsaved result is dropped.
  const saveToHistory = () => {
    clearResult();
    navigate('/signup');
  };

  const callout = (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
      <p className="text-sm text-blue-900">
        This run was scored by the live model but not saved. Create an account to keep
        your assessments and track them over time.
      </p>
      <button
        type="button"
        onClick={saveToHistory}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        Save this to my history
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => leave('/')}
            className="flex items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Brain className="h-7 w-7 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">NeuroRiskX</span>
          </button>

          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-[11px] text-blue-700">
            demo, nothing saved
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => leave('/login')}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </button>
            <button
              onClick={() => leave('/signup')}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AssessmentPage demo demoCallout={callout} />
      </main>
    </div>
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
        <Route path="/demo" element={<DemoRoute />} />
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
                <HistoryRoute />
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
