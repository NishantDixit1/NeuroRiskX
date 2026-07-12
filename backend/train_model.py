"""
NeuroRiskX - model training pipeline.

Reproducible training for the stroke-risk model served by the API.
Run:  python train_model.py

Why this exists: the original repo shipped several stale pickles (a decision tree
that only ever output 0% or 100%, a degenerate random forest, and a scaler fit on
different data than the models). This script trains ONE clean, evaluated pipeline
and saves it with its feature order, decision threshold, and metrics, so the API
can never drift from what was trained.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR.parent / "jupyter notebook" / "healthcare-dataset-stroke-data.csv"
ARTIFACT_PATH = BASE_DIR / "model" / "neuroriskx_model.joblib"

RANDOM_STATE = 42
TEST_SIZE = 0.2

# Scores above this percentile of the training distribution (but below the decision
# threshold) are shown as "moderate" rather than "low". Named so it is a choice, not
# a magic number buried in the code.
MODERATE_BAND_PERCENTILE = 60

# Human-readable names, persisted with the model so the UI never hardcodes them.
MODEL_LABELS = {
    "logistic_regression": "Logistic regression (class-balanced)",
    "random_forest": "Random forest (class-balanced)",
}

# The exact feature order the API must send. Persisted with the model so the two
# can never silently disagree.
FEATURE_NAMES = [
    "gender",
    "age",
    "hypertension",
    "heart_disease",
    "ever_married",
    "work_type",
    "Residence_type",
    "avg_glucose_level",
    "bmi",
    "smoking_status",
]

# Categorical encodings. The API imports these so training and serving share one source of truth.
GENDER_MAP = {"female": 0, "male": 1}
EVER_MARRIED_MAP = {"no": 0, "yes": 1}
WORK_TYPE_MAP = {
    "private": 0,
    "self-employed": 1,
    "govt_job": 2,
    "children": 3,
    "never_worked": 4,
}
RESIDENCE_MAP = {"rural": 0, "urban": 1}
SMOKING_MAP = {
    "formerly_smoked": 0,
    "never_smoked": 1,
    "smokes": 2,
    "unknown": 3,
}


def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    df = df.drop(columns=["id"])

    # A single "Other" gender row cannot be learned from; drop it.
    df = df[df["gender"] != "Other"].copy()

    # 201 missing BMI values. Median impute (documented, not silently dropped).
    df["bmi"] = df["bmi"].fillna(df["bmi"].median())

    # Normalise raw dataset labels to the API's vocabulary, then encode.
    df["gender"] = df["gender"].str.lower().map(GENDER_MAP)
    df["ever_married"] = df["ever_married"].str.lower().map(EVER_MARRIED_MAP)
    df["work_type"] = (
        df["work_type"].str.lower().str.replace(" ", "_").map(WORK_TYPE_MAP)
    )
    df["Residence_type"] = df["Residence_type"].str.lower().map(RESIDENCE_MAP)
    df["smoking_status"] = (
        df["smoking_status"].str.lower().str.replace(" ", "_").map(SMOKING_MAP)
    )

    if df[FEATURE_NAMES].isna().any().any():
        bad = df[FEATURE_NAMES].isna().sum()
        raise ValueError(f"Unmapped categories after encoding:\n{bad[bad > 0]}")

    return df


def evaluate(name, model, X_te, y_te) -> dict:
    proba = model.predict_proba(X_te)[:, 1]
    auc = roc_auc_score(y_te, proba)
    ap = average_precision_score(y_te, proba)

    # Youden's J: the threshold maximising (sensitivity + specificity - 1).
    # For an imbalanced screening problem, 0.5 is the wrong default: it would
    # never flag anyone. This picks the operating point from the data.
    fpr, tpr, thresholds = roc_curve(y_te, proba)
    j = tpr - fpr
    threshold = float(thresholds[int(np.argmax(j))])

    preds = (proba >= threshold).astype(int)
    return {
        "name": name,
        "roc_auc": float(auc),
        "avg_precision": float(ap),
        "threshold": threshold,
        "recall": float(recall_score(y_te, preds, zero_division=0)),
        "precision": float(precision_score(y_te, preds, zero_division=0)),
        "proba_spread": int(len(np.unique(np.round(proba, 3)))),
    }


def main() -> None:
    df = load_and_clean()
    X = df[FEATURE_NAMES].to_numpy(dtype=float)
    y = df["stroke"].to_numpy(dtype=int)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )

    scaler = StandardScaler().fit(X_tr)
    X_tr_s, X_te_s = scaler.transform(X_tr), scaler.transform(X_te)

    candidates = {
        "logistic_regression": LogisticRegression(
            class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=400,
            max_depth=6,
            min_samples_leaf=20,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
    }

    results = []
    for name, model in candidates.items():
        model.fit(X_tr_s, y_tr)
        results.append(evaluate(name, model, X_te_s, y_te))

    print(f"{'model':22} {'ROC-AUC':>8} {'AP':>7} {'recall':>8} {'prec':>7} {'thresh':>7} {'spread':>7}")
    for r in results:
        print(
            f"{r['name']:22} {r['roc_auc']:8.4f} {r['avg_precision']:7.4f} "
            f"{r['recall']:8.3f} {r['precision']:7.3f} {r['threshold']:7.3f} {r['proba_spread']:7d}"
        )

    # ROC-AUC is the right primary metric on a 5%-positive screening problem.
    best = max(results, key=lambda r: r["roc_auc"])
    model = candidates[best["name"]]
    print(f"\nSelected: {best['name']} (ROC-AUC {best['roc_auc']:.4f})")

    # Risk bands from the score distribution on the training set, so the UI can
    # say Low / Moderate / High instead of pretending a raw probability is a
    # clinical risk percentage.
    train_scores = model.predict_proba(X_tr_s)[:, 1]
    band_moderate = float(np.percentile(train_scores, MODERATE_BAND_PERCENTILE))
    band_high = float(best["threshold"])

    # Dataset facts are measured here and travel WITH the model, so the API and UI
    # never have to hardcode (and later misreport) what it was trained on.
    dataset_meta = {
        "name": "Kaggle healthcare-dataset-stroke-data",
        "n_records": int(len(df)),
        "positive_rate": round(float(y.mean()), 4),
    }

    artifact = {
        "model": model,
        "scaler": scaler,
        "feature_names": FEATURE_NAMES,
        "threshold": best["threshold"],
        "bands": {"moderate": band_moderate, "high": band_high},
        "metrics": {k: v for k, v in best.items() if k != "name"},
        "model_name": best["name"],
        "model_label": MODEL_LABELS[best["name"]],
        "explainer": "SHAP (per patient)",
        "dataset": dataset_meta,
        "encoders": {
            "gender": GENDER_MAP,
            "ever_married": EVER_MARRIED_MAP,
            "work_type": WORK_TYPE_MAP,
            "Residence_type": RESIDENCE_MAP,
            "smoking_status": SMOKING_MAP,
        },
        # A small background sample for SHAP explanations at serve time.
        "shap_background": X_tr_s[
            np.random.default_rng(RANDOM_STATE).choice(len(X_tr_s), 200, replace=False)
        ],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_train": int(len(X_tr)),
        "n_test": int(len(X_te)),
    }

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, ARTIFACT_PATH)
    print(f"\nSaved -> {ARTIFACT_PATH}")
    print(json.dumps(artifact["metrics"], indent=2))


if __name__ == "__main__":
    main()
