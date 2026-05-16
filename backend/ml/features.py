from __future__ import annotations

from datetime import datetime
from math import exp
from typing import Any

NUMERIC_FEATURES = [
    "driver_active_count",
    "driver_completed_count",
    "driver_declined_count",
    "driver_failed_count",
    "driver_avg_rating",
    "driver_total_ratings",
    "driver_points",
    "customer_total_orders",
    "customer_points",
    "order_hour",
    "order_day_of_week",
]

CATEGORICAL_FEATURES = [
    "order_type",
    "dropoff_city",
    "payment_method",
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def sigmoid(value: float) -> float:
    if value >= 0:
        z = exp(-value)
        return 1.0 / (1.0 + z)
    z = exp(value)
    return z / (1.0 + z)


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for feature in NUMERIC_FEATURES:
        value = row.get(feature, 0)
        normalized[feature] = float(value or 0)
    for feature in CATEGORICAL_FEATURES:
        normalized[feature] = str(row.get(feature) or "unknown").strip().lower()
    return normalized


def encode_row(row: dict[str, Any], model: dict[str, Any]) -> list[float]:
    row = normalize_row(row)
    values: list[float] = []

    means = model["numeric_means"]
    stds = model["numeric_stds"]
    for feature in NUMERIC_FEATURES:
        std = float(stds.get(feature) or 1.0)
        values.append((float(row[feature]) - float(means.get(feature, 0.0))) / std)

    categories = model["categories"]
    for feature in CATEGORICAL_FEATURES:
        current = row[feature]
        for category in categories.get(feature, []):
            values.append(1.0 if current == category else 0.0)

    return values


def predict_probability(row: dict[str, Any], model: dict[str, Any]) -> float:
    encoded = encode_row(row, model)
    weights = model["weights"]
    logit = float(model["bias"])
    for value, weight in zip(encoded, weights):
        logit += value * float(weight)
    return sigmoid(logit)


def current_order_time_features(now: datetime | None = None) -> dict[str, int]:
    now = now or datetime.now()
    return {
        "order_hour": now.hour,
        "order_day_of_week": now.weekday(),
    }
