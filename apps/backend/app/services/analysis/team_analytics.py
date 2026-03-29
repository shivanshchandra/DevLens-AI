from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from statistics import mean
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models.scan import Scan


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _average(values: list[float | None]) -> float | None:
    cleaned = [float(v) for v in values if v is not None]
    if not cleaned:
        return None
    return round(mean(cleaned), 2)


def _get_nested(data: dict, *keys, default=None):
    current = data
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current


def _extract_repo_identity(scan: Scan) -> tuple[str, str]:
    if scan.repo_url:
        raw = scan.repo_url.strip()

        try:
            parsed = urlparse(raw)
            path = (parsed.path or "").strip("/")
            parts = [p for p in path.split("/") if p]
            if len(parts) >= 2:
                owner_repo = f"{parts[0]}/{parts[1].replace('.git', '')}"
                return owner_repo.lower(), owner_repo
        except Exception:
            pass

        return raw.lower(), raw

    if scan.source_type == "zip":
        return "zip-upload", "ZIP Upload"

    return "unknown-source", "Unknown Source"


def _extract_health_and_grade(result_json: dict) -> tuple[float | None, str | None]:
    health_score = _safe_float(result_json.get("healthScore"))
    grade = result_json.get("grade")
    if grade is not None:
        grade = str(grade).strip().upper()
    return health_score, grade


def _extract_ml_summary(
    result_json: dict,
) -> tuple[float | None, str | None, float | None, str | None]:
    summary_ml = _get_nested(result_json, "summaries", "ml", default={}) or {}
    ml_summary = _get_nested(result_json, "ml", "summary", default={}) or {}

    predicted_risk_score = _safe_float(
        summary_ml.get("predictedRiskScore", ml_summary.get("predictedRiskScore"))
    )
    predicted_risk_level = summary_ml.get(
        "predictedRiskLevel", ml_summary.get("predictedRiskLevel")
    )
    predicted_debt_score = _safe_float(
        summary_ml.get("predictedDebtScore", ml_summary.get("predictedDebtScore"))
    )
    predicted_debt_level = summary_ml.get(
        "predictedDebtLevel", ml_summary.get("predictedDebtLevel")
    )

    if predicted_risk_level is not None:
        predicted_risk_level = str(predicted_risk_level).strip().lower()

    if predicted_debt_level is not None:
        predicted_debt_level = str(predicted_debt_level).strip().lower()

    return (
        predicted_risk_score,
        predicted_risk_level,
        predicted_debt_score,
        predicted_debt_level,
    )


def _build_grade_distribution(completed_rows: list[dict]) -> list[dict]:
    counts: dict[str, int] = defaultdict(int)

    for row in completed_rows:
        grade = row.get("grade") or "UNKNOWN"
        counts[grade] += 1

    preferred_order = ["A", "B", "C", "D", "F", "UNKNOWN"]
    output = []

    for label in preferred_order:
        if counts.get(label, 0) > 0:
            output.append({"label": label, "count": counts[label]})

    for label in sorted(counts.keys()):
        if label not in preferred_order and counts[label] > 0:
            output.append({"label": label, "count": counts[label]})

    return output


def _build_risk_level_distribution(completed_rows: list[dict]) -> list[dict]:
    counts: dict[str, int] = defaultdict(int)

    for row in completed_rows:
        risk_level = row.get("predicted_risk_level") or "unknown"
        counts[risk_level] += 1

    preferred_order = ["critical", "high", "medium", "low", "unknown"]
    output = []

    for label in preferred_order:
        if counts.get(label, 0) > 0:
            output.append({"label": label, "count": counts[label]})

    for label in sorted(counts.keys()):
        if label not in preferred_order and counts[label] > 0:
            output.append({"label": label, "count": counts[label]})

    return output


def _build_top_risky_repos(completed_rows: list[dict], limit: int = 10) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)

    for row in completed_rows:
        grouped[row["repo_key"]].append(row)

    repo_items: list[dict] = []

    for repo_key, rows in grouped.items():
        latest = max(rows, key=lambda x: x["created_at"])

        avg_health = _average([r.get("health_score") for r in rows])
        avg_risk = _average([r.get("predicted_risk_score") for r in rows])
        avg_debt = _average([r.get("predicted_debt_score") for r in rows])

        repo_items.append(
            {
                "repo_key": repo_key,
                "repo_label": latest["repo_label"],
                "completed_scans": len(rows),
                "average_health_score": avg_health,
                "average_predicted_risk_score": avg_risk,
                "average_predicted_debt_score": avg_debt,
                "latest_scan_id": latest["scan_id"],
                "latest_scan_created_at": latest["created_at"],
            }
        )

    repo_items.sort(
        key=lambda item: (
            -(
                item["average_predicted_risk_score"]
                if item["average_predicted_risk_score"] is not None
                else -1
            ),
            (
                item["average_health_score"]
                if item["average_health_score"] is not None
                else 9999
            ),
            -(
                item["latest_scan_created_at"].timestamp()
                if item["latest_scan_created_at"]
                else 0
            ),
        )
    )

    return repo_items[:limit]


