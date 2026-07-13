import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Download,
  Info,
  ListChecks,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { ModelInfo, PredictionResult, RiskBand } from '../types';

interface ResultsDashboardProps {
  result: PredictionResult;
  modelInfo: ModelInfo | null;
  onStartOver: () => void;
  onDownloadReport: () => void;
}

/**
 * Band identity: colour is always paired with an icon and a word, never colour
 * alone. The hero score wears the band colour too, so the number can never
 * contradict the verdict next to it.
 */
const BAND: Record<
  RiskBand,
  { word: string; Icon: typeof AlertTriangle; hero: string; fill: string; chip: string }
> = {
  low: {
    word: 'Low risk',
    Icon: CheckCircle2,
    hero: 'text-emerald-400',
    fill: 'bg-emerald-400',
    chip: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  },
  moderate: {
    word: 'Moderate risk',
    Icon: AlertCircle,
    hero: 'text-amber-400',
    fill: 'bg-amber-400',
    chip: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  },
  high: {
    word: 'High risk',
    Icon: AlertTriangle,
    hero: 'text-rose-400',
    fill: 'bg-rose-400',
    chip: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  },
};

/** The dark rail from the auth screens, reused as the result's plot surface. */
const PLOT_GRID: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

const TABS = [
  { id: 'overview', label: 'Overview', Icon: ShieldCheck },
  { id: 'explanation', label: 'Why this score', Icon: BarChart3 },
  { id: 'recommendations', label: 'Recommendations', Icon: ListChecks },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** 0 to 100 meter with the model's decision threshold marked on the track. */
const ScoreMeter: React.FC<{ score: number; threshold: number; fillClass: string }> = ({
  score,
  threshold,
  fillClass,
}) => {
  const clamped = Math.max(0, Math.min(score, 100));
  const t = Math.max(0, Math.min(threshold, 100));
  return (
    <div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(clamped.toFixed(1))}
        aria-valuetext={`Risk score ${score.toFixed(1)} of 100. Model decision threshold ${threshold}.`}
        aria-label="Risk score"
        className="relative"
      >
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-r-full ${fillClass} transition-all duration-500`}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span
          className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded-full bg-slate-100"
          style={{ left: `${t}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="relative mt-2 h-4 font-mono text-[11px] text-slate-500" aria-hidden="true">
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-slate-300"
          style={{ left: `${Math.max(12, Math.min(t, 88))}%` }}
        >
          threshold {threshold}
        </span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
};

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  modelInfo,
  onStartOver,
  onDownloadReport,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const band = BAND[result.riskBand];
  const BandIcon = band.Icon;
  const topDriver = result.topFeatures[0];
  const maxImpact = Math.max(...result.topFeatures.map((f) => f.impact), 0.001);

  const onTablistKeyDown = (event: React.KeyboardEvent) => {
    const current = TABS.findIndex((tab) => tab.id === activeTab);
    let next = -1;
    if (event.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (current + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next === -1) return;
    event.preventDefault();
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-5">
      {/* The verdict, on the plot surface. Score, band and meter agree by construction. */}
      <section
        className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100"
        style={PLOT_GRID}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                Assessment result
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
                <span className={`text-6xl font-semibold leading-none tracking-tight ${band.hero}`}>
                  {result.riskScore.toFixed(1)}
                </span>
                <div className="pb-0.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${band.chip}`}
                  >
                    <BandIcon className="h-4 w-4" aria-hidden="true" />
                    {band.word}
                  </span>
                  <p className="mt-1.5 text-sm text-slate-400">Model risk score, out of 100</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={onDownloadReport}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download report
              </button>
              <button
                onClick={onStartOver}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Start over
              </button>
            </div>
          </div>

          <div className="mt-8 max-w-2xl">
            <ScoreMeter
              score={result.riskScore}
              threshold={result.decisionThreshold}
              fillClass={band.fill}
            />
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm">
            {result.strokePrediction ? (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span className="text-rose-200">
                  Above the model's decision threshold. Flagged for follow-up.
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="text-slate-300">
                  Below the model's decision threshold. Not flagged.
                </span>
              </>
            )}
          </p>
        </div>

        <div className="border-t border-slate-800/80 px-6 py-3 sm:px-8">
          <p className="font-mono text-[11px] leading-relaxed text-slate-500">
            {modelInfo
              ? `${modelInfo.modelLabel} · ${modelInfo.explainer} · ROC-AUC ${modelInfo.rocAuc} · scored against threshold ${result.decisionThreshold}`
              : `ROC-AUC ${result.modelRocAuc} · scored against threshold ${result.decisionThreshold}`}
          </p>
        </div>
      </section>

      {/* The disclaimer, exactly once, served by the API and impossible to miss. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-gray-600">{result.disclaimer}</p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Result details"
        onKeyDown={onTablistKeyDown}
        className="flex gap-6 border-b border-gray-200"
      >
        {TABS.map((tab, index) => {
          const active = activeTab === tab.id;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`results-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`results-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                active
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-400'}`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`results-panel-${activeTab}`}
        aria-labelledby={`results-tab-${activeTab}`}
      >
        {/* ---------- Overview ---------- */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold tracking-tight text-gray-900">
                  Scored inputs
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Echoed back from the model request, so you can verify what was scored.
                </p>
                <dl className="mt-4 divide-y divide-gray-100">
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Age</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">
                      {result.inputs.age}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Gender</dt>
                    <dd className="text-sm font-medium capitalize text-gray-900">
                      {result.inputs.gender}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">BMI</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">
                      {result.inputs.bmi.toFixed(1)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Average glucose level</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">
                      {result.inputs.avgGlucoseLevel.toFixed(1)} mg/dL
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold tracking-tight text-gray-900">
                  About this model
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Reported by the scoring service. No model fact on this page is typed in by hand.
                </p>
                <dl className="mt-4 divide-y divide-gray-100">
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Model</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">
                      {modelInfo?.modelLabel ?? 'Unavailable'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Explanations</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">
                      {modelInfo?.explainer ?? 'Unavailable'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">ROC-AUC, held-out test set</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">
                      {modelInfo?.rocAuc ?? result.modelRocAuc}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Recall / precision</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">
                      {modelInfo ? `${modelInfo.recall} / ${modelInfo.precision}` : 'Unavailable'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Decision threshold</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">
                      {modelInfo?.decisionThreshold ?? result.decisionThreshold}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-600">Training data</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">
                      {modelInfo ? (
                        <>
                          {modelInfo.dataset.name}
                          <span className="block font-mono text-xs tabular-nums text-gray-500">
                            {modelInfo.dataset.nRecords.toLocaleString()} records,{' '}
                            {(modelInfo.dataset.positiveRate * 100).toFixed(1)}% positive
                          </span>
                        </>
                      ) : (
                        'Unavailable'
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            {topDriver && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4">
                <p className="flex items-center gap-2.5 text-sm text-gray-700">
                  {topDriver.direction === 'increases' ? (
                    <ArrowUp className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  )}
                  <span>
                    <span className="font-semibold text-gray-900">{topDriver.feature}</span> was
                    the largest single factor,{' '}
                    {topDriver.direction === 'increases'
                      ? 'pushing this score up'
                      : 'pulling this score down'}{' '}
                    ({topDriver.impact.toFixed(1)}% of the explanation).
                  </span>
                </p>
                <button
                  onClick={() => setActiveTab('explanation')}
                  className="inline-flex items-center gap-1 rounded text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  See the full breakdown
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- Why this score: the itemized ledger ---------- */}
        {activeTab === 'explanation' && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              What drove this score
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              SHAP values computed for your inputs, not generic feature importances. Factors on
              the right of the spine pushed the score up, factors on the left pulled it down.
            </p>

            <div className="mt-7 space-y-5">
              {result.topFeatures.map((f, index) => {
                const increases = f.direction === 'increases';
                const width = (f.impact / maxImpact) * 46;
                return (
                  <div key={f.feature}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="flex min-w-0 items-baseline gap-2.5 text-sm text-gray-800">
                        <span className="font-mono text-[11px] text-gray-400" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate">{f.feature}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums text-gray-900">
                        {increases ? (
                          <ArrowUp className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                        )}
                        {increases ? '+' : '-'}
                        {f.impact.toFixed(1)}%
                        <span className="sr-only">
                          , {increases ? 'increases' : 'decreases'} risk
                        </span>
                      </span>
                    </div>
                    <div className="relative mt-1.5 h-3" aria-hidden="true">
                      <span className="absolute left-1/2 top-0 h-full w-px bg-gray-300" />
                      {increases ? (
                        <span
                          className="absolute left-1/2 top-0 h-full rounded-r bg-rose-600 transition-all duration-500"
                          style={{ width: `${width}%` }}
                        />
                      ) : (
                        <span
                          className="absolute right-1/2 top-0 h-full rounded-l bg-blue-600 transition-all duration-500"
                          style={{ width: `${width}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
                Pushed the score up
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                Pulled the score down
              </span>
              <span className="ml-auto font-mono text-[11px] text-gray-400">
                % = share of this explanation, bars scaled to the largest factor
              </span>
            </div>
          </section>
        )}

        {/* ---------- Recommendations ---------- */}
        {activeTab === 'recommendations' && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              Recommendations
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Returned by the scoring service alongside your score.
            </p>
            {result.recommendations.length > 0 ? (
              <ol className="mt-6 space-y-4">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex gap-4">
                    <span className="pt-0.5 font-mono text-xs text-gray-400" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm leading-relaxed text-gray-700">{recommendation}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 text-sm text-gray-500">
                No recommendations were returned for this result.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default ResultsDashboard;
