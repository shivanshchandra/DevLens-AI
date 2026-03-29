from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.services.analysis.team_analytics import build_team_overview


class DummyScan:
    def __init__(
        self,
        *,
        source_type: str,
        repo_url: str | None,
        status: str,
        result_json: dict | None,
        created_at: datetime,
    ):
        self.id = uuid4()
        self.source_type = source_type
        self.repo_url = repo_url
        self.status = status
        self.result_json = result_json
        self.created_at = created_at


class DummyQuery:
    def __init__(self, scans):
        self._scans = scans

    def order_by(self, *_args, **_kwargs):
        return self

    def all(self):
        return self._scans


class DummySession:
    def __init__(self, scans):
        self._scans = scans

    def query(self, _model):
        return DummyQuery(self._scans)


def make_result(
    *,
    health_score: float | None = None,
    grade: str | None = None,
    risk_score: float | None = None,
    risk_level: str | None = None,
    debt_score: float | None = None,
    debt_level: str | None = None,
):
    result = {}

    if health_score is not None:
        result["healthScore"] = health_score
    if grade is not None:
        result["grade"] = grade

    result["summaries"] = {
        "ml": {
            "predictedRiskScore": risk_score,
            "predictedRiskLevel": risk_level,
            "predictedDebtScore": debt_score,
            "predictedDebtLevel": debt_level,
        }
    }

    return result


def test_build_team_overview_empty_state():
    db = DummySession([])

    overview = build_team_overview(db)

    assert overview["summary"]["total_scans"] == 0
    assert overview["summary"]["completed_scans"] == 0
    assert overview["summary"]["average_health_score"] is None
    assert overview["summary"]["average_predicted_risk_score"] is None
    assert overview["summary"]["average_predicted_debt_score"] is None
    assert overview["grade_distribution"] == []
    assert overview["risk_level_distribution"] == []
    assert overview["top_risky_repos"] == []
    assert overview["recent_trend"] == []
    assert overview["latest_completed_scans"] == []


def test_build_team_overview_single_completed_scan():
    now = datetime.now(UTC)
    scans = [
        DummyScan(
            source_type="github",
            repo_url="https://github.com/pallets/flask",
            status="completed",
            result_json=make_result(
                health_score=82,
                grade="B",
                risk_score=0.72,
                risk_level="high",
                debt_score=0.41,
                debt_level="medium",
            ),
            created_at=now,
        )
    ]

    db = DummySession(scans)
    overview = build_team_overview(db)

    assert overview["summary"]["total_scans"] == 1
    assert overview["summary"]["completed_scans"] == 1
    assert overview["summary"]["average_health_score"] == 82.0
    assert overview["summary"]["average_predicted_risk_score"] == 0.72
    assert overview["summary"]["average_predicted_debt_score"] == 0.41

    assert overview["grade_distribution"] == [{"label": "B", "count": 1}]
    assert overview["risk_level_distribution"] == [{"label": "high", "count": 1}]

    top_repo = overview["top_risky_repos"][0]
    assert top_repo["repo_label"] == "pallets/flask"
    assert top_repo["completed_scans"] == 1

    latest = overview["latest_completed_scans"][0]
    assert latest["repo_label"] == "pallets/flask"
    assert latest["grade"] == "B"


