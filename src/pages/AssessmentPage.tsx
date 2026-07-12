import React, { lazy, Suspense, useEffect } from 'react';
import { StepIndicator } from '../components/StepIndicator';
import { PatientForm } from '../components/PatientForm';
import { useStore } from '../store/useStore';
import { FormStep } from '../types';

const ResultsDashboard = lazy(() =>
  import('../components/ResultsDashboard').then((m) => ({ default: m.ResultsDashboard }))
);

const steps: FormStep[] = [
  { id: 'personal', title: 'Your details', description: 'Basic information and medical history' },
  { id: 'results', title: 'Risk assessment', description: 'Score, explanation and recommendations' },
];

const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-64 flex-col items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
    <p className="mt-4 text-gray-600">{label}</p>
  </div>
);

export const AssessmentPage: React.FC = () => {
  const { currentStep, setCurrentStep, isLoading, modelInfo, fetchModelInfo } = useStore();

  // Every model fact shown on this page is fetched, never typed in.
  useEffect(() => {
    void fetchModelInfo();
  }, [fetchModelInfo]);

  return (
    <>
      {/* Disclaimer text is served by the API, so there is exactly one copy of it. */}
      {modelInfo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">{modelInfo.disclaimer}</p>
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-xl">
        <StepIndicator steps={steps} />

        <div className="mt-8">
          {isLoading ? (
            <Spinner label="Analysing your inputs..." />
          ) : currentStep === 0 ? (
            <PatientForm onNext={() => setCurrentStep(1)} />
          ) : (
            <Suspense fallback={<Spinner label="Loading your results..." />}>
              <ResultsDashboard />
            </Suspense>
          )}
        </div>
      </div>
    </>
  );
};
