from __future__ import annotations


def compute_scores(files: int, loc: int, secret_count: int, vuln_count: int) -> dict:
    """
    Simple v1 scoring:
    - size penalties (files/loc)
    - security penalties (secrets/vulns)
    Returns: healthScore, grade, subScores
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

    # security penalties
    health -= min(30, secret_count * 10)
    health -= min(25, vuln_count * 5)

    health = max(0, min(100, health))

    security = max(0, 100 - min(70, secret_count * 20 + vuln_count * 12))
    quality = max(0, health - 5)
    maintainability = max(0, health - 10)

    grade = "A" if health >= 90 else "B" if health >= 80 else "C" if health >= 70 else "D"

    return {
        "healthScore": health,
        "grade": grade,
        "subScores": {
            "quality": quality,
            "security": security,
            "maintainability": maintainability,
        }
    }