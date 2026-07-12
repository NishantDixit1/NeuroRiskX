import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowRight, History as HistoryIcon } from 'lucide-react';
import { predictionService } from '../services/api';
import { Assessment, RiskBand } from '../types';

const BAND_TEXT: Record<RiskBand, string> = {
  low: 'text-green-700 bg-green-50 border-green-200',
  moderate: 'text-amber-700 bg-amber-50 border-amber-200',
  high: 'text-red-700 bg-red-50 border-red-200',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * A REAL history of the user's own saved assessments.
 *
 * The original app had a "Timeline" tab that showed hardcoded scores
 * (2024-01: 65, 2024-02: 58) to every single user, as if it were their history.
 * This is the honest version: it only ever shows assessments you actually ran.
 */
export const HistoryPage: React.FC = () => {
  const [rows, setRows] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    predictionService
      .getHistory()
      .then(setRows)
      .catch(() => setError('Could not load your history. Please try again.'));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-xl">
        <HistoryIcon className="mx-auto h-10 w-10 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">No assessments yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          Once you run an assessment it will be saved here, so you can see how your risk score
          changes over time.
        </p>
        <Link
          to="/assess"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Run your first assessment
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Oldest first for the chart, newest first for the list.
  const chartData = [...rows]
    .reverse()
    .map((r) => ({ date: formatDate(r.createdAt), score: r.riskScore }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Your risk score over time</h2>
        <p className="mb-6 mt-1 text-sm text-gray-500">
          Every point is an assessment you actually ran. Nothing here is simulated.
        </p>

        {chartData.length === 1 ? (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            You have one assessment so far. Run another to start seeing a trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v: number) => [`${v} / 100`, 'Risk score']} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          All assessments ({rows.length})
        </h2>
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-4 py-4">
              <span className="w-32 text-sm text-gray-500">{formatDate(r.createdAt)}</span>
              <span className="w-20 text-lg font-semibold text-gray-900">
                {r.riskScore.toFixed(1)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${BAND_TEXT[r.riskBand]}`}
              >
                {r.riskBand}
              </span>
              <span className="text-sm text-gray-500">
                Top driver: {r.topFeatures[0]?.feature} ({r.topFeatures[0]?.direction} risk)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
