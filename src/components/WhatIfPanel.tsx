import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Minus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { PatientData, PredictionResult, RiskBand } from '../types';

interface WhatIfPanelProps {
  baseline: PredictionResult;
  baselineInputs: PatientData;
  /** Calls the real /simulate endpoint. Never mocked, never estimated locally. */
  onSimulate: (data: PatientData) => Promise<PredictionResult>;
}

/** SHAP polarity on the dark plot surface: blue pulls risk down, rose pushes it up. */
const SHAP_DOWN = '#60a5fa';
const SHAP_UP = '#fb7185';
const SHAP_NEUTRAL = '#94a3b8';

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

const PLOT_GRID: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

const LABEL = 'text-xs font-semibold uppercase tracking-wide text-gray-600';

const RADIO_CARD =
  'flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/70 has-[:checked]:text-blue-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/30';

const SMOKING_OPTIONS: { value: PatientData['smokingStatus']; label: string }[] = [
  { value: 'never_smoked', label: 'Never smoked' },
  { value: 'formerly_smoked', label: 'Formerly smoked' },
  { value: 'smokes', label: 'Smokes' },
  { value: 'unknown', label: 'Prefer not to say' },
];

const smokingLabel = (value: PatientData['smokingStatus']) =>
  SMOKING_OPTIONS.find((option) => option.value === value)?.label ?? value;

const round1 = (value: number) => Math.round(value * 10) / 10;

const formatSigned = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;

/** A numbered slider + numeric input pair. Both stay in sync; both are labelled. */
const RangeField: React.FC<{
  index: string;
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  text: string;
  baselineValue: number;
  onText: (text: string) => void;
  onValue: (value: number) => void;
}> = ({ index, id, label, unit, min, max, step, value, text, baselineValue, onText, onValue }) => {
  const changed = value !== baselineValue;
  return (
    <div className="flex gap-4">
      <span className="pt-0.5 font-mono text-xs text-gray-400" aria-hidden="true">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className={LABEL}>
            {label}
          </label>
          <span
            className={`font-mono text-[11px] tabular-nums ${changed ? 'text-blue-600' : 'text-gray-400'}`}
          >
            {changed ? `was ${baselineValue.toFixed(1)}` : 'as answered'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => {
              const next = round1(Number(event.target.value));
              onValue(next);
              onText(String(next));
            }}
            aria-label={`${label}, slider`}
            className="min-w-0 flex-1 cursor-pointer accent-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
          />
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={text}
            onChange={(event) => {
              const raw = event.target.value;
              onText(raw);
              const parsed = Number(raw);
              if (raw !== '' && !Number.isNaN(parsed) && parsed >= min && parsed <= max) {
                onValue(round1(parsed));
              }
            }}
            onBlur={() => onText(String(value))}
            className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right font-mono text-sm tabular-nums text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <span className="w-12 shrink-0 text-xs text-gray-500">{unit}</span>
        </div>
      </div>
    </div>
  );
};

