import { useModelInfo } from "../hooks/useModelInfo";
import {
  Activity,
  ArrowRight,
  Check,
  ClipboardList,
  FlaskConical,
  Info,
  Scale,
  ShieldAlert,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

/**
 * Illustrative example only. These values are a hand-written sample of the
 * product's output format, clearly labeled as such in the UI. They are not
 * real patient data and not real model output.
 */
const EXAMPLE_FACTORS: {
  label: string;
  pct: number;
  direction: "down" | "up";
}[] = [
  { label: "Age 31", pct: 76, direction: "down" },
  { label: "Avg glucose 88 mg/dL", pct: 9, direction: "down" },
  { label: "Never smoked", pct: 7, direction: "down" },
  { label: "BMI 29.1", pct: 5, direction: "up" },
  { label: "No hypertension", pct: 3, direction: "down" },
];

const INPUT_FIELDS = [
  "Age",
  "Gender",
  "BMI",
  "Average glucose",
  "Hypertension",
  "Heart disease",
  "Smoking status",
  "Work and residence type",
];

function ExampleExplanationCard() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Example explanation
        </h3>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-mono text-[11px] text-gray-500">
          per-patient SHAP
        </span>
      </div>

      {/* Risk score meter */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Risk score
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            Low
          </span>
        </div>
        <p className="mt-1 text-4xl font-semibold text-gray-900">
          9<span className="text-lg font-normal text-gray-400"> / 100</span>
        </p>
        <div
          className="mt-2 h-2 w-full rounded-full bg-emerald-100"
          role="img"
          aria-label="Risk meter showing 9 out of 100"
        >
          <div className="h-2 w-[9%] rounded-full bg-emerald-600" />
        </div>
      </div>

      {/* SHAP contribution bars */}
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Why this score
        </p>
        <div className="mt-3 space-y-3">
          {EXAMPLE_FACTORS.map((factor) => (
            <div key={factor.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-700">{factor.label}</span>
                <span className="font-mono text-xs tabular-nums text-gray-500">
                  {factor.direction === "down" ? "-" : "+"}
                  {factor.pct}%
                </span>
              </div>
              <div className="relative mt-1 h-3.5" aria-hidden="true">
                <span className="absolute left-1/2 top-0 h-full w-px bg-gray-300" />
                {factor.direction === "down" ? (
                  <span
                    className="absolute right-1/2 top-0 h-full rounded-l bg-blue-600"
                    style={{ width: `${factor.pct * 0.6}%` }}
                  />
                ) : (
                  <span
                    className="absolute left-1/2 top-0 h-full rounded-r bg-rose-600"
                    style={{ width: `${factor.pct * 0.6}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-blue-600"
              aria-hidden="true"
            />
            Pushed risk down
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-rose-600"
              aria-hidden="true"
            />
            Pushed risk up
          </span>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-1.5 border-t border-gray-100 pt-4 text-xs text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Illustrative example of the output format. Not a real patient, not real
        model output.
      </p>
    </div>
  );
}

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
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
              onClick={onGetStarted}
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
              Enter eight health details. A transparent model returns a 0 to
              100 stroke-risk score with a low, moderate, or high band. Then
              per-patient SHAP values show exactly how much each factor pushed
              your score up or down.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Create a free account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Log in
              </button>
            </div>
            <p className="mt-5 font-mono text-xs text-gray-500">
              Educational demo. Not a medical device. Not for diagnosis.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ExampleExplanationCard />
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
                A signed, itemized breakdown of your score. It can say things
                like: &ldquo;Your age pushed your risk down, and it carries 76%
                of this explanation.&rdquo;
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Wording shown is an illustrative example of the output format.
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
              Free to try. Every score arrives with its full, itemized
              explanation.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Create a free account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Log in
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
        </div>
      </footer>
    </div>
  );
}
