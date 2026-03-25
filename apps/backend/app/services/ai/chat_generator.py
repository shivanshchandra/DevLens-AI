from __future__ import annotations

from typing import Any


def _question_kind(question: str) -> str:
    q = question.lower()

    if any(word in q for word in ["fix first", "start", "refactor", "first"]):
        return "refactor"
    if any(word in q for word in ["risk", "risky", "danger", "unsafe"]):
        return "risk"
    if any(word in q for word in ["architecture", "coupling", "boundary", "dependency hub"]):
        return "architecture"
    if any(word in q for word in ["summary", "overview", "explain this scan", "plain language"]):
        return "summary"
    if any(word in q for word in ["where", "file", "auth", "login", "token", "jwt"]):
        return "files"

    return "general"


def generate_chat_answer(result_json: dict, retrieval: dict[str, Any]) -> str:
    kind = _question_kind(str(retrieval.get("question") or ""))
    citations = retrieval.get("citations") or []
    evidence = retrieval.get("evidence") or []

    top_file_labels = [
        item.get("label")
        for item in citations
        if item.get("type") == "file" and item.get("label")
    ][:3]

    ai = result_json.get("ai") or {}
    architecture = result_json.get("architecture") or {}
    ml = result_json.get("ml") or {}
    risk_summary = result_json.get("risk_summary") or {}

    if kind == "risk":
        level = (
            ((ai.get("riskExplanation") or {}).get("level"))
            or ((ml.get("summary") or {}).get("predictedRiskLevel"))
            or "unknown"
        )
        by_severity = risk_summary.get("bySeverity") or {}
        critical_count = by_severity.get("critical", 0)
        high_count = by_severity.get("high", 0)

        pieces = [
            f"This scan currently looks {level} risk overall."
        ]

        if critical_count or high_count:
            pieces.append(
                f"The strongest direct signals are {critical_count} critical and {high_count} high-severity findings."
            )

        if top_file_labels:
            pieces.append(
                f"The most important files to review first are {', '.join(top_file_labels)}."
            )

        if evidence:
            pieces.append(f"Grounding highlights: {evidence[0]}")

        return " ".join(pieces)

    if kind == "refactor":
        if top_file_labels:
            return (
                f"You should start with {', '.join(top_file_labels)}. "
                f"These files appear repeatedly in the scan's refactor targets and supporting evidence. "
                f"Address the highest-severity issues first, then simplify complexity and reduce structural pressure in those files."
            )
        return (
            "Start with the top refactor targets and fix suggestions from the scan. "
            "Prioritize files that combine severity, complexity hotspots, and architecture pressure."
        )

    if kind == "architecture":
        summary = architecture.get("summary") or {}
        risk_level = summary.get("architectureRiskLevel", "unknown")
        smells = summary.get("architectureSmells", 0)
        coupling_hotspots = summary.get("couplingHotspots", 0)
        dependency_hubs = summary.get("dependencyHubs", 0)
        boundary_warnings = summary.get("boundaryWarnings", 0)

        return (
            f"The architecture currently looks {risk_level} risk. "
            f"The main structural signals are {smells} architecture smells, "
            f"{coupling_hotspots} coupling hotspots, {dependency_hubs} dependency hubs, "
            f"and {boundary_warnings} boundary warnings. "
            f"Review the cited files and recommendations first because they represent the strongest structural pressure in the scan."
        )

    if kind == "summary":
        if ai.get("summary"):
            return str(ai["summary"])
        if evidence:
            return " ".join(evidence[:3])
        return "This scan result contains findings, priorities, and architecture signals, but no summary text was available."

    if kind == "files":
        if top_file_labels:
            return (
                f"The most relevant files surfaced by this question are {', '.join(top_file_labels)}. "
                f"These files were matched from scan findings, refactor targets, or architecture signals."
            )
        if evidence:
            return f"I found relevant evidence in the scan: {evidence[0]}"
        return "I could not identify specific files for that question from the current scan result."

    if evidence:
        return (
            f"Here is the most relevant grounded answer I found from this scan: {evidence[0]} "
            f"{'Additional relevant files include ' + ', '.join(top_file_labels) + '.' if top_file_labels else ''}"
        )

    return (
        "I could not find strong evidence for that question in the current scan result. "
        "Try asking about risk, architecture, top files to fix, findings, or refactor priorities."
    )