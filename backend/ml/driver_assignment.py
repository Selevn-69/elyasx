from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from ml.features import current_order_time_features, predict_probability

MODEL_PATH = Path(__file__).with_name("driver_assignment_model.json")
_MODEL_CACHE: dict[str, Any] | None = None


def load_model() -> dict[str, Any] | None:
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
    if not MODEL_PATH.exists():
        return None
    _MODEL_CACHE = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    return _MODEL_CACHE


def choose_best_driver(cur: Any, order_context: dict[str, Any]) -> dict[str, Any] | None:
    excluded_driver_ids = [int(driver_id) for driver_id in order_context.get("exclude_driver_ids", [])]
    cur.execute(
        """
        SELECT city
        FROM address
        WHERE address_id = %s
        """,
        (order_context["dropoff_address_id"],)
    )
    dropoff = cur.fetchone() or {}

    cur.execute(
        """
        SELECT COUNT(*) AS customer_total_orders
        FROM `order`
        WHERE customer_id = %s
        """,
        (order_context["customer_id"],)
    )
    customer_orders = cur.fetchone() or {"customer_total_orders": 0}

    exclude_clause = ""
    params: list[Any] = []
    if excluded_driver_ids:
        placeholders = ", ".join(["%s"] * len(excluded_driver_ids))
        exclude_clause = f"AND d.driver_id NOT IN ({placeholders})"
        params.extend(excluded_driver_ids)

    cur.execute(
        f"""
        SELECT
            d.driver_id,
            d.points AS driver_points,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS driver_avg_rating,
            COUNT(DISTINCT r.rating_id) AS driver_total_ratings,
            COUNT(DISTINCT CASE
                WHEN del.delivery_status IN ('offered', 'pending', 'picked_up', 'on_the_way')
                THEN del.delivery_id
            END) AS driver_active_count,
            COUNT(DISTINCT CASE WHEN del.delivery_status = 'delivered' THEN del.delivery_id END) AS driver_completed_count,
            COUNT(DISTINCT CASE WHEN del.delivery_status = 'declined' THEN del.delivery_id END) AS driver_declined_count,
            COUNT(DISTINCT CASE WHEN del.delivery_status = 'failed' THEN del.delivery_id END) AS driver_failed_count
        FROM driver d
        LEFT JOIN driver_rating r ON d.driver_id = r.driver_id
        LEFT JOIN delivery del ON d.driver_id = del.driver_id
        WHERE d.status = 'available'
          {exclude_clause}
        GROUP BY d.driver_id, d.points
        """,
        tuple(params),
    )
    candidates = cur.fetchall()
    if not candidates:
        return None

    # Fairness guard: keep workload balanced first, then use ML to rank drivers
    # within the least-loaded available group.
    min_active_count = min(int(candidate["driver_active_count"] or 0) for candidate in candidates)
    candidates = [
        candidate
        for candidate in candidates
        if int(candidate["driver_active_count"] or 0) == min_active_count
    ]

    model = load_model()
    time_features = current_order_time_features(datetime.now())
    scored: list[dict[str, Any]] = []

    for candidate in candidates:
        features = {
            **candidate,
            **time_features,
            "customer_total_orders": customer_orders["customer_total_orders"],
            "customer_points": order_context["customer_points"],
            "order_type": order_context["order_type"],
            "dropoff_city": dropoff.get("city") or "unknown",
            "payment_method": order_context["payment_method"],
        }
        if model:
            score = predict_probability(features, model)
            score_source = "ml"
        else:
            score = heuristic_score(features)
            score_source = "heuristic"
        scored.append({**candidate, "assignment_score": score, "score_source": score_source})

    scored.sort(key=lambda row: (-float(row["assignment_score"]), int(row["driver_id"])))
    return scored[0]


def heuristic_score(features: dict[str, Any]) -> float:
    score = 0.55
    score += float(features.get("driver_avg_rating") or 0) * 0.055
    score += min(float(features.get("driver_completed_count") or 0), 100.0) * 0.002
    score += min(float(features.get("driver_points") or 0), 500.0) * 0.00015
    score -= float(features.get("driver_active_count") or 0) * 0.12
    score -= float(features.get("driver_failed_count") or 0) * 0.025
    score -= float(features.get("driver_declined_count") or 0) * 0.012
    return max(0.01, min(0.99, score))
