import axios from 'axios';
import {
  Assessment,
  AuthResponse,
  FeatureContribution,
  ModelInfo,
  PatientData,
  PredictionResult,
  RiskBand,
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
  timeout: 20000,
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

export const predictionService = {
  async getPrediction(patientData: PatientData): Promise<PredictionResult> {
    const { data } = await api.post('/predict', toApiPayload(patientData));

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
      disclaimer: data.disclaimer,
    };
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
};
