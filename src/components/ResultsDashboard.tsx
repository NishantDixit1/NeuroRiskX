import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download,
  Info,
  ListChecks,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useStore } from '../store/useStore';
import { RiskBand } from '../types';

const BAND_STYLES: Record<RiskBand, { label: string; box: string; text: string; icon: string }> = {
  low: {
    label: 'Lower risk',
    box: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600',
  },
  moderate: {
    label: 'Moderate risk',
    box: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-600',
  },
  high: {
    label: 'Elevated risk',
    box: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'explanation', label: 'Why this score', icon: BarChart3 },
  { id: 'recommendations', label: 'Recommendations', icon: ListChecks },
] as const;

export const ResultsDashboard: React.FC = () => {
  const result = useStore((s) => s.predictionResult);
  const modelInfo = useStore((s) => s.modelInfo);
  const reset = useStore((s) => s.reset);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!result) return null;

  const band = BAND_STYLES[result.riskBand];

  /**
   * Generated entirely client-side. The old version POSTed to /predict and tried to
   * read the JSON response as a PDF blob, which produced a corrupt file.
   */
  const downloadReport = () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF();
      const line = (text: string, x: number, y: number) => doc.text(text, x, y);

      doc.setFontSize(20);
      doc.setTextColor(26, 54, 93);
      line('NeuroRiskX - Stroke Risk Assessment', 20, 22);
      doc.setLineWidth(0.4);
      doc.line(20, 26, 190, 26);

      doc.setFontSize(13);
      doc.setTextColor(44, 82, 130);
      line('Your inputs', 20, 38);
      doc.setFontSize(11);
      doc.setTextColor(45, 55, 72);
      line(`Age: ${result.inputs.age}`, 26, 46);
      line(`Gender: ${result.inputs.gender}`, 26, 53);
      line(`BMI: ${result.inputs.bmi.toFixed(1)}`, 26, 60);
      line(`Average glucose: ${result.inputs.avgGlucoseLevel.toFixed(1)} mg/dL`, 26, 67);

      doc.setFontSize(13);
      doc.setTextColor(44, 82, 130);
      line('Result', 20, 82);
      doc.setFontSize(11);
      doc.setTextColor(45, 55, 72);
      line(`Risk band: ${band.label}`, 26, 90);
      line(`Model risk score: ${result.riskScore.toFixed(1)} / 100`, 26, 97);
      line(`Flagged for follow-up: ${result.strokePrediction ? 'Yes' : 'No'}`, 26, 104);
      line(`Model ROC-AUC: ${result.modelRocAuc}`, 26, 111);

      doc.setFontSize(13);
      doc.setTextColor(44, 82, 130);
      line('What drove this score (SHAP)', 20, 126);
      doc.setFontSize(11);
      doc.setTextColor(45, 55, 72);
      result.topFeatures.forEach((f, i) => {
        line(`${i + 1}. ${f.feature}: ${f.impact.toFixed(1)}% (${f.direction} risk)`, 26, 134 + i * 7);
      });

      let y = 134 + result.topFeatures.length * 7 + 12;
      doc.setFontSize(13);
      doc.setTextColor(44, 82, 130);
      line('Recommendations', 20, y);
      doc.setFontSize(11);
      doc.setTextColor(45, 55, 72);
      y += 8;
      result.recommendations.forEach((rec) => {
        const wrapped = doc.splitTextToSize(`- ${rec}`, 165);
        if (y > 255) {
          doc.addPage();
          y = 20;
        }
        doc.text(wrapped, 26, y);
        y += wrapped.length * 6;
      });

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const note = doc.splitTextToSize(result.disclaimer, 170);
      doc.text(note, 20, 282);

      doc.save('neuroriskx-report.pdf');
    } finally {
      setIsDownloading(false);
    }
  };

  const chartData = result.topFeatures.map((f) => ({
    feature: f.feature,
    impact: f.impact,
    direction: f.direction,
  }));

  return (
    <div className="space-y-8">
      {/* Result banner */}
      <div className={`rounded-lg border p-5 ${band.box}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-7 w-7 ${band.icon}`} />
            <div>
              <h3 className={`text-xl font-semibold ${band.text}`}>{band.label}</h3>
              <p className="text-sm text-gray-600">
                Model risk score {result.riskScore.toFixed(1)} / 100
                {result.strokePrediction ? ' · flagged for follow-up' : ' · not flagged'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadReport}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Preparing...' : 'Download report'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4" />
              Start over
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  active
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className={`mr-2 h-5 w-5 ${active ? 'text-blue-500' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Risk score</h3>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-4xl font-bold text-blue-600">{result.riskScore.toFixed(1)}</span>
              <span className="text-sm text-gray-500">out of 100</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-3 rounded-full ${
                  result.riskBand === 'high'
                    ? 'bg-red-500'
                    : result.riskBand === 'moderate'
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(result.riskScore, 100)}%` }}
              />
              {/* Where the model decides to flag someone */}
              <div
                className="absolute top-0 h-3 w-0.5 bg-gray-700"
                style={{ left: `${result.decisionThreshold}%` }}
                title={`Decision threshold: ${result.decisionThreshold}`}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              The marker shows the model's decision threshold ({result.decisionThreshold}). Scores above
              it are flagged for follow-up.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">About this model</h3>
            {/* Nothing here is typed in. It all comes from /model-info, so retraining
                the model updates this panel automatically instead of leaving it lying. */}
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">Model</dt>
                <dd className="text-right font-medium">{modelInfo?.modelLabel ?? '-'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">ROC-AUC (held-out test set)</dt>
                <dd className="text-right font-medium">{result.modelRocAuc}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">Recall / precision</dt>
                <dd className="text-right font-medium">
                  {modelInfo ? `${modelInfo.recall} / ${modelInfo.precision}` : '-'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">Explanations</dt>
                <dd className="text-right font-medium">{modelInfo?.explainer ?? '-'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">Training data</dt>
                <dd className="text-right font-medium">
                  {modelInfo
                    ? `${modelInfo.dataset.nRecords.toLocaleString()} records, ${(
                        modelInfo.dataset.positiveRate * 100
                      ).toFixed(1)}% positive`
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* SHAP explanation */}
      {activeTab === 'explanation' && (
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h3 className="text-lg font-semibold">What drove your score</h3>
          <p className="mb-6 mt-1 text-sm text-gray-600">
            These are SHAP values computed for <em>your</em> inputs, not generic feature importances.
            Red pushed your risk up, green pushed it down.
          </p>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" unit="%" />
              <YAxis type="category" dataKey="feature" width={150} />
              <Tooltip formatter={(v: number) => [`${v}% of the explanation`, 'Contribution']} />
              <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.direction === 'increases' ? '#ef4444' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <ul className="mt-6 space-y-2">
            {result.topFeatures.map((f) => (
              <li key={f.feature} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                {f.direction === 'increases' ? (
                  <ArrowUp className="h-4 w-4 flex-shrink-0 text-red-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 flex-shrink-0 text-green-500" />
                )}
                <span className="font-medium text-gray-800">{f.feature}</span>
                <span className="text-gray-600">
                  {f.direction} your risk ({f.impact.toFixed(1)}% of the explanation)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h3 className="mb-6 text-lg font-semibold">Recommendations</h3>
          <div className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer, straight from the API so it can never drift */}
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
        <p className="text-xs leading-relaxed text-gray-600">{result.disclaimer}</p>
      </div>
    </div>
  );
};
