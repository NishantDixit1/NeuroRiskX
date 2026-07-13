import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { predictionService } from '../services/api';
import { DistributionKey, Distributions, PredictionResult } from '../types';

/** Same plot surface as the result hero, so population data reads as model territory. */
const PLOT_GRID: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

const FEATURE_ORDER: DistributionKey[] = ['age', 'bmi', 'avgGlucoseLevel'];

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(value, hi));

const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export const PopulationContext: React.FC<{ result: PredictionResult }> = ({ result }) => {
  const [distributions, setDistributions] = useState<Distributions | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    predictionService
      .getDistributions()
      .then((data) => {
        if (!cancelled) setDistributions(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Context is optional: without the real distributions there is nothing honest to draw.
  if (failed || !distributions) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-6 sm:px-8">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Users className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              Where this patient sits
            </h3>
            <p className="mt-0.5 max-w-xl text-sm text-gray-600">
              Each value below is placed against the training population the model learned from.
              High or low here means high or low in that data, not against a clinical cutoff.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:px-8">
        <div
          className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 sm:p-7"
          style={PLOT_GRID}
        >
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
            Training population
          </p>

          <div className="mt-5 space-y-8">
            {FEATURE_ORDER.map((key) => {
              const dist = distributions[key];
              const value = result.inputs[key];
              const percentile = Math.round(result.percentiles[key]);
              const { counts, edges } = dist.histogram;
              const lo = edges[0];
              const hi = edges[edges.length - 1];
              const span = hi - lo;
              const maxCount = Math.max(...counts, 1);
              const patientPos = span > 0 ? clamp(((value - lo) / span) * 100, 0, 100) : 50;
              const medianPos = span > 0 ? clamp(((dist.median - lo) / span) * 100, 0, 100) : 50;

              return (
                <div key={key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                      {dist.label}
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-slate-300">
                      higher than {percentile}% of the dataset
                    </p>
                  </div>

                  <div
                    className="relative mt-1.5 h-4 font-mono text-[11px] text-blue-300"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${clamp(patientPos, 12, 88)}%` }}
                    >
                      patient {fmt(value)}
                    </span>
                  </div>

                  <div
                    className="relative"
                    role="img"
                    aria-label={`${dist.label} in the training data. This patient at ${fmt(value)}, higher than ${percentile}% of the dataset. Population median ${fmt(dist.median)}.`}
                  >
                    <div className="flex h-16 items-end gap-px">
                      {counts.map((count, i) => (
                        <div
                          key={i}
                          className="min-w-0 flex-1 rounded-t-sm bg-slate-700/80"
                          style={{
                            height: `${(count / maxCount) * 100}%`,
                            minHeight: count > 0 ? 2 : 0,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="absolute bottom-0 top-0 w-px -translate-x-1/2 bg-slate-400/70"
                      style={{ left: `${medianPos}%` }}
                      aria-hidden="true"
                    />
                    <span
                      className="absolute -top-1.5 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-blue-400"
                      style={{ left: `${patientPos}%` }}
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    className="relative mt-2 h-4 font-mono text-[11px] text-slate-500"
                    aria-hidden="true"
                  >
                    <span className="absolute left-0 tabular-nums">{fmt(lo)}</span>
                    <span
                      className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums"
                      style={{ left: `${clamp(medianPos, 12, 88)}%` }}
                    >
                      median {fmt(dist.median)}
                    </span>
                    <span className="absolute right-0 tabular-nums">{fmt(hi)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-7 border-t border-slate-800 pt-4 font-mono text-[10px] leading-relaxed text-slate-600">
            A percentile compares this patient to the dataset population. It is not a clinical
            threshold and it does not diagnose anything.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PopulationContext;
