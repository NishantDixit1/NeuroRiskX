export interface PatientData {
  age: number;
  gender: 'male' | 'female';
  bmi: number;
  hypertension: boolean;
  heartDisease: boolean;
  everMarried: 'yes' | 'no';
  workType: 'private' | 'self-employed' | 'govt_job' | 'children' | 'never_worked';
  residenceType: 'urban' | 'rural';
  avgGlucoseLevel: number;
  smokingStatus: 'formerly_smoked' | 'never_smoked' | 'smokes' | 'unknown';
}

export type RiskBand = 'low' | 'moderate' | 'high';

/** A single SHAP contribution for this specific patient. */
export interface FeatureContribution {
  feature: string;
  /** Share of this patient's explanation, 0-100. */
  impact: number;
  /** Whether this feature pushed this patient's risk up or down. */
  direction: 'increases' | 'decreases';
}

export interface PredictionResult {
  riskScore: number;
  riskBand: RiskBand;
  strokePrediction: boolean;
  decisionThreshold: number;
  modelRocAuc: number;
  topFeatures: FeatureContribution[];
  recommendations: string[];
  inputs: {
    age: number;
    gender: string;
    bmi: number;
    avgGlucoseLevel: number;
  };
  disclaimer: string;
}

/**
 * Everything the UI says about the model comes from here, served by /model-info.
 * Nothing about the model is typed into the UI, so retraining can never leave the
 * page quoting a stale ROC-AUC or the wrong algorithm.
 */
export interface ModelInfo {
  model: string;
  modelLabel: string;
  explainer: string;
  rocAuc: number;
  recall: number;
  precision: number;
  decisionThreshold: number;
  trainedAt: string;
  dataset: {
    name: string;
    nRecords: number;
    positiveRate: number;
  };
  disclaimer: string;
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
}

export interface User {
  id: number;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** A saved assessment. Real history, not the hardcoded timeline the old UI faked. */
export interface Assessment {
  id: number;
  riskScore: number;
  riskBand: RiskBand;
  flagged: boolean;
  inputs: Record<string, unknown>;
  topFeatures: FeatureContribution[];
  createdAt: string;
}
