import React, { lazy, Suspense, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { PatientForm } from '../components/PatientForm';
import { WhatIfPanel } from '../components/WhatIfPanel';
import { predictionService } from '../services/api';
import { useStore } from '../store/useStore';
import { ModelInfo, PatientData, PredictionResult, RiskBand } from '../types';

const ResultsDashboard = lazy(() =>
  import('../components/ResultsDashboard').then((m) => ({ default: m.ResultsDashboard }))
);

const BAND_LABEL: Record<RiskBand, string> = {
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk',
};

/** After a successful submit the store holds the complete intake, verified here. */
function isCompleteIntake(data: Partial<PatientData>): data is PatientData {
  return (
    data.age !== undefined &&
    data.gender !== undefined &&
    data.bmi !== undefined &&
    data.hypertension !== undefined &&
    data.heartDisease !== undefined &&
    data.everMarried !== undefined &&
    data.workType !== undefined &&
    data.residenceType !== undefined &&
    data.avgGlucoseLevel !== undefined &&
    data.smokingStatus !== undefined
  );
}

/**
 * Generated entirely client-side from the result and model info props.
 * jsPDF is imported on demand so it never weighs down the main bundle.
 */
async function downloadReport(result: PredictionResult, modelInfo: ModelInfo | null) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const line = (text: string, x: number, y: number) => doc.text(text, x, y);

  doc.setFontSize(20);
  doc.setTextColor(26, 54, 93);
  line('NeuroRiskX Stroke Risk Assessment', 20, 22);
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
  line(`Risk band: ${BAND_LABEL[result.riskBand]}`, 26, 90);
  line(`Model risk score: ${result.riskScore.toFixed(1)} / 100`, 26, 97);
  line(`Decision threshold: ${result.decisionThreshold}`, 26, 104);
  line(`Flagged for follow-up: ${result.strokePrediction ? 'Yes' : 'No'}`, 26, 111);
  line(
    modelInfo
      ? `Model: ${modelInfo.modelLabel} (ROC-AUC ${modelInfo.rocAuc})`
      : `Model ROC-AUC: ${result.modelRocAuc}`,
    26,
    118
  );

  doc.setFontSize(13);
  doc.setTextColor(44, 82, 130);
  line('What drove this score (SHAP)', 20, 133);
  doc.setFontSize(11);
  doc.setTextColor(45, 55, 72);
  result.topFeatures.forEach((f, i) => {
    line(`${i + 1}. ${f.feature}: ${f.impact.toFixed(1)}% (${f.direction} risk)`, 26, 141 + i * 7);
  });

  let y = 141 + result.topFeatures.length * 7 + 12;
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
}

const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white">
    <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
    <p className="text-sm text-gray-600">{label}</p>
  </div>
);

export const AssessmentPage: React.FC = () => {
  const {
    isLoading,
    error,
    setError,
    modelInfo,
    fetchModelInfo,
    predictionResult,
    patientData,
    submitPatientData,
    reset,
  } = useStore();

  // Every model fact shown on this page is fetched, never typed in.
  useEffect(() => {
    void fetchModelInfo();
  }, [fetchModelInfo]);

  if (predictionResult) {
    return (
      <Suspense fallback={<Spinner label="Loading your results..." />}>
        <div className="space-y-5">
          <ResultsDashboard
            result={predictionResult}
            modelInfo={modelInfo}
            onStartOver={reset}
            onDownloadReport={() => void downloadReport(predictionResult, modelInfo)}
          />
          {isCompleteIntake(patientData) && (
            <WhatIfPanel
              baseline={predictionResult}
              baselineInputs={patientData}
              onSimulate={predictionService.simulate}
            />
          )}
        </div>
      </Suspense>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* The intake step's single disclaimer, served by the API. On the results
          step, ResultsDashboard renders the result's own copy instead. */}
      {modelInfo && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-900">{modelInfo.disclaimer}</p>
        </div>
      )}
      <PatientForm
        onSubmit={submitPatientData}
        isLoading={isLoading}
        error={error}
        onDismissError={() => setError(null)}
      />
    </div>
  );
};
