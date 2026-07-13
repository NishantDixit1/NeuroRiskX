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
  /**
   * Where this patient sits in the training population, 0-100, measured by the API
   * against the real distribution. Lets the UI say "higher than 94% of the dataset"
   * instead of comparing against a cutoff hardcoded in a component.
   */
  percentiles: {
    age: number;
    bmi: number;
    avgGlucoseLevel: number;
  };
  disclaimer: string;
}

/** The continuous features we can place a patient against. */
export type DistributionKey = 'age' | 'bmi' | 'avgGlucoseLevel';

/** A binned view of one feature's training distribution, served by /distributions. */
export interface Distribution {
  label: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  histogram: {
    counts: number[];
    /** counts.length + 1 edges. */
    edges: number[];
  };
}

export type Distributions = Record<DistributionKey, Distribution>;

/** One point on the recall/precision trade-off, measured on the held-out test set. */
export interface ThresholdPoint {
  threshold: number;
  recall: number;
  precision: number;
  /** Share of the test set the model would flag at this threshold. */
  flaggedRate: number;
}

export interface ThresholdCurve {
  points: ThresholdPoint[];
  /** The threshold the shipped model actually uses. */
  selectedThreshold: number;
  selectionRule: string;
  nTest: number;
}

/**
 * The sample the public demo scores. A real record from the held-out test set, chosen
 * at training time and served by /demo-patient, so the demo is not built on invented
 * numbers. `source` says exactly where it came from.
 */
export type DemoPatient = PatientData & { source: string };

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