/** A numbered radio-card group for categorical and boolean inputs. */
function ChoiceField<T extends string | boolean>({
  index,
  name,
  label,
  options,
  value,
  baselineValue,
  onChange,
}: {
  index: string;
  name: string;
  label: string;
  options: { value: T; label: string }[];
  value: T;
  baselineValue: T;
  onChange: (value: T) => void;
}) {
  const changed = value !== baselineValue;
  const baselineLabel =
    options.find((option) => option.value === baselineValue)?.label ?? String(baselineValue);
  return (
    <div className="flex gap-4">
      <span className="pt-0.5 font-mono text-xs text-gray-400" aria-hidden="true">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span id={`${name}-label`} className={LABEL}>
            {label}
          </span>
          <span className={`font-mono text-[11px] ${changed ? 'text-blue-600' : 'text-gray-400'}`}>
            {changed ? `was ${baselineLabel.toLowerCase()}` : 'as answered'}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby={`${name}-label`}
          className="mt-2 grid grid-cols-2 gap-2.5"
        >
          {options.map((option) => (
            <label key={String(option.value)} className={RADIO_CARD}>
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                className="peer sr-only"
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
              <Check
                className="h-4 w-4 shrink-0 text-blue-600 opacity-0 transition-opacity peer-checked:opacity-100"
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

type SimStatus = 'baseline' | 'scoring' | 'scored' | 'error';

export const WhatIfPanel: React.FC<WhatIfPanelProps> = ({
  baseline,
  baselineInputs,
  onSimulate,
}) => {
  const [draft, setDraft] = useState<PatientData>(baselineInputs);
  const [bmiText, setBmiText] = useState(String(baselineInputs.bmi));
  const [glucoseText, setGlucoseText] = useState(String(baselineInputs.avgGlucoseLevel));
  const [sim, setSim] = useState<PredictionResult | null>(null);
  const [status, setStatus] = useState<SimStatus>('baseline');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const requestSeq = useRef(0);

  // Keep the latest callback without retriggering the debounce effect.
  const simulateRef = useRef(onSimulate);
  useEffect(() => {
    simulateRef.current = onSimulate;
  });

  // A new saved assessment resets the sandbox to it.
  useEffect(() => {
    setDraft(baselineInputs);
    setBmiText(String(baselineInputs.bmi));
    setGlucoseText(String(baselineInputs.avgGlucoseLevel));
    setSim(null);
    setStatus('baseline');
    setElapsedMs(null);
  }, [baselineInputs]);

  const isDirty = useMemo(
    () =>
      draft.bmi !== baselineInputs.bmi ||
      draft.avgGlucoseLevel !== baselineInputs.avgGlucoseLevel ||
      draft.smokingStatus !== baselineInputs.smokingStatus ||
      draft.hypertension !== baselineInputs.hypertension ||
      draft.heartDisease !== baselineInputs.heartDisease,
    [draft, baselineInputs],
  );

  /**
   * Debounced live re-scoring. Every run is a real POST to the model; the
   * elapsed time and run counter shown in the panel are measured, not made up.
   */
  useEffect(() => {
    if (!isDirty) {
      requestSeq.current += 1; // invalidate anything in flight
      setSim(null);
      setStatus('baseline');
      setElapsedMs(null);
      return;
    }
    const seq = ++requestSeq.current;
    setStatus('scoring');
    const timer = setTimeout(() => {
      const started = performance.now();
      simulateRef.current(draft)
        .then((next) => {
          if (requestSeq.current !== seq) return; // a newer edit superseded this run
          setSim(next);
          setElapsedMs(Math.round(performance.now() - started));
          setRunCount((count) => count + 1);
          setStatus('scored');
        })
        .catch(() => {
          if (requestSeq.current !== seq) return;
          setStatus('error');
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, isDirty, retryKey]);

  const update = (patch: Partial<PatientData>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const reset = () => {
    setDraft(baselineInputs);
    setBmiText(String(baselineInputs.bmi));
    setGlucoseText(String(baselineInputs.avgGlucoseLevel));
  };

  const shown = sim ?? baseline;
  const shownBand = BAND[shown.riskBand];
  const ShownBandIcon = shownBand.Icon;
  const baselineBand = BAND[baseline.riskBand];
  const BaselineBandIcon = baselineBand.Icon;

  const delta = sim ? sim.riskScore - baseline.riskScore : 0;
  const DeltaIcon = delta < -0.05 ? TrendingDown : delta > 0.05 ? TrendingUp : Minus;
  const deltaColor = delta < -0.05 ? SHAP_DOWN : delta > 0.05 ? SHAP_UP : SHAP_NEUTRAL;
  const deltaWord =
    delta < -0.05 ? 'points lower risk' : delta > 0.05 ? 'points higher risk' : 'no meaningful change';

  const changes = useMemo(() => {
    const list: { key: string; text: string }[] = [];
    if (draft.bmi !== baselineInputs.bmi) {
      list.push({ key: 'bmi', text: `BMI ${baselineInputs.bmi.toFixed(1)} → ${draft.bmi.toFixed(1)}` });
    }
    if (draft.avgGlucoseLevel !== baselineInputs.avgGlucoseLevel) {
      list.push({
        key: 'glucose',
        text: `glucose ${baselineInputs.avgGlucoseLevel.toFixed(1)} → ${draft.avgGlucoseLevel.toFixed(1)}`,
      });
    }
    if (draft.smokingStatus !== baselineInputs.smokingStatus) {
      list.push({
        key: 'smoking',
        text: `smoking: ${smokingLabel(baselineInputs.smokingStatus).toLowerCase()} → ${smokingLabel(draft.smokingStatus).toLowerCase()}`,
      });
    }
    if (draft.hypertension !== baselineInputs.hypertension) {
      list.push({
        key: 'hypertension',
        text: `hypertension: ${baselineInputs.hypertension ? 'yes' : 'no'} → ${draft.hypertension ? 'yes' : 'no'}`,
      });
    }
    if (draft.heartDisease !== baselineInputs.heartDisease) {
      list.push({
        key: 'heartDisease',
        text: `heart disease: ${baselineInputs.heartDisease ? 'yes' : 'no'} → ${draft.heartDisease ? 'yes' : 'no'}`,
      });
    }
    return list;
  }, [draft, baselineInputs]);

  const threshold = Math.max(0, Math.min(baseline.decisionThreshold, 100));
  const shownClamped = Math.max(0, Math.min(shown.riskScore, 100));
  const baselinePos = Math.max(0, Math.min(baseline.riskScore, 100));

  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-6 sm:px-8">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              What would change it?
            </h3>
            <p className="mt-0.5 max-w-xl text-sm text-gray-600">
              Adjust the factors you could act on. Each change is sent to the same model that
              scored your assessment, and the new score comes back from it. Nothing is estimated
              in the browser, and nothing here touches your saved history.
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          disabled={!isDirty}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset to my answers
        </button>
      </div>

      <div className="grid gap-8 p-6 sm:px-8 lg:grid-cols-5">
        {/* Controls */}
        <div className="space-y-7 lg:col-span-2">
          <RangeField
            index="01"
            id="whatif-bmi"
            label="BMI"
            unit="kg/m²"
            min={10}
            max={60}
            step={0.1}
            value={draft.bmi}
            text={bmiText}
            baselineValue={baselineInputs.bmi}
            onText={setBmiText}
            onValue={(value) => update({ bmi: value })}
          />

          <RangeField
            index="02"
            id="whatif-glucose"
            label="Average glucose level"
            unit="mg/dL"
            min={40}
            max={400}
            step={0.1}
            value={draft.avgGlucoseLevel}
            text={glucoseText}
            baselineValue={baselineInputs.avgGlucoseLevel}
            onText={setGlucoseText}
            onValue={(value) => update({ avgGlucoseLevel: value })}
          />

          <ChoiceField
            index="03"
            name="whatif-smoking"
            label="Smoking status"
            options={SMOKING_OPTIONS}
            value={draft.smokingStatus}
            baselineValue={baselineInputs.smokingStatus}
            onChange={(value) => update({ smokingStatus: value })}
          />

          <ChoiceField
            index="04"
            name="whatif-hypertension"
            label="Diagnosed hypertension"
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ]}
            value={draft.hypertension}
            baselineValue={baselineInputs.hypertension}
            onChange={(value) => update({ hypertension: value })}
          />

          <ChoiceField
            index="05"
            name="whatif-heart-disease"
            label="Diagnosed heart disease"
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ]}
            value={draft.heartDisease}
            baselineValue={baselineInputs.heartDisease}
            onChange={(value) => update({ heartDisease: value })}
          />

          <p className="border-t border-gray-100 pt-4 font-mono text-[11px] leading-relaxed text-gray-500">
            Age, gender and your other answers stay exactly as you gave them.
          </p>
        </div>

        {/* Live model output, on the plot surface */}
        <div
          className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 sm:p-7 lg:col-span-3"
          style={PLOT_GRID}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
              Live model output
            </p>
            <p className="flex items-center gap-1.5 font-mono text-[11px]" aria-live="polite">
              {status === 'scoring' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400" aria-hidden="true" />
                  <span className="text-slate-300">re-scoring with the live model</span>
                </>
              )}
              {status === 'scored' && (
                <span className="text-slate-400">
                  run {String(runCount).padStart(2, '0')} · scored in {elapsedMs} ms
                </span>
              )}
              {status === 'baseline' && (
                <span className="text-slate-500">showing your saved assessment</span>
              )}
              {status === 'error' && <span className="text-rose-300">model call failed</span>}
            </p>
          </div>

          {changes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {changes.map((change) => (
                <span
                  key={change.key}
                  className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-mono text-[11px] text-slate-300"
                >
                  {change.text}
                </span>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                The model could not score this scenario. Your saved result is unchanged.{' '}
                <button
                  onClick={() => setRetryKey((key) => key + 1)}
                  className="rounded font-semibold underline underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  Try again
                </button>
              </p>
            </div>
          )}

          {/* Hold the previous numbers at reduced opacity while re-scoring: no layout jump. */}
          <div
            className={
              status === 'scoring'
                ? 'opacity-60 transition-opacity duration-200'
                : 'transition-opacity duration-200'
            }
          >
            {/* Before, after, and the change as the hero */}
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                  Saved result
                </p>
                <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-slate-400">
                  {baseline.riskScore.toFixed(1)}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <BaselineBandIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {baselineBand.word}
                </p>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                  What-if result
                </p>
                <p
                  className={`mt-1 text-5xl font-semibold leading-none tracking-tight ${sim ? shownBand.hero : 'text-slate-400'}`}
                >
                  {shown.riskScore.toFixed(1)}
                </p>
                <p
                  className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sim ? shownBand.chip : 'border-slate-700 text-slate-400'}`}
                >
                  <ShownBandIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {sim ? shownBand.word : 'unchanged'}
                </p>
              </div>

              {sim && (
                <div className="ml-auto text-right">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                    Change
                  </p>
                  <p
                    className="mt-1 flex items-center justify-end gap-2 text-3xl font-semibold leading-none tracking-tight"
                    style={{ color: deltaColor }}
                  >
                    <DeltaIcon className="h-6 w-6" aria-hidden="true" />
                    {formatSigned(delta)}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">{deltaWord}</p>
                </div>
              )}
            </div>

            {/* One meter, three marks: new score, baseline, threshold */}
            <div className="mt-8">
              <div className="relative h-4 font-mono text-[11px] text-slate-300" aria-hidden="true">
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${Math.max(12, Math.min(threshold, 88))}%` }}
                >
                  threshold {baseline.decisionThreshold}
                </span>
              </div>
              <div
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(shownClamped.toFixed(1))}
                aria-valuetext={`What-if score ${shown.riskScore.toFixed(1)} of 100. Saved score ${baseline.riskScore.toFixed(1)}. Model decision threshold ${baseline.decisionThreshold}.`}
                aria-label="What-if risk score"
                className="relative mt-1"
              >
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-r-full transition-all duration-500 ${sim ? shownBand.fill : 'bg-slate-600'}`}
                    style={{ width: `${shownClamped}%` }}
                  />
                </div>
                <span
                  className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded-full bg-slate-100"
                  style={{ left: `${threshold}%` }}
                  aria-hidden="true"
                />
                <span
                  className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded-full bg-slate-500"
                  style={{ left: `${baselinePos}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="relative mt-2 h-4 font-mono text-[11px] text-slate-500" aria-hidden="true">
                <span className="absolute left-0">0</span>
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${Math.max(12, Math.min(baselinePos, 88))}%` }}
                >
                  saved {baseline.riskScore.toFixed(1)}
                </span>
                <span className="absolute right-0">100</span>
              </div>
            </div>

            {/* Threshold crossings are the headline event, so call them out in words */}
            <p className="mt-5 flex items-center gap-2 text-sm">
              {sim && sim.strokePrediction !== baseline.strokePrediction ? (
                sim.strokePrediction ? (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                    <span className="text-rose-200">
                      This change puts the score above the model threshold. It would be flagged
                      for follow-up.
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: SHAP_DOWN }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-200">
                      This change brings the score below the model threshold. It would not be
                      flagged.
                    </span>
                  </>
                )
              ) : (
                <span className="text-xs text-slate-400">
                  {shown.strokePrediction
                    ? 'Above the model threshold, flagged for follow-up.'
                    : 'Below the model threshold, not flagged.'}
                </span>
              )}
            </p>

            {/* Which factors moved */}
            <div className="mt-7 border-t border-slate-800 pt-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                How the explanation shifted
              </p>
              {sim ? (
                <>
                  <ul className="mt-3 space-y-2.5">
                    {sim.topFeatures.map((feature) => {
                      const increases = feature.direction === 'increases';
                      const signedNow = increases ? feature.impact : -feature.impact;
                      const baseFeature = baseline.topFeatures.find(
                        (candidate) => candidate.feature === feature.feature,
                      );
                      const signedWas = baseFeature
                        ? baseFeature.direction === 'increases'
                          ? baseFeature.impact
                          : -baseFeature.impact
                        : null;
                      return (
                        <li
                          key={feature.feature}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm"
                        >
                          <span className="min-w-0 truncate text-slate-300">{feature.feature}</span>
                          <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums text-slate-400">
                            {signedWas === null ? 'not in baseline' : `was ${formatSigned(signedWas)}`}
                            <span className="text-slate-600">·</span>
                            {increases ? (
                              <ArrowUp
                                className="h-3 w-3"
                                style={{ color: SHAP_UP }}
                                aria-hidden="true"
                              />
                            ) : (
                              <ArrowDown
                                className="h-3 w-3"
                                style={{ color: SHAP_DOWN }}
                                aria-hidden="true"
                              />
                            )}
                            <span className="text-slate-200">now {formatSigned(signedNow)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 font-mono text-[10px] leading-relaxed text-slate-600">
                    Signed share of each explanation. Positive pushes the score up, negative
                    pulls it down.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Adjust a control on the left and the model will show you which factors move.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIfPanel;
