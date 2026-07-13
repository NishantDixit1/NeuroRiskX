import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  History as HistoryIcon,
  Loader2,
  Minus,
} from 'lucide-react';
import { Assessment, FeatureContribution, RiskBand } from '../types';

interface HistoryPageProps {
  assessments: Assessment[];
  isLoading: boolean;
  onStartAssessment: () => void;
}

/** Band identity on light surfaces: always icon + word + colour, never colour alone. */
const BAND: Record<
  RiskBand,
  { word: string; Icon: typeof AlertTriangle; chip: string; text: string }
> = {
  low: {
    word: 'Low risk',
    Icon: CheckCircle2,
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    text: 'text-emerald-700',
  },
  moderate: {
    word: 'Moderate risk',
    Icon: AlertCircle,
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    text: 'text-amber-700',
  },
  high: {
    word: 'High risk',
    Icon: AlertTriangle,
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    text: 'text-rose-700',
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

interface ChartPoint {
  id: number;
  dateLabel: string;
  score: number;
  band: RiskBand;
  driver: FeatureContribution | null;
}

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const band = BAND[point.band];
  const BandIcon = band.Icon;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
      <p className="font-mono text-[11px] text-gray-500">{point.dateLabel}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-gray-900">
        {point.score.toFixed(1)}
        <span className="text-gray-400"> / 100</span>
      </p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${band.text}`}>
        <BandIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {band.word}
      </p>
      {point.driver && (
        <p className="mt-1 max-w-[220px] text-xs text-gray-600">
          Top driver: {point.driver.feature}
        </p>
      )}
    </div>
  );
};

export const HistoryPage: React.FC<HistoryPageProps> = ({
  assessments,
  isLoading,
  onStartAssessment,
}) => {
  // Oldest first for the trend, newest first for the list.
  const ordered = [...assessments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const newestFirst = [...ordered].reverse();

  const chartData: ChartPoint[] = ordered.map((assessment) => ({
    id: assessment.id,
    dateLabel: formatDate(assessment.createdAt),
    score: Number(assessment.riskScore.toFixed(1)),
    band: assessment.riskBand,
    driver: assessment.topFeatures[0] ?? null,
  }));

  const latest = ordered[ordered.length - 1];
  const previous = ordered.length >= 2 ? ordered[ordered.length - 2] : null;
  const delta = latest && previous ? latest.riskScore - previous.riskScore : null;
  const DeltaIcon =
    delta === null ? Minus : delta > 0.05 ? ArrowUp : delta < -0.05 ? ArrowDown : Minus;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
          Assessment history
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Every entry is an assessment you ran. Nothing here is simulated.
        </p>
      </div>
      <button
        onClick={onStartAssessment}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        New assessment
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        {header}
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
          <p className="text-sm text-gray-600">Loading your assessments</p>
        </div>
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
          <HistoryIcon className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
          <h3 className="mt-4 text-base font-semibold tracking-tight text-gray-900">
            No assessments yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-600">
            Run your first assessment and it will be saved here, so you can watch your score
            move over time.
          </p>
          <button
            onClick={onStartAssessment}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Start an assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const latestBand = BAND[latest.riskBand];
  const LatestBandIcon = latestBand.Icon;

  return (
    <div className="space-y-5">
      {header}

      {/* Stat tiles: every number below is computed from the saved assessments */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Latest score
          </p>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-gray-900">
            {latest.riskScore.toFixed(1)}
          </p>
          <span
            className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${latestBand.chip}`}
          >
            <LatestBandIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {latestBand.word}
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Change since previous
          </p>
          {delta !== null && previous ? (
            <>
              <p
                className={`mt-1.5 flex items-center gap-1.5 text-3xl font-semibold leading-none tracking-tight ${
                  delta > 0.05 ? 'text-rose-700' : delta < -0.05 ? 'text-blue-700' : 'text-gray-900'
                }`}
              >
                <DeltaIcon className="h-6 w-6" aria-hidden="true" />
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)}
              </p>
              <p className="mt-2.5 text-xs text-gray-500">
                vs {formatDate(previous.createdAt)}
                {delta > 0.05 ? ', higher risk' : delta < -0.05 ? ', lower risk' : ', unchanged'}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-gray-300">
                &middot;
              </p>
              <p className="mt-2.5 text-xs text-gray-500">Run another assessment to compare</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Assessments
          </p>
          <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-gray-900">
            {ordered.length}
          </p>
          <p className="mt-2.5 text-xs text-gray-500">Saved to your account</p>
        </div>
      </div>

      {/* Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            Risk score over time
          </h3>
          <span className="font-mono text-[11px] text-gray-400">
            0 to 100, higher means more risk
          </span>
        </div>

        {chartData.length >= 2 ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickMargin={8}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            One assessment so far. Run another and the trend line starts here.
          </p>
        )}
      </div>

      {/* The list is the chart's table view: same data, fully readable without colour */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            All assessments
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-gray-400">
            {ordered.length} saved
          </span>
        </div>
        <ul className="divide-y divide-gray-100">
          {newestFirst.map((assessment) => {
            const band = BAND[assessment.riskBand];
            const BandIcon = band.Icon;
            const driver = assessment.topFeatures[0] ?? null;
            return (
              <li
                key={assessment.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-3.5 sm:px-6"
              >
                <span className="w-28 font-mono text-xs text-gray-500">
                  {formatDate(assessment.createdAt)}
                </span>
                <span className="w-14 text-right font-mono text-sm font-semibold tabular-nums text-gray-900">
                  {assessment.riskScore.toFixed(1)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${band.chip}`}
                >
                  <BandIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {band.word}
                </span>
                {assessment.flagged && (
                  <span className="font-mono text-[11px] uppercase tracking-wide text-rose-700">
                    flagged
                  </span>
                )}
                {driver && (
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-gray-600">
                    {driver.direction === 'increases' ? (
                      <ArrowUp className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
                    ) : (
                      <ArrowDown
                        className="h-3.5 w-3.5 shrink-0 text-blue-600"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">
                      {driver.feature}
                      <span className="text-gray-400"> · top driver</span>
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default HistoryPage;
