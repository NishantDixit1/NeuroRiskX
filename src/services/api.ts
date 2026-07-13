import axios from 'axios';
import {
  Assessment,
  AuthResponse,
  DemoPatient,
  Distribution,
  Distributions,
  FeatureContribution,
  ModelInfo,
  PatientData,
  PredictionResult,
  RiskBand,
  ThresholdCurve,
  User,
} from '../types';

/**
 * The single place the app talks to the API. Previously the form bypassed this
 * with a raw fetch, so every submit hit the backend twice with different payloads.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

const TOKEN_KEY = 'neuroriskx_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // The API runs on a free tier that sleeps after inactivity, and a cold start takes
  // the better part of a minute. At 20s the first visitor of the day would time out
  // and be told the service was unreachable, when it was only waking up.
  timeout: 90000,
});

// Attach the bearer token to every request that has one.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Maps the app's camelCase form model to the API's snake_case contract. */
function toApiPayload(p: PatientData) {
  return {
    age: Number(p.age),
    gender: p.gender,
    bmi: Number(p.bmi),
    // Real booleans. The form normalises its radio strings before they get here.
    hypertension: p.hypertension === true,
    heart_disease: p.heartDisease === true,
    ever_married: p.everMarried,
    work_type: p.workType,
    residence_type: p.residenceType,
    avg_glucose_level: Number(p.avgGlucoseLevel),
    smoking_status: p.smokingStatus,
  };
}

function mapUser(u: Record<string, unknown>): User {
  return {
    id: u.id as number,
    email: u.email as string,
    createdAt: u.created_at as string,
  };
}

interface AuthPayload {
  access_token: string;
  user: Record<string, unknown>;
}

function mapAuth(data: AuthPayload): AuthResponse {
  return { accessToken: data.access_token, user: mapUser(data.user) };
}

interface AssessmentPayload {
  id: number;
  risk_score: number;
  risk_band: RiskBand;
  flagged: boolean;
  inputs: Record<string, unknown>;
  top_features: FeatureContribution[];
  created_at: string;
}

export const authService = {
  async signup(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/signup', { email, password });
    return mapAuth(data);
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { email, password });
    return mapAuth(data);
  },
  async me(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return mapUser(data);
  },
};

interface PredictionPayload {
  risk_score: number;
  risk_band: RiskBand;
  stroke_prediction: boolean;
  decision_threshold: number;
  model_roc_auc: number;
  top_features: FeatureContribution[];
  recommendations: string[];
  inputs: { age: number; gender: string; bmi: number; avg_glucose_level: number };
  percentiles: { age: number; bmi: number; avg_glucose_level: number };
  disclaimer: string;
}

interface DistributionPayload {
  label: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  histogram: { counts: number[]; edges: number[] };
}

interface ThresholdPointPayload {
  threshold: number;
  recall: number;
  precision: number;
  flagged_rate: number;
}

function mapPrediction(data: PredictionPayload): PredictionResult {
  return {
    riskScore: data.risk_score,
    riskBand: data.risk_band,
    strokePrediction: data.stroke_prediction,
    decisionThreshold: data.decision_threshold,
    modelRocAuc: data.model_roc_auc,
    topFeatures: data.top_features,
    recommendations: data.recommendations,
    inputs: {
      age: data.inputs.age,
      gender: data.inputs.gender,
      bmi: data.inputs.bmi,
      avgGlucoseLevel: data.inputs.avg_glucose_level,
    },
    percentiles: {
      age: data.percentiles.age,
      bmi: data.percentiles.bmi,
      avgGlucoseLevel: data.percentiles.avg_glucose_level,
    },
    disclaimer: data.disclaimer,
  };
}

export const predictionService = {
  async getPrediction(patientData: PatientData): Promise<PredictionResult> {
    const { data } = await api.post<PredictionPayload>('/predict', toApiPayload(patientData));
    return mapPrediction(data);
  },

  /**
   * A what-if run. Identical scoring to /predict, but the server does not persist it,
   * so exploring hypotheticals never pollutes the user's real assessment history.
   */
  async simulate(patientData: PatientData): Promise<PredictionResult> {
    const { data } = await api.post<PredictionPayload>('/simulate', toApiPayload(patientData));
    return mapPrediction(data);
  },

  /** Model facts come from the server, so the UI never quotes a stale ROC-AUC. */
  async getModelInfo(): Promise<ModelInfo> {
    const { data } = await api.get('/model-info');
    return {
      model: data.model,
      modelLabel: data.model_label,
      explainer: data.explainer,
      rocAuc: data.roc_auc,
      recall: data.recall,
      precision: data.precision,
      decisionThreshold: data.decision_threshold,
      trainedAt: data.trained_at,
      dataset: {
        name: data.dataset.name,
        nRecords: data.dataset.n_records,
        positiveRate: data.dataset.positive_rate,
      },
      disclaimer: data.disclaimer,
    };
  },

  /** A real, saved history. The old UI faked this with hardcoded numbers. */
  async getHistory(): Promise<Assessment[]> {
    const { data } = await api.get<AssessmentPayload[]>('/history');
    return data.map((a) => ({
      id: a.id,
      riskScore: a.risk_score,
      riskBand: a.risk_band,
      flagged: a.flagged,
      inputs: a.inputs,
      topFeatures: a.top_features,
      createdAt: a.created_at,
    }));
  },

  /**
   * The sample the public demo scores: a real record from the held-out test set,
   * chosen at training time. Public, like /simulate, so a visitor can see what the
   * model does before being asked to create an account.
   */
  async getDemoPatient(): Promise<DemoPatient> {
    const { data } = await api.get('/demo-patient');
    return {
      age: data.age,
      gender: data.gender,
      bmi: data.bmi,
      hypertension: data.hypertension,
      heartDisease: data.heart_disease,
      everMarried: data.ever_married,
      workType: data.work_type,
      residenceType: data.residence_type,
      avgGlucoseLevel: data.avg_glucose_level,
      smokingStatus: data.smoking_status,
      source: data.source,
    };
  },

  /** The real training distributions, so the UI can place a patient in the population. */
  async getDistributions(): Promise<Distributions> {
    const { data } = await api.get('/distributions');
    const map = (d: DistributionPayload): Distribution => ({
      label: d.label,
      min: d.min,
      max: d.max,
      mean: d.mean,
      median: d.median,
      histogram: { counts: d.histogram.counts, edges: d.histogram.edges },
    });
    return {
      age: map(data.age),
      bmi: map(data.bmi),
      avgGlucoseLevel: map(data.avg_glucose_level),
    };
  },

  /** Recall vs precision at every threshold, measured on the held-out test set. */
  async getThresholdCurve(): Promise<ThresholdCurve> {
    const { data } = await api.get('/threshold-curve');
    return {
      points: data.points.map((p: ThresholdPointPayload) => ({
        threshold: p.threshold,
        recall: p.recall,
        precision: p.precision,
        flaggedRate: p.flagged_rate,
      })),
      selectedThreshold: data.selected_threshold,
      selectionRule: data.selection_rule,
      nTest: data.n_test,
    };
  },
};
