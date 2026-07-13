import { useEffect, useState } from "react";
import { useModelInfo } from "../hooks/useModelInfo";
import { predictionService } from "../services/api";
import { PredictionResult, RiskBand } from "../types";
import {
  Activity,
  ArrowRight,
  Check,
  ClipboardList,
  FlaskConical,
  Info,
  Loader2,
  Scale,
  ShieldAlert,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onTryDemo: () => void;
}

/** The ten answers the model is trained on, in the order the intake asks for them. */
const INPUT_FIELDS = [
  "Age",
  "Gender",
  "BMI",
  "Average glucose",
  "Hypertension",
  "Heart disease",
  "Ever married",
  "Work type",
  "Residence type",
  "Smoking status",
];

const BAND_STYLE: Record<RiskBand, { chip: string; bar: string; track: string }> = {
  low: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
    track: "bg-emerald-100",
  },
  moderate: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    track: "bg-amber-100",
  },
  high: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-600",
    track: "bg-rose-100",
  },
};

const BAND_LABEL: Record<RiskBand, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

/**
 * The hero card. This used to be a hand-written mock of the output format, which
 * meant the most prominent thing on the site was invented model output. It now
 * scores a real record from the held-out test set through the live API on page
 * load, so what a visitor sees first is the actual model actually running.
 */
function LiveExplanationCard() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    predictionService
      .getDemoPatient()
      .then((patient) => predictionService.simulate(patient))
      .then((scored) => {
        if (!cancelled) setResult(scored);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="flex items-start gap-1.5 text-sm text-gray-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          The scoring service is not reachable right now, so there is nothing real to
          show here. Rather than display a mock-up, this card stays empty.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
          Scoring a real patient through the model
        </div>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <div className="h-10 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-2 w-full animate-pulse rounded-full bg-gray-100" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const style = BAND_STYLE[result.riskBand];
  const top = result.topFeatures.slice(0, 5);

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Live model output</h3>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-mono text-[11px] text-gray-500">
          per-patient SHAP
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Risk score
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style.chip}`}
          >
            {BAND_LABEL[result.riskBand]}
          </span>
        </div>
        <p className="mt-1 text-4xl font-semibold tabular-nums text-gray-900">
          {result.riskScore.toFixed(1)}
          <span className="text-lg font-normal text-gray-400"> / 100</span>
        </p>
        <div
          className={`mt-2 h-2 w-full rounded-full ${style.track}`}
          role="img"
          aria-label={`Risk meter showing ${result.riskScore.toFixed(1)} out of 100`}
        >
          <div
            className={`h-2 rounded-full ${style.bar}`}
            style={{ width: `${Math.min(100, Math.max(2, result.riskScore))}%` }}
          />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Why this score
        </p>
        <div className="mt-3 space-y-3">
          {top.map((factor) => {
            const up = factor.direction === "increases";
            return (
              <div key={factor.feature}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-700">{factor.feature}</span>
                  <span className="font-mono text-xs tabular-nums text-gray-500">
                    {up ? "+" : "-"}
                    {factor.impact.toFixed(0)}%
                  </span>
                </div>
                <div className="relative mt-1 h-3.5" aria-hidden="true">
                  <span className="absolute left-1/2 top-0 h-full w-px bg-gray-300" />
                  {up ? (
                    <span
                      className="absolute left-1/2 top-0 h-full rounded-r bg-rose-600"
                      style={{ width: `${factor.impact * 0.5}%` }}
                    />
                  ) : (
                    <span
                      className="absolute right-1/2 top-0 h-full rounded-l bg-blue-600"
                      style={{ width: `${factor.impact * 0.5}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
            Pushed risk down
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
            Pushed risk up
          </span>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-1.5 border-t border-gray-100 pt-4 text-xs text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Scored just now, by the live model, on a real record from the held-out test
        set. Nothing on this card is a mock-up.
      </p>
    </div>
  );
}

