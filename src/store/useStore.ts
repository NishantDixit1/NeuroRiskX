import axios from 'axios';
import { create } from 'zustand';
import { ModelInfo, PatientData, PredictionResult } from '../types';
import { predictionService } from '../services/api';

interface Store {
  currentStep: number;
  patientData: Partial<PatientData>;
  predictionResult: PredictionResult | null;
  /** Served by /model-info. The UI states no model fact that isn't in here. */
  modelInfo: ModelInfo | null;
  isLoading: boolean;
  error: string | null;
  setCurrentStep: (step: number) => void;
  updatePatientData: (data: Partial<PatientData>) => void;
  setError: (error: string | null) => void;
  fetchModelInfo: () => Promise<void>;
  /**
   * Score the patient. `persist` false routes to /simulate, which returns the identical
   * score but writes no row and needs no account. That is what the public demo runs on:
   * a visitor sees exactly what a signed-in user would, and signing up is what you do to
   * *save* a result, not what you do to see one.
   */
  submitPatientData: (data: PatientData, opts?: { persist?: boolean }) => Promise<void>;
  /**
   * Drops the result but keeps the inputs. Used when a demo visitor signs up: they
   * arrive at the real intake prefilled with what they already typed, and one click
   * saves it. Clearing everything would make them fill the form out twice.
   */
  clearResult: () => void;
  reset: () => void;
}

/** Turns an axios/network failure into something a human can act on. */
function readableError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Could not reach the prediction service. Make sure the API is running on port 8000.';
    }
    if (error.response?.status === 422) {
      return 'Some of the details entered were not valid. Please review the form and try again.';
    }
    if (error.response?.status === 503) {
      return 'The model is not loaded on the server. Run train_model.py and restart the API.';
    }
    return error.response?.data?.detail ?? 'The prediction service returned an error.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export const useStore = create<Store>((set) => ({
  currentStep: 0,
  patientData: {},
  predictionResult: null,
  modelInfo: null,
  isLoading: false,
  error: null,

  setCurrentStep: (step) => set({ currentStep: step }),
  updatePatientData: (data) =>
    set((state) => ({ patientData: { ...state.patientData, ...data } })),
  setError: (error) => set({ error }),

  fetchModelInfo: async () => {
    try {
      set({ modelInfo: await predictionService.getModelInfo() });
    } catch {
      // Non-fatal: the app still works, it just cannot describe the model.
      set({ modelInfo: null });
    }
  },

  submitPatientData: async (data: PatientData, opts) => {
    const persist = opts?.persist ?? true;
    set({ isLoading: true, error: null, patientData: data });
    try {
      const result = persist
        ? await predictionService.getPrediction(data)
        : await predictionService.simulate(data);
      set({ predictionResult: result, currentStep: 1, isLoading: false });
    } catch (error) {
      set({ error: readableError(error), isLoading: false });
    }
  },

  clearResult: () => set({ currentStep: 0, predictionResult: null, error: null }),

  reset: () =>
    set({ currentStep: 0, patientData: {}, predictionResult: null, error: null }),
}));
