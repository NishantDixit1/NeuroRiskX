import React, { lazy, Suspense, useEffect, useState } from 'react';
import { FlaskConical, Info, Loader2 } from 'lucide-react';
import { PatientForm } from '../components/PatientForm';
import { PopulationContext } from '../components/PopulationContext';
import { ThresholdExplorer } from '../components/ThresholdExplorer';
import { WhatIfPanel } from '../components/WhatIfPanel';
import { predictionService } from '../services/api';
import { useStore } from '../store/useStore';
import { DemoPatient, ModelInfo, PatientData, PredictionResult, RiskBand } from '../types';

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

interface AssessmentPageProps {
  /**
   * Demo mode: score through /simulate instead of /predict, so a visitor gets the real
   * model without an account and without writing a row. The intake is prefilled with a
   * genuine held-out record fetched from /demo-patient.
   */
  demo?: boolean;
  /** Rendered above the results in demo mode, to offer saving the run. */
  demoCallout?: React.ReactNode;
}

export const AssessmentPage: React.FC<AssessmentPageProps> = ({
  demo = false,
  demoCallout = null,
}) => {
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

  const [demoPatient, setDemoPatient] = useState<DemoPatient | null>(null);

  // Every model fact shown on this page is fetched, never typed in.
  useEffect(() => {
    void fetchModelInfo();
  }, [fetchModelInfo]);

  // The demo's sample patient is a real record from the held-out test set, chosen at
  // training time and served by the API. Inventing one here would be a made-up value.
  useEffect(() => {
    if (!demo) return;
    predictionService
      .getDemoPatient()
      .then(setDemoPatient)
      .catch(() => setDemoPatient(null));
  }, [demo]);

  const submit = (data: PatientData) => submitPatientData(data, { persist: !demo });

  if (predictionResult) {
    return (
      <Suspense fallback={<Spinner label="Loading your results..." />}>
        <div className="space-y-5">
          {demoCallout}
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
          <PopulationContext result={predictionResult} />
          <ThresholdExplorer result={predictionResult} />
        </div>
      </Suspense>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {demo && demoPatient && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <p className="text-sm text-blue-900">
            Prefilled with a real patient from the {demoPatient.source}. Change anything
            you like, then score it. Nothing is saved.
          </p>
        </div>
      )}

      {/* The intake step's single disclaimer, served by the API. On the results
          step, ResultsDashboard renders the result's own copy instead. */}
      {modelInfo && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-900">{modelInfo.disclaimer}</p>
        </div>
      )}
      <PatientForm
        onSubmit={submit}
        isLoading={isLoading}
        error={error}
        onDismissError={() => setError(null)}
        initialValues={
          demo ? demoPatient : isCompleteIntake(patientData) ? patientData : null
        }
        submitLabel={demo ? 'Score this patient' : undefined}
      />
    </div>
  );
};
