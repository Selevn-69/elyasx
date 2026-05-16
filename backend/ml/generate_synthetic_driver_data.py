from __future__ import annotations

import csv
import random
from pathlib import Path

from features import ALL_FEATURES, sigmoid

OUTPUT_PATH = Path(__file__).with_name("synthetic_driver_assignment.csv")
RANDOM_SEED = 42

ORDER_TYPES = ["food", "package", "online"]
CITIES = ["jerusalem", "tel aviv", "haifa", "ramallah", "bethlehem", "nablus"]
PAYMENT_METHODS = ["cash"]


def bounded(value: float, low: float = 0.03, high: float = 0.97) -> float:
    return max(low, min(high, value))


def make_row() -> dict[str, object]:
    order_type = random.choice(ORDER_TYPES)
    dropoff_city = random.choice(CITIES)
    order_hour = random.randint(7, 23)
    order_day_of_week = random.randint(0, 6)

    completed = random.randint(0, 180)
    declined = random.randint(0, 45)
    failed = random.randint(0, 18)
    active = random.choices([0, 1, 2, 3, 4], weights=[34, 31, 20, 10, 5])[0]
    rating_count = random.randint(0, min(80, completed + 5))

    if rating_count == 0:
        avg_rating = 0.0
    else:
        experience_bonus = min(completed, 100) / 100
        avg_rating = round(bounded(random.gauss(3.4 + experience_bonus, 0.7), 1.0, 5.0), 1)

    driver_points = random.randint(0, 900)
    customer_orders = random.randint(0, 70)
    customer_points = random.randint(0, 600)

    logit = -0.1
    logit += (avg_rating - 3.0) * 0.75
    logit += min(completed, 120) * 0.008
    logit += min(driver_points, 700) * 0.0008
    logit += customer_orders * 0.004
    logit -= active * 0.95
    logit -= declined * 0.045
    logit -= failed * 0.16

    if rating_count == 0:
        logit -= 0.35
    if order_type == "food":
        logit -= 0.12
    elif order_type == "package":
        logit += 0.06
    if order_hour >= 22 or order_hour <= 8:
        logit -= 0.22
    if order_day_of_week in (4, 5):
        logit -= 0.08

    probability = sigmoid(logit)
    label = 1 if random.random() < probability else 0

    return {
        "driver_active_count": active,
        "driver_completed_count": completed,
        "driver_declined_count": declined,
        "driver_failed_count": failed,
        "driver_avg_rating": avg_rating,
        "driver_total_ratings": rating_count,
        "driver_points": driver_points,
        "customer_total_orders": customer_orders,
        "customer_points": customer_points,
        "order_hour": order_hour,
        "order_day_of_week": order_day_of_week,
        "order_type": order_type,
        "dropoff_city": dropoff_city,
        "payment_method": random.choice(PAYMENT_METHODS),
        "label": label,
    }


def main(rows: int = 2500) -> None:
    random.seed(RANDOM_SEED)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=ALL_FEATURES + ["label"])
        writer.writeheader()
        for _ in range(rows):
            writer.writerow(make_row())
    print(f"Generated {rows} synthetic driver-assignment rows at {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
