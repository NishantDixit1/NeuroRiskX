# NeuroRiskX API

FastAPI service that scores stroke risk and explains each score with per-patient SHAP values.

> **Educational demo. Not a medical device.** It does not diagnose and must not be used for
> clinical decisions.

## The model

Trained by `train_model.py` from the public Kaggle stroke dataset (5,110 records, 4.9% positive).

| | |
|---|---|
| Model | Logistic regression, `class_weight="balanced"` |
| ROC-AUC (held-out test set) | **0.837** |
| Recall | 0.78 |
| Precision | 0.175 |
| Decision threshold | 0.602, chosen by Youden's J |

**Why these choices:** on a 4.9%-positive screening problem the default 0.5 threshold would flag
almost nobody, so the operating point is picked from the ROC curve instead. Precision is low by
design: this is a *screening* signal that suggests a conversation with a doctor, not a diagnosis.

The trained artifact (`model/neuroriskx_model.joblib`) carries its own **feature order,
categorical encoders, threshold and metrics**, so the API cannot silently drift from what was
trained. A test asserts the order matches the scaler.

## Setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python train_model.py          # writes model/neuroriskx_model.joblib
uvicorn main:app --reload      # http://127.0.0.1:8000
```

Interactive docs: `http://127.0.0.1:8000/docs`

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS allow-list |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/predict` | Risk score, band, SHAP explanation, recommendations |
| `GET` | `/model-info` | Model metrics and threshold, so the UI can be honest about accuracy |
| `GET` | `/health` | Liveness and whether the model loaded |

### `POST /predict`

```json
{
  "age": 78, "gender": "male", "bmi": 34.0,
  "hypertension": true, "heart_disease": true,
  "ever_married": "yes", "work_type": "self-employed",
  "residence_type": "urban", "avg_glucose_level": 220.0,
  "smoking_status": "smokes"
}
```

```json
{
  "risk_score": 94.6,
  "risk_band": "high",
  "stroke_prediction": true,
  "decision_threshold": 60.2,
  "model_roc_auc": 0.837,
  "top_features": [
    { "feature": "Age", "impact": 64.4, "direction": "increases" },
    { "feature": "Average glucose level", "impact": 12.8, "direction": "increases" }
  ],
  "recommendations": ["..."],
  "disclaimer": "..."
}
```

`top_features` are **SHAP values computed for that specific patient**, with a direction. They are
not global feature importances (which would be identical for everyone).

## Tests

```bash
pytest tests/ -q
```

The suite pins the things that were previously broken: boolean encoding, feature order, per-patient
SHAP direction, and rejection of inputs the model was never trained on.

## Security

There is **no authentication**. `/predict` is public, and no patient data is stored or logged.
(An earlier version of this README documented JWT auth with `/register` and `/token` endpoints.
That was never implemented, and the claim has been removed.) If this were ever deployed with real
user data, auth, transport security and a data-retention policy would all be prerequisites.
