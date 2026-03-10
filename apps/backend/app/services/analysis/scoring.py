from __future__ import annotations


def compute_scores(
    files: int,
    loc: int,
    secret_count: int,
    vuln_count: int,
    risk_count: int = 0,
    critical_risk_count: int = 0,
    high_risk_count: int = 0,
    medium_risk_count: int = 0,
) -> dict:
    """
    Scoring v2:
    - size penalties (files/loc)
    - security penalties (secrets/vulns)
    - risk penalties (critical/high/medium risk findings)

    Returns:
        {
            "healthScore": ...,
            "grade": ...,
            "subScores": {
                "quality": ...,
                "security": ...,
                "maintainability": ...
            }
        }
    """
    health = 100

    # size penalties
    if loc > 50_000:
        health -= 8
    if loc > 150_000:
        health -= 12
    if files > 2_000:
        health -= 8
    if files > 8_000:
        health -= 12

    # existing security penalties
    health -= min(30, secret_count * 10)
    health -= min(25, vuln_count * 5)

    # new risk penalties
    health -= min(20, critical_risk_count * 8)
    health -= min(18, high_risk_count * 4)
    health -= min(10, medium_risk_count * 2)

    # small additional overall risk pressure
    health -= min(10, max(0, risk_count - critical_risk_count - high_risk_count - medium_risk_count))

    health = max(0, min(100, health))

    security = max(
        0,
        100 - min(
            85,
            secret_count * 20
            + vuln_count * 12
            + critical_risk_count * 12
            + high_risk_count * 7
            + medium_risk_count * 3
        ),
    )

    quality = max(0, min(100, health - min(12, risk_count)))
    maintainability = max(
        0,
        min(
            100,
            health
            - min(8, high_risk_count * 2 + medium_risk_count)
            - min(6, max(0, files // 2000)),
        ),
    )

    grade = "A" if health >= 90 else "B" if health >= 80 else "C" if health >= 70 else "D"

    return {
        "healthScore": health,
        "grade": grade,
        "subScores": {
            "quality": quality,
            "security": security,
            "maintainability": maintainability,
        },
    }