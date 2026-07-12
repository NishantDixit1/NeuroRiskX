"""
Tests for the paths that were actually broken.

The original code had no tests, and every real bug lived in exactly two places:
the boolean handling and the feature encoding order. So those are pinned first.
"""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import ARTIFACT, PredictionInput, app  # noqa: E402

client = TestClient(app)


@pytest.fixture(scope="module")
def auth() -> dict:
    """A signed-up user's bearer header. /predict is now a protected endpoint."""
    email = f"test-{uuid4().hex[:10]}@example.com"
    resp = client.post("/auth/signup", json={"email": email, "password": "supersecret1"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}

HEALTHY = {
    "age": 25,
    "gender": "female",
    "bmi": 22.0,
    "hypertension": False,
    "heart_disease": False,
    "ever_married": "no",
    "work_type": "private",
    "residence_type": "urban",
    "avg_glucose_level": 85.0,
    "smoking_status": "never_smoked",
}

AT_RISK = {
    "age": 78,
    "gender": "male",
    "bmi": 34.0,
    "hypertension": True,
    "heart_disease": True,
    "ever_married": "yes",
    "work_type": "self-employed",
    "residence_type": "urban",
    "avg_glucose_level": 220.0,
    "smoking_status": "smokes",
}


def test_model_loaded():
    assert ARTIFACT is not None, "Model artifact failed to load. Run train_model.py."


def test_feature_order_matches_scaler():
    """The #1 silent killer: encoding features in a different order than training."""
    assert ARTIFACT.scaler.n_features_in_ == len(ARTIFACT.feature_names)
    trained_order = list(getattr(ARTIFACT.scaler, "feature_names_in_", ARTIFACT.feature_names))
    assert trained_order == ARTIFACT.feature_names


@pytest.mark.parametrize("flag,expected", [(True, 1.0), (False, 0.0)])
def test_booleans_encode_correctly(flag, expected):
    """
    The original bug: `!!"false"` is true, so answering "no hypertension" was sent
    as hypertensive. This pins the encoding at the boundary.
    """
    data = PredictionInput(**{**HEALTHY, "hypertension": flag, "heart_disease": flag})
    row = ARTIFACT.encode(data)[0]
    idx_htn = ARTIFACT.feature_names.index("hypertension")
    idx_hd = ARTIFACT.feature_names.index("heart_disease")
    assert row[idx_htn] == expected
    assert row[idx_hd] == expected


def test_hypertension_changes_the_score(auth):
    """If the flag encodes correctly, flipping it must move the risk score."""
    def score(payload):
        return client.post("/predict", json=payload, headers=auth).json()["risk_score"]

    without = score({**AT_RISK, "hypertension": False})
    with_htn = score({**AT_RISK, "hypertension": True})
    assert with_htn > without


def test_predict_healthy_vs_at_risk(auth):
    healthy = client.post("/predict", json=HEALTHY, headers=auth)
    at_risk = client.post("/predict", json=AT_RISK, headers=auth)
    assert healthy.status_code == 200
    assert at_risk.status_code == 200

    h, r = healthy.json(), at_risk.json()
    assert r["risk_score"] > h["risk_score"]
    assert h["risk_band"] == "low"
    assert r["risk_band"] == "high"
    assert r["stroke_prediction"] is True


def test_response_shape(auth):
    body = client.post("/predict", json=AT_RISK, headers=auth).json()
    for key in (
        "risk_score",
        "risk_band",
        "stroke_prediction",
        "decision_threshold",
        "model_roc_auc",
        "top_features",
        "recommendations",
        "inputs",
        "disclaimer",
    ):
        assert key in body

    assert 0 <= body["risk_score"] <= 100
    assert body["risk_band"] in {"low", "moderate", "high"}


def test_shap_explanations_are_per_patient_and_directional(auth):
    healthy = client.post("/predict", json=HEALTHY, headers=auth).json()["top_features"]
    at_risk = client.post("/predict", json=AT_RISK, headers=auth).json()["top_features"]

    assert len(at_risk) == 5
    for f in at_risk:
        assert f["direction"] in {"increases", "decreases"}

    # Global feature importances would be identical for both patients. SHAP is not.
    assert healthy != at_risk

    # For a 78-year-old, age must push risk UP; for a 25-year-old it must push it DOWN.
    age_up = next(f for f in at_risk if f["feature"] == "Age")
    age_down = next(f for f in healthy if f["feature"] == "Age")
    assert age_up["direction"] == "increases"
    assert age_down["direction"] == "decreases"


def test_rejects_invalid_smoking_status(auth):
    """The old form offered 'previously_smoked', which the API does not accept."""
    resp = client.post("/predict", json={**HEALTHY, "smoking_status": "previously_smoked"}, headers=auth)
    assert resp.status_code == 422


def test_rejects_out_of_range_values(auth):
    assert client.post("/predict", json={**HEALTHY, "age": 0}, headers=auth).status_code == 422
    assert client.post("/predict", json={**HEALTHY, "age": 200}, headers=auth).status_code == 422
    assert client.post("/predict", json={**HEALTHY, "bmi": -5}, headers=auth).status_code == 422


def test_health_and_model_info():
    health = client.get("/health").json()
    assert health["model_loaded"] is True

    info = client.get("/model-info").json()
    assert info["roc_auc"] > 0.75
    assert "disclaimer" in info


# ----------------------------- auth -----------------------------


def test_predict_requires_authentication():
    """The endpoint is protected. This is the guarantee the old README falsely claimed."""
    assert client.post("/predict", json=HEALTHY).status_code == 401
    assert client.get("/history").status_code == 401
    assert client.get("/auth/me").status_code == 401


def test_signup_login_and_me():
    email = f"flow-{uuid4().hex[:10]}@example.com"
    signup = client.post("/auth/signup", json={"email": email, "password": "supersecret1"})
    assert signup.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": "supersecret1"})
    assert login.status_code == 200

    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/auth/me", headers=headers).json()["email"] == email


def test_duplicate_email_and_weak_password_rejected():
    email = f"dupe-{uuid4().hex[:10]}@example.com"
    assert client.post("/auth/signup", json={"email": email, "password": "supersecret1"}).status_code == 201
    assert client.post("/auth/signup", json={"email": email, "password": "supersecret1"}).status_code == 409
    assert client.post("/auth/signup", json={"email": f"w-{uuid4().hex[:6]}@x.com", "password": "short"}).status_code == 422


def test_login_does_not_leak_whether_an_email_exists():
    """Wrong password and unknown email must be indistinguishable."""
    email = f"enum-{uuid4().hex[:10]}@example.com"
    client.post("/auth/signup", json={"email": email, "password": "supersecret1"})

    wrong_pw = client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
    unknown = client.post("/auth/login", json={"email": f"ghost-{uuid4().hex[:6]}@x.com", "password": "wrongpassword"})

    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json()["detail"] == unknown.json()["detail"]


def test_invalid_token_rejected():
    assert client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"}).status_code == 401


def test_history_is_real_and_scoped_to_the_user():
    """The old UI faked a timeline with hardcoded numbers. This one is real."""
    a = f"a-{uuid4().hex[:10]}@example.com"
    b = f"b-{uuid4().hex[:10]}@example.com"
    ha = {"Authorization": f"Bearer {client.post('/auth/signup', json={'email': a, 'password': 'supersecret1'}).json()['access_token']}"}
    hb = {"Authorization": f"Bearer {client.post('/auth/signup', json={'email': b, 'password': 'supersecret1'}).json()['access_token']}"}

    client.post("/predict", json=AT_RISK, headers=ha)
    client.post("/predict", json=HEALTHY, headers=ha)

    mine = client.get("/history", headers=ha).json()
    theirs = client.get("/history", headers=hb).json()

    assert len(mine) == 2
    assert theirs == []  # user B must not see user A's assessments
    assert all(len(row["top_features"]) == 5 for row in mine)
