import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { predictionService } from '../services/api';
import { PredictionResult, ThresholdCurve, ThresholdPoint } from '../types';

/** Same plot surface as the result hero, so the measured curve reads as model territory. */
const PLOT_GRID: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

/** Validated pair for the slate-950 surface: distinct under CVD, both above 3:1 contrast. */
const RECALL_COLOR = '#3b82f6';
const PRECISION_COLOR = '#d97706';

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const nearestIndex = (points: ThresholdPoint[], threshold: number) =>
  points.reduce(
    (best, point, i) =>
      Math.abs(point.threshold - threshold) < Math.abs(points[best].threshold - threshold)
        ? i
        : best,
    0,
  );

const CurveTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ThresholdPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 shadow-sm">
      <p className="font-mono text-[11px] text-slate-400">
        threshold {point.threshold.toFixed(2)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-200">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: RECALL_COLOR }}
          aria-hidden="true"
        />
        recall {pct(point.recall)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-200">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: PRECISION_COLOR }}
          aria-hidden="true"
        />
        precision {pct(point.precision)}
      </p>
      <p className="mt-1 font-mono text-xs tabular-nums text-slate-400">
        flags {pct(point.flaggedRate)} of the test set
      </p>
    </div>
  );
};

export const ThresholdExplorer: React.FC<{ result: PredictionResult }> = ({ result }) => {
  const [curve, setCurve] = useState<ThresholdCurve | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    predictionService
      .getThresholdCurve()
      .then((data) => {
        if (cancelled) return;
        if (data.points.length === 0) {
          setFailed(true);
          return;
        }
        setCurve(data);
        setIndex(nearestIndex(data.points, data.selectedThreshold));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modelIndex = useMemo(
    () => (curve ? nearestIndex(curve.points, curve.selectedThreshold) : 0),
    [curve],
  );

  // The trade-off is measured, never sketched: without the real curve, draw nothing.
  if (failed || !curve) return null;

  const point = curve.points[index];
  const patientScore = result.riskScore / 100;
  const patientFlagged = patientScore >= point.threshold;
  const atModelThreshold = index === modelIndex;
  const minThreshold = curve.points[0].threshold;
  const maxThreshold = curve.points[curve.points.length - 1].threshold;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-6 sm:px-8">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              What the threshold trades away
            </h3>
            <p className="mt-0.5 max-w-xl text-sm text-gray-600">
              A lower threshold catches more of the real strokes and raises more false alarms.
              A higher one flags fewer people and lets more strokes slip through. Move it and
              watch both numbers, measured on data the model never trained on.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIndex(modelIndex)}
          disabled={atModelThreshold}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset to the model's threshold
        </button>
      </div>

      <div className="p-6 sm:px-8">
        <div
          className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 sm:p-7"
          style={PLOT_GRID}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
              Measured trade-off
            </p>
            <p className="font-mono text-[11px] tabular-nums text-slate-300">
              {atModelThreshold
                ? `showing the shipped threshold ${point.threshold.toFixed(2)}`
                : `exploring threshold ${point.threshold.toFixed(2)}`}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: RECALL_COLOR }}
                aria-hidden="true"
              />
              Recall, share of actual strokes caught
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRECISION_COLOR }}
                aria-hidden="true"
              />
              Precision, share of flags that are actual strokes
            </span>
          </div>

          <div className="mt-4 h-52 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={curve.points}
                margin={{ top: 16, right: 12, bottom: 0, left: -16 }}
              >
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                <XAxis
                  dataKey="threshold"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value: number) => value.toFixed(1)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                  tickMargin={8}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CurveTooltip />}
                  cursor={{ stroke: '#334155', strokeWidth: 1 }}
                />
                <ReferenceLine
                  x={curve.selectedThreshold}
                  stroke="#94a3b8"
                  strokeDasharray="5 4"
                  label={{
                    value: 'shipped model',
                    position: 'insideTopRight',
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  x={patientScore}
                  ifOverflow="discard"
                  stroke="#fb7185"
                  strokeDasharray="2 4"
                  label={{
                    value: 'this patient',
                    position: 'insideBottomLeft',
                    fill: '#fb7185',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine x={point.threshold} stroke="#f1f5f9" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="recall"
                  stroke={RECALL_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: RECALL_COLOR, stroke: '#020617', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke={PRECISION_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: PRECISION_COLOR, stroke: '#020617', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="threshold-slider"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Decision threshold
              </label>
              <span className="font-mono text-[11px] tabular-nums text-slate-300">
                {point.threshold.toFixed(2)}
              </span>
            </div>
            <input
              id="threshold-slider"
              type="range"
              min={0}
              max={curve.points.length - 1}
              step={1}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
              aria-valuetext={`Threshold ${point.threshold.toFixed(2)}. Recall ${pct(point.recall)}, precision ${pct(point.precision)}, flags ${pct(point.flaggedRate)} of the test set.`}
              className="mt-2 w-full cursor-pointer accent-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
              <span>{minThreshold.toFixed(2)}</span>
              <span>{maxThreshold.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: RECALL_COLOR }}
                  aria-hidden="true"
                />
                Recall
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-slate-100 sm:text-3xl">
                {pct(point.recall)}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">of actual strokes caught</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PRECISION_COLOR }}
                  aria-hidden="true"
                />
                Precision
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-slate-100 sm:text-3xl">
                {pct(point.precision)}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">of flags are actual strokes</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                Flagged
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-slate-100 sm:text-3xl">
                {pct(point.flaggedRate)}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">of the test set flagged</p>
            </div>
          </div>

          <div
            aria-live="polite"
            className={`mt-6 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm transition-colors ${
              patientFlagged
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                : 'border-slate-700 bg-slate-900/70 text-slate-200'
            }`}
          >
            {patientFlagged ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            )}
            <p>
              This patient, score {result.riskScore.toFixed(1)} of 100, would{' '}
              {patientFlagged ? 'be flagged' : 'not be flagged'} at threshold{' '}
              <span className="font-mono tabular-nums">{point.threshold.toFixed(2)}</span>.
            </p>
          </div>

          <div className="mt-6 space-y-1.5 border-t border-slate-800 pt-4">
            <p className="font-mono text-[11px] leading-relaxed text-slate-500">
              Why the shipped threshold: {curve.selectionRule}
            </p>
            <p className="font-mono text-[11px] tabular-nums leading-relaxed text-slate-600">
              Every point on this curve was measured on {curve.nTest.toLocaleString()} held-out
              test records.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ThresholdExplorer;
