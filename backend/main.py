"""
NeuroRiskX API - stroke risk assessment.

Serves the pipeline trained by train_model.py. The model artifact carries its own
feature order, categorical encoders, decision threshold and metrics, so the API
cannot silently drift from what was trained.

Explanations are real per-patient SHAP values, not global feature importances.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from db import get_db, init_db
from models import Assessment, User
from schemas import (
    AssessmentResponse,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neuroriskx")

VERSION = "2.0.0"

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "model" / "neuroriskx_model.joblib"))

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Comma-separated list, e.g. "http://localhost:5173,https://neuroriskx.example.com"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

# Clinical reference points used only to word the recommendations. Named, not buried
# as magic numbers in an if-statement.
# Sources: American Diabetes Association (glucose), WHO (BMI).
GLUCOSE_DIABETIC_MGDL = 126.0
GLUCOSE_PREDIABETIC_MGDL = 100.0
BMI_OBESE = 30.0
BMI_OVERWEIGHT = 25.0

# Overridable via env; the API is the single source of this text and every client
# renders whatever it is told, so there is exactly one copy in the whole system.
DISCLAIMER = os.getenv(
    "DISCLAIMER",
    "This tool is an educational demonstration of a machine-learning model trained on a "
    "public dataset. It is not a medical device, it does not diagnose, and it must not be "
    "used to make clinical decisions. Always consult a qualified healthcare professional.",
)

# Human-readable labels for the model's internal feature names.
FEATURE_LABELS = {
    "gender": "Gender",
    "age": "Age",
    "hypertension": "Hypertension",
    "heart_disease": "Heart disease",
    "ever_married": "Ever married",
    "work_type": "Work type",
    "Residence_type": "Residence type",
    "avg_glucose_level": "Average glucose level",
    "bmi": "BMI",
    "smoking_status": "Smoking status",
}


class PredictionInput(BaseModel):
    """Patient inputs. Field names mirror the dataset vocabulary."""

    age: int = Field(..., ge=1, le=120)
    gender: Literal["male", "female"]
    bmi: float = Field(..., gt=5, lt=100)
    hypertension: bool
    heart_disease: bool
    ever_married: Literal["yes", "no"]
    work_type: Literal["private", "self-employed", "govt_job", "children", "never_worked"]
    residence_type: Literal["urban", "rural"]
    avg_glucose_level: float = Field(..., gt=20, lt=500)
    smoking_status: Literal["formerly_smoked", "never_smoked", "smokes", "unknown"]


class Artifact:
    """Loaded model bundle. Everything the API needs comes from here."""

    def __init__(self, path: Path):
        bundle = joblib.load(path)
        self.model = bundle["model"]
        self.scaler = bundle["scaler"]
        self.feature_names: list[str] = bundle["feature_names"]
        self.threshold: float = bundle["threshold"]
        self.bands: dict = bundle["bands"]
        self.metrics: dict = bundle["metrics"]
        self.model_name: str = bundle["model_name"]
        self.model_label: str = bundle["model_label"]
        self.explainer_name: str = bundle["explainer"]
        self.dataset: dict = bundle["dataset"]
        self.encoders: dict = bundle["encoders"]
        self.trained_at: str = bundle["trained_at"]

        # Guard: the scaler must expect exactly the features we say we send.
        if getattr(self.scaler, "n_features_in_", None) != len(self.feature_names):
            raise ValueError("Scaler feature count does not match persisted feature_names.")

        if self.model_name != "logistic_regression":
            raise ValueError(
                f"This API serves the closed-form SHAP path, which is exact only for a "
                f"linear model. Artifact contains '{self.model_name}'."
            )

        # Closed-form SHAP for a linear model with independent features:
        #     phi_i = coef_i * (x_i - E[x_i])
        # This is exactly what shap.LinearExplainer computes, and a test asserts the
        # two agree to 1e-9. Doing it in numpy keeps shap and pandas out of the
        # runtime image, which matters on a 512MB host.
        self.coef = np.asarray(self.model.coef_).reshape(-1)
        self.background_mean = np.asarray(bundle["shap_expected"])
        logger.info("Loaded %s (ROC-AUC %.3f)", self.model_name, self.metrics["roc_auc"])

    def encode(self, data: PredictionInput) -> np.ndarray:
        """Encode inputs using the SAME maps the model was trained with."""
        e = self.encoders
        values = {
            "gender": e["gender"][data.gender],
            "age": data.age,
            "hypertension": int(data.hypertension),
            "heart_disease": int(data.heart_disease),
            "ever_married": e["ever_married"][data.ever_married],
            "work_type": e["work_type"][data.work_type],
            "Residence_type": e["Residence_type"][data.residence_type],
            "avg_glucose_level": data.avg_glucose_level,
            "bmi": data.bmi,
            "smoking_status": e["smoking_status"][data.smoking_status],
        }
        # Built strictly in the persisted training order.
        row = [float(values[name]) for name in self.feature_names]
        return np.array(row, dtype=float).reshape(1, -1)

    def shap_values(self, scaled: np.ndarray) -> np.ndarray:
        """Exact per-patient SHAP values for the linear model."""
        return self.coef * (scaled.reshape(-1) - self.background_mean)

    def explain(self, scaled: np.ndarray) -> list[dict]:
        """Real per-patient SHAP contributions, signed and ranked by magnitude."""
        row = self.shap_values(scaled)

        total = float(np.abs(row).sum()) or 1.0
        contributions = [
            {
                "feature": FEATURE_LABELS.get(name, name),
                # Share of this patient's explanation, 0-100.
                "impact": round(abs(float(v)) / total * 100, 1),
                # Positive = pushed risk up, negative = pushed risk down.
                "direction": "increases" if v > 0 else "decreases",
            }
            for name, v in zip(self.feature_names, row)
        ]
        contributions.sort(key=lambda c: c["impact"], reverse=True)
        return contributions[:5]


def band_for(score: float, bands: dict, threshold: float) -> str:
    if score >= threshold:
        return "high"
    if score >= bands["moderate"]:
        return "moderate"
    return "low"


def build_recommendations(data: PredictionInput, band: str) -> list[str]:
    """Recommendations driven only by the patient's actual inputs. Nothing invented."""
    recs: list[str] = []

    if band == "high":
        recs.append("Your inputs place you in the model's elevated-risk group. Discuss stroke risk with a doctor.")
    elif band == "moderate":
        recs.append("Your inputs place you in the model's moderate-risk group. A routine check-up is worthwhile.")
    else:
        recs.append("Your inputs place you in the model's lower-risk group. Keep up the habits that got you there.")

    if data.hypertension:
        recs.append("You reported hypertension. Monitoring blood pressure and reducing sodium intake are the standard first steps.")
    if data.heart_disease:
        recs.append("You reported heart disease, which is closely linked to stroke risk. Stay on top of cardiology follow-ups.")
    if data.avg_glucose_level >= GLUCOSE_DIABETIC_MGDL:
        recs.append(f"Your average glucose ({data.avg_glucose_level:.0f} mg/dL) is in the diabetic range. Ask about a glucose screen.")
    elif data.avg_glucose_level >= GLUCOSE_PREDIABETIC_MGDL:
        recs.append(f"Your average glucose ({data.avg_glucose_level:.0f} mg/dL) is in the pre-diabetic range. Worth monitoring.")
    if data.bmi >= BMI_OBESE:
        recs.append(f"Your BMI ({data.bmi:.1f}) is in the obese range. Weight reduction measurably lowers stroke risk.")
    elif data.bmi >= BMI_OVERWEIGHT:
        recs.append(f"Your BMI ({data.bmi:.1f}) is in the overweight range.")
    if data.smoking_status == "smokes":
        recs.append("You reported that you smoke. Quitting is the single largest modifiable reduction in stroke risk.")
    elif data.smoking_status == "formerly_smoked":
        recs.append("You reported formerly smoking. Staying smoke-free continues to lower your risk over time.")

    recs.append("General guidance: 150 minutes of activity per week, a balanced diet, and 7 to 9 hours of sleep.")
    return recs


