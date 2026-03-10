from pathlib import Path
from radon.complexity import cc_visit


def analyze_complexity(root_dir: Path):
    """
    Analyze cyclomatic complexity of Python files.

    Returns:
        findings
        hotspots
    """

    findings = []
    hotspots = []

    fid = 1

    for file_path in root_dir.rglob("*.py"):

        try:
            code = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        try:
            blocks = cc_visit(code)
        except Exception:
            continue

        for block in blocks:

            complexity = getattr(block, "complexity", 0)
            name = getattr(block, "name", "unknown")

            # Radon versions sometimes don't expose .kind
            block_type = getattr(block, "kind", None)

            if block_type is None:
                block_type = type(block).__name__

            # determine severity
            if complexity >= 20:
                severity = "high"
            elif complexity >= 10:
                severity = "medium"
            else:
                severity = "low"

            if complexity >= 10:

                findings.append(
                    {
                        "id": f"CC-{fid}",
                        "type": "quality",
                        "severity": severity,
                        "title": "High cyclomatic complexity",
                        "filePath": str(file_path.relative_to(root_dir)),
                        "message": f"{block_type} '{name}' has complexity {complexity}",
                        "ruleId": "CYCLO_COMPLEXITY",
                    }
                )

                fid += 1

            hotspots.append(
                {
                    "filePath": str(file_path.relative_to(root_dir)),
                    "score": min(100, complexity * 5),
                }
            )

    hotspots = sorted(hotspots, key=lambda x: x["score"], reverse=True)[:5]

    return findings, hotspots