def test_build_team_overview_groups_same_repo():
    now = datetime.now(UTC)
    scans = [
        DummyScan(
            source_type="github",
            repo_url="https://github.com/pallets/flask",
            status="completed",
            result_json=make_result(
                health_score=80,
                grade="B",
                risk_score=0.70,
                risk_level="high",
                debt_score=0.40,
                debt_level="medium",
            ),
            created_at=now - timedelta(days=1),
        ),
        DummyScan(
            source_type="github",
            repo_url="https://github.com/pallets/flask",
            status="completed",
            result_json=make_result(
                health_score=90,
                grade="A",
                risk_score=0.50,
                risk_level="medium",
                debt_score=0.20,
                debt_level="low",
            ),
            created_at=now,
        ),
    ]

    db = DummySession(scans)
    overview = build_team_overview(db)

    assert overview["summary"]["completed_scans"] == 2
    assert overview["summary"]["average_health_score"] == 85.0
    assert overview["summary"]["average_predicted_risk_score"] == 0.6
    assert overview["summary"]["average_predicted_debt_score"] == 0.3

    assert len(overview["top_risky_repos"]) == 1
    repo = overview["top_risky_repos"][0]
    assert repo["repo_label"] == "pallets/flask"
    assert repo["completed_scans"] == 2
    assert repo["average_health_score"] == 85.0
    assert repo["average_predicted_risk_score"] == 0.6
    assert repo["average_predicted_debt_score"] == 0.3


def test_build_team_overview_handles_missing_ml_sections():
    now = datetime.now(UTC)
    scans = [
        DummyScan(
            source_type="github",
            repo_url="https://github.com/example/repo-one",
            status="completed",
            result_json={"healthScore": 76, "grade": "C"},
            created_at=now,
        )
    ]

    db = DummySession(scans)
    overview = build_team_overview(db)

    assert overview["summary"]["completed_scans"] == 1
    assert overview["summary"]["average_health_score"] == 76.0
    assert overview["summary"]["average_predicted_risk_score"] is None
    assert overview["summary"]["average_predicted_debt_score"] is None

    latest = overview["latest_completed_scans"][0]
    assert latest["predicted_risk_score"] is None
    assert latest["predicted_debt_score"] is None

    assert overview["risk_level_distribution"] == [{"label": "unknown", "count": 1}]


def test_build_team_overview_handles_zip_upload_label():
    now = datetime.now(UTC)
    scans = [
        DummyScan(
            source_type="zip",
            repo_url=None,
            status="completed",
            result_json=make_result(
                health_score=68,
                grade="C",
                risk_score=0.81,
                risk_level="high",
                debt_score=0.66,
                debt_level="high",
            ),
            created_at=now,
        )
    ]

    db = DummySession(scans)
    overview = build_team_overview(db)

    latest = overview["latest_completed_scans"][0]
    assert latest["repo_label"] == "ZIP Upload"

    top_repo = overview["top_risky_repos"][0]
    assert top_repo["repo_label"] == "ZIP Upload"


def test_build_team_overview_recent_trend_groups_by_day():
    now = datetime.now(UTC)
    scans = [
        DummyScan(
            source_type="github",
            repo_url="https://github.com/example/a",
            status="completed",
            result_json=make_result(
                health_score=70,
                grade="C",
                risk_score=0.80,
                risk_level="high",
                debt_score=0.60,
                debt_level="medium",
            ),
            created_at=now - timedelta(days=1),
        ),
        DummyScan(
            source_type="github",
            repo_url="https://github.com/example/b",
            status="completed",
            result_json=make_result(
                health_score=90,
                grade="A",
                risk_score=0.20,
                risk_level="low",
                debt_score=0.10,
                debt_level="low",
            ),
            created_at=now - timedelta(days=1),
        ),
        DummyScan(
            source_type="github",
            repo_url="https://github.com/example/c",
            status="completed",
            result_json=make_result(
                health_score=85,
                grade="B",
                risk_score=0.40,
                risk_level="medium",
                debt_score=0.30,
                debt_level="low",
            ),
            created_at=now,
        ),
    ]

    db = DummySession(scans)
    overview = build_team_overview(db, trend_days=7)

    assert len(overview["recent_trend"]) >= 2

    yesterday_bucket = [
        item for item in overview["recent_trend"]
        if item["date"] == (now - timedelta(days=1)).date().isoformat()
    ][0]

    assert yesterday_bucket["completed_scans"] == 2
    assert yesterday_bucket["average_health_score"] == 80.0
    assert yesterday_bucket["average_predicted_risk_score"] == 0.5
    assert yesterday_bucket["average_predicted_debt_score"] == 0.35