export default function LandingPage({
  onGetStarted,
  onLogin,
  onTryDemo,
}: LandingPageProps) {
  // Every model and dataset number on this page is fetched from /model-info.
  const modelInfo = useModelInfo();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Activity className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              NeuroRiskX
            </span>
            <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-500 sm:inline">
              educational demo
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <a
              href="#how"
              className="rounded hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              How it works
            </a>
            <a
              href="#why"
              className="rounded hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Explainability
            </a>
            <a
              href="#model"
              className="rounded hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              The model
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={onTryDemo}
              className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Try the demo
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blue-600">
              Explainable stroke-risk assessment
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              A risk score that shows its work.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600">
              Answer ten health questions. A transparent model returns a 0 to
              100 stroke-risk score with a low, moderate, or high band. Then
              per-patient SHAP values show exactly how much each factor pushed
              your score up or down, and a what-if panel lets you change the
              factors you could act on and watch the model re-score you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onTryDemo}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Try it, no account needed
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onGetStarted}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Create a free account
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Log in
              </button>
            </div>
            <p className="mt-5 font-mono text-xs text-gray-500">
              Educational demo. Not a medical device. Not for diagnosis.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <LiveExplanationCard />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-400">01</span>
                  <ClipboardList
                    className="h-5 w-5 text-blue-600"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  Enter your details
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Eight inputs, the same ones the model was trained on:
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-gray-600">
                  {INPUT_FIELDS.map((field) => (
                    <li key={field} className="flex items-start gap-1.5">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
                        aria-hidden="true"
                      />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-400">02</span>
                  <FlaskConical
                    className="h-5 w-5 text-blue-600"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  The model scores your risk
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {modelInfo
                    ? `A ${modelInfo.modelLabel.toLowerCase()} model, trained on ${modelInfo.dataset.nRecords.toLocaleString()} records from the ${modelInfo.dataset.name}, returns a score from 0 to 100 and a band: low, moderate, or high. On that dataset it reaches a ROC-AUC of ${modelInfo.rocAuc}.`
                    : "The model returns a score from 0 to 100 and a band: low, moderate, or high."}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-400">03</span>
                  <Scale className="h-5 w-5 text-blue-600" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  SHAP explains every factor
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  For your inputs specifically, SHAP values itemize the score:
                  which factors pushed it up, which pushed it down, and how
                  much of the explanation each one carries. No black box.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why explainability */}
        <section id="why" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Most models hand you a number. This one hands you the reasoning.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Generic feature-importance charts show what matters to the model
              on average, so every patient sees the same chart. Per-patient
              SHAP values are different: they decompose your individual score,
              so the explanation is about you.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-gray-400">
                Typical
              </p>
              <h3 className="mt-2 text-base font-semibold text-gray-700">
                Generic feature importance
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                One averaged chart for the whole population. It cannot tell you
                whether your own age raised or lowered your own score.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-blue-600">
                NeuroRiskX
              </p>
              <h3 className="mt-2 text-base font-semibold text-gray-900">
                Per-patient SHAP values
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                A signed, itemized breakdown of your own score. Each factor is
                named, given a direction, and given its share of the
                explanation. The card above this is the real thing, not a
                drawing of it: it was scored by the live model when this page
                loaded.
              </p>
            </div>
          </div>
        </section>

        {/* Model card */}
        <section id="model" className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The model, stated plainly
            </h2>
            <p className="mt-3 max-w-2xl text-base text-gray-600">
              Everything below is the whole truth about what powers this demo.
              If a number is not listed here, we do not claim it.
            </p>
            <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Model type
                </dt>
                <dd className="mt-2 text-xl font-semibold text-gray-900">
                  {modelInfo?.modelLabel ?? "-"}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  ROC-AUC
                </dt>
                <dd className="mt-2 text-xl font-semibold text-gray-900">
                  {modelInfo?.rocAuc ?? "-"}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Training records
                </dt>
                <dd className="mt-2 text-xl font-semibold text-gray-900">
                  {modelInfo?.dataset.nRecords.toLocaleString() ?? "-"}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Explanations
                </dt>
                <dd className="mt-2 text-xl font-semibold text-gray-900">
                  {modelInfo?.explainer ?? "-"}
                </dd>
              </div>
            </dl>
            <ul className="mt-8 space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                {modelInfo
                  ? `Trained on a single public dataset (${modelInfo.dataset.name}). It has not been externally validated on other populations.`
                  : "Trained on a single public dataset. It has not been externally validated on other populations."}
              </li>
              <li className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                The model was chosen deliberately for being simple, auditable,
                and a clean fit for SHAP explanations.
              </li>
              <li className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                The score is a statistical estimate from that dataset, not a
                clinical measurement of you.
              </li>
            </ul>
          </div>
        </section>

        {/* Disclaimer */}
        <section
          aria-labelledby="disclaimer-heading"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <ShieldAlert
                className="mt-0.5 h-6 w-6 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div>
                <h2
                  id="disclaimer-heading"
                  className="text-lg font-semibold text-gray-900"
                >
                  This is an educational demo, not a medical device.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
                  {modelInfo?.disclaimer ??
                    "NeuroRiskX exists to demonstrate explainable machine learning. It is not medical advice."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-gray-200">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              See a prediction you can interrogate.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-gray-600">
              No account needed to run one. Every score arrives with its full,
              itemized explanation. An account is only for saving them.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onTryDemo}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Run an assessment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onGetStarted}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Create a free account
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <Activity className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </span>
            <span className="font-medium text-gray-700">NeuroRiskX</span>
          </div>
          <p className="font-mono text-xs">
            Educational demo. Not a medical device. Not medical advice.
          </p>
          <p className="text-xs">
            Built by{' '}
            <a
              href="https://stackwrights.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              StackWrights
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