app = FastAPI(
    title="NeuroRiskX API",
    version=VERSION,
    description="Stroke risk assessment with per-patient SHAP explanations. Educational use only.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    # Authorization must be allowed: once a bearer token is attached the request is
    # no longer "simple", so the browser sends a CORS preflight for it. Omitting it
    # blocks every authenticated call, and a TestClient never catches this because
    # it does not perform preflight.
    allow_headers=["Content-Type", "Authorization"],
)

init_db()

try:
    ARTIFACT: Artifact | None = Artifact(MODEL_PATH)
except Exception as exc:  # pragma: no cover
    logger.error("Could not load model: %s", exc)
    ARTIFACT = None


# ----------------------------- auth -----------------------------

@app.post("/auth/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@app.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower().strip()))

    # Same error whether the email is unknown or the password is wrong, so the
    # endpoint cannot be used to enumerate which emails have accounts.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password."
        )

    return TokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@app.get("/auth/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@app.get("/history", response_model=list[AssessmentResponse])
async def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """A real assessment history. The old UI faked this with hardcoded numbers."""
    rows = db.scalars(
        select(Assessment)
        .where(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc())
        .limit(50)
    ).all()
    return [AssessmentResponse.model_validate(r) for r in rows]


@app.get("/health")
async def health():
    return {
        "status": "healthy" if ARTIFACT else "degraded",
        "model_loaded": ARTIFACT is not None,
        "version": VERSION,
    }


@app.get("/model-info")
async def model_info():
    """Exposed so the UI can be honest about how good the model actually is."""
    if ARTIFACT is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return {
        "model": ARTIFACT.model_name,
        "model_label": ARTIFACT.model_label,
        "explainer": ARTIFACT.explainer_name,
        "roc_auc": round(ARTIFACT.metrics["roc_auc"], 3),
        "recall": round(ARTIFACT.metrics["recall"], 3),
        "precision": round(ARTIFACT.metrics["precision"], 3),
        "decision_threshold": round(ARTIFACT.threshold, 3),
        "trained_at": ARTIFACT.trained_at,
        "dataset": ARTIFACT.dataset,
        "disclaimer": DISCLAIMER,
    }


@app.post("/predict")
async def predict(
    data: PredictionInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if ARTIFACT is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        features = ARTIFACT.encode(data)
        scaled = ARTIFACT.scaler.transform(features)
        score = float(ARTIFACT.model.predict_proba(scaled)[0][1])
        band = band_for(score, ARTIFACT.bands, ARTIFACT.threshold)
        top_features = ARTIFACT.explain(scaled)
        flagged = score >= ARTIFACT.threshold

        # Persist so the user has a real history to look back on.
        db.add(
            Assessment(
                user_id=user.id,
                risk_score=round(score * 100, 1),
                risk_band=band,
                flagged=flagged,
                inputs=data.model_dump(),
                top_features=top_features,
            )
        )
        db.commit()

        return {
            "risk_score": round(score * 100, 1),      # model score, 0-100
            "risk_band": band,                        # low | moderate | high
            "stroke_prediction": flagged,
            "decision_threshold": round(ARTIFACT.threshold * 100, 1),
            "model_roc_auc": round(ARTIFACT.metrics["roc_auc"], 3),
            "top_features": top_features,
            "recommendations": build_recommendations(data, band),
            "inputs": {
                "age": data.age,
                "gender": data.gender,
                "bmi": data.bmi,
                "avg_glucose_level": data.avg_glucose_level,
            },
            "disclaimer": DISCLAIMER,
        }
    except HTTPException:
        raise
    except Exception:
        # Never leak internals to the client.
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail="Prediction failed.")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