def _build_recent_trend(completed_rows: list[dict], trend_days: int) -> list[dict]:
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=trend_days - 1)

    grouped: dict[str, list[dict]] = defaultdict(list)

    for row in completed_rows:
        created_at = row["created_at"]
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)

        if created_at < cutoff:
            continue

        day_key = created_at.date().isoformat()
        grouped[day_key].append(row)

    trend_items: list[dict] = []

    for day_key in sorted(grouped.keys()):
        rows = grouped[day_key]
        trend_items.append(
            {
                "date": day_key,
                "completed_scans": len(rows),
                "average_health_score": _average(
                    [r.get("health_score") for r in rows]
                ),
                "average_predicted_risk_score": _average(
                    [r.get("predicted_risk_score") for r in rows]
                ),
                "average_predicted_debt_score": _average(
                    [r.get("predicted_debt_score") for r in rows]
                ),
            }
        )

    return trend_items


def _build_latest_completed_scans(
    completed_rows: list[dict], latest_limit: int
) -> list[dict]:
    rows = sorted(completed_rows, key=lambda x: x["created_at"], reverse=True)
    rows = rows[:latest_limit]

    return [
        {
            "scan_id": row["scan_id"],
            "repo_key": row["repo_key"],
            "repo_label": row["repo_label"],
            "source_type": row["source_type"],
            "status": row["status"],
            "health_score": row["health_score"],
            "grade": row["grade"],
            "predicted_risk_score": row["predicted_risk_score"],
            "predicted_risk_level": row["predicted_risk_level"],
            "predicted_debt_score": row["predicted_debt_score"],
            "predicted_debt_level": row["predicted_debt_level"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def build_team_overview(
    db: Session,
    trend_days: int = 14,
    latest_limit: int = 10,
) -> dict:
    scans = db.query(Scan).order_by(Scan.created_at.desc()).all()

    total_scans = len(scans)

    completed_scans = [
        scan
        for scan in scans
        if scan.status == "completed" and isinstance(scan.result_json, dict)
    ]

    completed_rows: list[dict] = []

    for scan in completed_scans:
        result_json = scan.result_json or {}

        repo_key, repo_label = _extract_repo_identity(scan)
        health_score, grade = _extract_health_and_grade(result_json)
        (
            predicted_risk_score,
            predicted_risk_level,
            predicted_debt_score,
            predicted_debt_level,
        ) = _extract_ml_summary(result_json)

        completed_rows.append(
            {
                "scan_id": scan.id,
                "repo_key": repo_key,
                "repo_label": repo_label,
                "source_type": scan.source_type,
                "status": scan.status,
                "health_score": health_score,
                "grade": grade,
                "predicted_risk_score": predicted_risk_score,
                "predicted_risk_level": predicted_risk_level,
                "predicted_debt_score": predicted_debt_score,
                "predicted_debt_level": predicted_debt_level,
                "created_at": scan.created_at,
            }
        )

    summary = {
        "total_scans": total_scans,
        "completed_scans": len(completed_rows),
        "average_health_score": _average(
            [r.get("health_score") for r in completed_rows]
        ),
        "average_predicted_risk_score": _average(
            [r.get("predicted_risk_score") for r in completed_rows]
        ),
        "average_predicted_debt_score": _average(
            [r.get("predicted_debt_score") for r in completed_rows]
        ),
    }

    return {
        "summary": summary,
        "grade_distribution": _build_grade_distribution(completed_rows),
        "risk_level_distribution": _build_risk_level_distribution(completed_rows),
        "top_risky_repos": _build_top_risky_repos(completed_rows, limit=10),
        "recent_trend": _build_recent_trend(completed_rows, trend_days=trend_days),
        "latest_completed_scans": _build_latest_completed_scans(
            completed_rows, latest_limit=latest_limit
        ),
    }