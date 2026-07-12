import { FormEvent, useMemo, useState } from "react";
import { describeModel, useModelInfo } from "../hooks/useModelInfo";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

interface LoginPageProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToSignup: () => void;
  error?: string | null;
  isLoading?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LedgerFactor {
  id: string;
  label: string;
  weight: number;
  met: boolean;
}

/**
 * The auth-screen signature: a live, SHAP-style ledger that itemizes the
 * form's readiness the same way the product itemizes a risk score.
 * Factors in place push right in blue; missing factors pull left in rose.
 */
function ExplanationLedger({ factors }: { factors: LedgerFactor[] }) {
  const score = factors.reduce(
    (sum, factor) => sum + (factor.met ? factor.weight : 0),
    0,
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Form readiness, itemized
        </span>
        <span
          className="font-mono text-sm tabular-nums text-slate-200"
          aria-live="polite"
        >
          {score}
          <span className="text-slate-500"> / 100</span>
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        {factors.map((factor) => (
          <div key={factor.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-300">{factor.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {factor.met ? `+${factor.weight}` : "+0"}
              </span>
            </div>
            <div className="relative mt-1.5 h-3" aria-hidden="true">
              <span className="absolute left-1/2 top-0 h-full w-px bg-slate-700" />
              <span
                className={
                  factor.met
                    ? "absolute left-1/2 top-0 h-full rounded-r bg-blue-400 transition-all duration-500"
                    : "absolute left-1/2 top-0 h-full w-0 rounded-r bg-blue-400 transition-all duration-500"
                }
                style={factor.met ? { width: `${factor.weight * 0.9}%` } : undefined}
              />
              <span
                className={
                  factor.met
                    ? "absolute right-1/2 top-0 h-full w-0 rounded-l bg-rose-400 transition-all duration-500"
                    : "absolute right-1/2 top-0 h-full rounded-l bg-rose-400 transition-all duration-500"
                }
                style={factor.met ? undefined : { width: `${factor.weight * 0.9}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" aria-hidden="true" />
          In place
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />
          Still missing
        </span>
      </div>

      {score === 100 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-200">
          <Check className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
          Every factor accounted for. Ready to submit.
        </p>
      )}
    </div>
  );
}

export default function LoginPage({
  onSubmit,
  onSwitchToSignup,
  error,
  isLoading,
}: LoginPageProps) {
  // Model facts are fetched, never typed in.
  const modelInfo = useModelInfo();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const factors = useMemo<LedgerFactor[]>(
    () => [
      {
        id: "email",
        label: "Email address",
        weight: 50,
        met: EMAIL_PATTERN.test(email),
      },
      {
        id: "password",
        label: "Password",
        weight: 50,
        met: password.length > 0,
      },
    ],
    [email, password],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    void onSubmit(email, password).catch(() => {
      // Failures surface through the `error` prop from the parent.
    });
  };

  return (
    <div className="grid min-h-screen bg-gray-50 lg:grid-cols-5">
      {/* Left rail: the product's core idea, live */}
      <aside
        className="relative flex flex-col justify-between bg-slate-950 px-6 py-8 text-slate-100 sm:px-10 lg:sticky lg:top-0 lg:col-span-2 lg:h-screen lg:py-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Activity className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            NeuroRiskX
          </span>
          <span className="rounded-full border border-slate-700 px-2 py-0.5 font-mono text-[11px] text-slate-400">
            educational demo
          </span>
        </div>

        <div className="my-10 max-w-md lg:my-0">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            Every prediction, itemized.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            NeuroRiskX explains each risk score factor by factor with
            per-patient SHAP values. As a small proof of the habit, this login
            form explains itself the same way. Type, and watch the ledger.
          </p>
          <div className="mt-6">
            <ExplanationLedger factors={factors} />
          </div>
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-slate-500">
          {describeModel(modelInfo)}
        </p>
      </aside>

      {/* Right: the intake-style form */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8 lg:col-span-3">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Log in
          </h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Pick up where your last assessment left off.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="space-y-7">
              <div className="flex gap-4">
                <span
                  className="pt-0.5 font-mono text-xs text-gray-400"
                  aria-hidden="true"
                >
                  01
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <label
                      htmlFor="login-email"
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      Email address
                    </label>
                    <span
                      className={
                        EMAIL_PATTERN.test(email)
                          ? "font-mono text-[11px] text-blue-600"
                          : "font-mono text-[11px] text-gray-400"
                      }
                    >
                      {EMAIL_PATTERN.test(email) ? "counted" : "pending"}
                    </span>
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <span
                  className="pt-0.5 font-mono text-xs text-gray-400"
                  aria-hidden="true"
                >
                  02
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      Password
                    </label>
                    <span
                      className={
                        password.length > 0
                          ? "font-mono text-[11px] text-blue-600"
                          : "font-mono text-[11px] text-gray-400"
                      }
                    >
                      {password.length > 0 ? "counted" : "pending"}
                    </span>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Your password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Logging in
                </>
              ) : (
                <>
                  Log in
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            New to NeuroRiskX?{" "}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="rounded font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Create an account
            </button>
          </p>

          <p className="mt-10 border-t border-gray-200 pt-4 font-mono text-[11px] text-gray-500">
            Educational demo. Not a medical device. Not for diagnosis or
            treatment.
          </p>
        </div>
      </main>
    </div>
  );
}
