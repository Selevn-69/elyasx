from __future__ import annotations

import csv
import json
import random
from pathlib import Path
from typing import Any

from features import CATEGORICAL_FEATURES, NUMERIC_FEATURES, encode_row, predict_probability

DATA_PATH = Path(__file__).with_name("synthetic_driver_assignment.csv")
MODEL_PATH = Path(__file__).with_name("driver_assignment_model.json")
RANDOM_SEED = 42


def load_rows() -> list[dict[str, Any]]:
    with DATA_PATH.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def build_empty_model(rows: list[dict[str, Any]]) -> dict[str, Any]:
    numeric_means: dict[str, float] = {}
    numeric_stds: dict[str, float] = {}
    categories: dict[str, list[str]] = {}

    for feature in NUMERIC_FEATURES:
        values = [float(row[feature] or 0) for row in rows]
        mean = sum(values) / len(values)
        variance = sum((value - mean) ** 2 for value in values) / len(values)
        numeric_means[feature] = mean
        numeric_stds[feature] = max(variance ** 0.5, 1.0)

    for feature in CATEGORICAL_FEATURES:
        categories[feature] = sorted({str(row[feature] or "unknown").strip().lower() for row in rows})

    encoded_size = len(NUMERIC_FEATURES) + sum(len(values) for values in categories.values())
    return {
        "model_type": "logistic_regression",
        "source": "synthetic course/demo data",
        "numeric_means": numeric_means,
        "numeric_stds": numeric_stds,
        "categories": categories,
        "weights": [0.0] * encoded_size,
        "bias": 0.0,
    }


def train(rows: list[dict[str, Any]]) -> dict[str, Any]:
    random.seed(RANDOM_SEED)
    random.shuffle(rows)
    split_index = int(len(rows) * 0.8)
    train_rows = rows[:split_index]
    test_rows = rows[split_index:]

    model = build_empty_model(train_rows)
    weights = model["weights"]
    bias = 0.0
    learning_rate = 0.035
    l2 = 0.0005
    epochs = 180

    for _ in range(epochs):
        random.shuffle(train_rows)
        for row in train_rows:
            x = encode_row(row, model)
            y = float(row["label"])
            prediction = predict_probability(row, {**model, "weights": weights, "bias": bias})
            error = prediction - y
            for index, value in enumerate(x):
                weights[index] -= learning_rate * (error * value + l2 * weights[index])
            bias -= learning_rate * error

    model["weights"] = weights
    model["bias"] = bias
    model["metrics"] = evaluate(test_rows, model)
    return model


def evaluate(rows: list[dict[str, Any]], model: dict[str, Any]) -> dict[str, float]:
    correct = 0
    tp = fp = tn = fn = 0
    for row in rows:
        probability = predict_probability(row, model)
        predicted = 1 if probability >= 0.5 else 0
        actual = int(row["label"])
        correct += 1 if predicted == actual else 0
        if predicted == 1 and actual == 1:
            tp += 1
        elif predicted == 1 and actual == 0:
            fp += 1
        elif predicted == 0 and actual == 0:
            tn += 1
        else:
            fn += 1

    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    accuracy = correct / max(len(rows), 1)
    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "test_rows": len(rows),
    }


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Missing training data: {DATA_PATH}. Run generate_synthetic_driver_data.py first.")
    rows = load_rows()
    model = train(rows)
    MODEL_PATH.write_text(json.dumps(model, indent=2), encoding="utf-8")
    print(f"Saved model at {MODEL_PATH}")
    print(json.dumps(model["metrics"], indent=2))


if __name__ == "__main__":
    main()
