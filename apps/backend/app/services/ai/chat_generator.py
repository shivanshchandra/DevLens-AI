from __future__ import annotations

from typing import Any


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _first_non_empty(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _bullet_lines(items: list[str], limit: int = 4) -> list[str]:
    lines: list[str] = []
    for item in items:
        cleaned = str(item).strip()
        if cleaned:
            lines.append(f"- {cleaned}")
        if len(lines) >= limit:
            break
    return lines


def _top_file_labels(citations: list[dict[str, Any]], limit: int = 4) -> list[str]:
    seen: list[str] = []
    for item in citations:
        if item.get("type") != "file":
            continue
        label = str(item.get("label") or "").strip()
        if label and label not in seen:
            seen.append(label)
        if len(seen) >= limit:
            break
    return seen


def _citations_to_evidence_lines(citations: list[dict[str, Any]], limit: int = 4) -> list[str]:
    lines: list[str] = []
    for item in citations[:limit]:
        label = str(item.get("label") or "Source").strip()
        reason = str(item.get("reason") or "").strip()
        section = str(item.get("section") or "").strip()

        detail = label
        if section:
            detail += f" ({section})"
        if reason:
            detail += f" — {reason}"

        lines.append(f"- {detail}")
    return lines


def _repo_only_message() -> str:
    return (
        "I can help with questions about this scanned repository or project only.\n\n"
        "Try asking things like:\n"
        "- What should I fix first?\n"
        "- Which files are riskiest?\n"
        "- What are the biggest architecture issues?\n"
        "- What can I improve quickly?\n"
        "- Is this repo ready for production?"
    )


def _build_summary_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))
    ai = _safe_dict(result_json.get("ai"))

    health_score = int(round(float(quick.get("healthScore") or 0)))
    grade = str(quick.get("grade") or "N/A")
    total_findings = int(quick.get("totalFindings") or 0)
    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)

    summary = _first_non_empty(ai.get("summary"))
    direct = (
        f"This repository currently has a health score of {health_score} with grade {grade}. "
        f"It has {total_findings} findings, including {critical_count} critical and {high_count} high-severity issues."
    )

    actions = []
    if critical_count > 0:
        actions.append("Resolve critical issues before broader cleanup.")
    if high_count > 0:
        actions.append("Address high-severity findings next.")
    top_files = quick.get("topFiles") or []
    if top_files:
        actions.append(f"Start with {', '.join(top_files[:3])}.")
    actions.append("After the first cleanup pass, rerun the scan to confirm improvement.")

    why = []
    if summary:
        why.append(summary)
    why.extend(_safe_list(retrieval.get("evidence"))[:3])

    parts = [
        direct,
        "What to do next:",
        *_bullet_lines(actions, limit=4),
        "Why I’m saying this:",
        *_bullet_lines([str(item) for item in why], limit=4),
    ]

    return "\n\n".join([parts[0], "\n".join(parts[1:3]), "\n".join(parts[3:])])


def _build_risk_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))
    ai = _safe_dict(result_json.get("ai"))
    risk_explanation = _safe_dict(ai.get("riskExplanation"))

    level = _first_non_empty(
        risk_explanation.get("level"),
        quick.get("predictedRiskLevel"),
        quick.get("architectureRiskLevel"),
        "unknown",
    )
    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)
    top_files = _safe_list(quick.get("topFiles"))

    direct = f"This repository looks {level} risk overall based on the current scan."

    actions = []
    if critical_count > 0:
        actions.append(f"Fix the {critical_count} critical issues first.")
    if high_count > 0:
        actions.append(f"Then work through the {high_count} high-severity issues.")
    if top_files:
        actions.append(f"Review these files first: {', '.join(top_files[:3])}.")
    actions.append("Use refactor targets and fix suggestions as the first remediation checklist.")

    why = []
    narrative = _first_non_empty(risk_explanation.get("narrative"))
    if narrative:
        why.append(narrative)
    why.extend([str(item) for item in _safe_list(risk_explanation.get("bullets"))[:3]])
    why.extend([str(item) for item in _safe_list(retrieval.get("evidence"))[:2]])

    evidence_lines = _citations_to_evidence_lines(_safe_list(retrieval.get("citations")), limit=4)

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines(why, limit=4))}\n\n"
        f"Evidence used:\n"
        f"{chr(10).join(evidence_lines) if evidence_lines else '- Current scan findings and risk summaries'}"
    )


def _build_refactor_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))
    ai = _safe_dict(result_json.get("ai"))
    refactor_plan = _safe_dict(ai.get("refactorPlan"))
    top_files = _safe_list(quick.get("topFiles"))
    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)

    if top_files:
        direct = (
            f"You should start with {', '.join(top_files[:3])}. "
            "These are the strongest current refactor targets from the scan."
        )
    else:
        direct = (
            "You should start with the highest-severity findings and top refactor targets from the scan."
        )

    actions = []
    if critical_count > 0:
        actions.append("Resolve critical issues first so refactoring does not hide urgent problems.")
    if high_count > 0:
        actions.append("Address high-severity issues next in the same files.")
    actions.extend([str(item) for item in _safe_list(refactor_plan.get("steps"))[:3]])

    why = _safe_list(retrieval.get("evidence"))[:4]

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in actions], limit=5))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in why], limit=4))}"
    )


def _build_architecture_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))

    arch_level = str(quick.get("architectureRiskLevel") or "unknown")
    smells = int(quick.get("architectureSmells") or 0)
    coupling_hotspots = int(quick.get("couplingHotspots") or 0)
    dependency_hubs = int(quick.get("dependencyHubs") or 0)
    boundary_warnings = int(quick.get("boundaryWarnings") or 0)

    direct = (
        f"The architecture currently shows {arch_level} structural risk. "
        f"I can see {smells} smells, {coupling_hotspots} coupling hotspots, "
        f"{dependency_hubs} dependency hubs, and {boundary_warnings} boundary warnings."
    )

    actions = [
        "Start with files or modules that appear as coupling hotspots and dependency hubs.",
        "Split overloaded modules and reduce cross-boundary imports.",
        "Use architecture recommendations and top refactor targets together instead of treating them separately.",
        "Rerun the scan after structural cleanup to confirm the architecture risk is dropping.",
    ]

    why = _safe_list(retrieval.get("evidence"))[:4]

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in actions], limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in why], limit=4))}"
    )


def _build_files_answer(retrieval: dict[str, Any]) -> str:
    top_files = _top_file_labels(_safe_list(retrieval.get("citations")), limit=4)
    evidence = _safe_list(retrieval.get("evidence"))[:4]

    if top_files:
        direct = f"The most relevant files for this question are {', '.join(top_files)}."
    else:
        direct = "I found relevant repository evidence, but no strong file ranking for that exact question."

    actions = [
        "Inspect the cited files first.",
        "Cross-check those files against findings, fix suggestions, and refactor priorities.",
        "Start with files that have both severity and structural pressure.",
    ]

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=3))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in evidence], limit=4))}"
    )


def _build_quick_wins_answer(retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))
    top_files = _safe_list(quick.get("topFiles"))
    evidence = _safe_list(retrieval.get("evidence"))

    direct = (
        "The fastest wins are usually the high-signal cleanup items that improve risk without needing deep architectural rewrites."
    )

    actions = []
    if top_files:
        actions.append(f"Start with {', '.join(top_files[:3])} because they already surface as priority targets.")
    actions.append("Apply the fix suggestions that remove high-severity findings quickly.")
    actions.append("Reduce obvious complexity or duplication in hotspot files.")
    actions.append("Rerun the scan after the quick fixes to measure impact.")

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in evidence], limit=4))}"
    )


def _build_production_answer(retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))

    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)
    arch_level = str(quick.get("architectureRiskLevel") or "unknown")

    if critical_count > 0:
        direct = "This repository is not ready for production yet because critical issues are still present."
    elif high_count > 0 or arch_level in {"high", "critical"}:
        direct = "This repository needs another cleanup pass before production because meaningful risk is still present."
    else:
        direct = "This repository looks closer to production-ready, but you should still complete a final risk cleanup pass."

    actions = [
        "Resolve critical and high-severity findings first.",
        "Review architecture hotspots that could make production issues harder to debug or change safely.",
        "Confirm the top refactor targets have an owner and a concrete cleanup plan.",
        "Rerun the scan and compare results before release.",
    ]

    evidence = _safe_list(retrieval.get("evidence"))[:4]

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in evidence], limit=4))}"
    )


def _build_general_repo_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))
    ai = _safe_dict(result_json.get("ai"))

    summary = _first_non_empty(ai.get("summary"))
    top_files = _safe_list(quick.get("topFiles"))

    direct = (
        "This scan suggests the repository has a few clear improvement areas, and the best next step is to work from the current risk and refactor priorities rather than guessing."
    )

    actions = []
    if top_files:
        actions.append(f"Start with {', '.join(top_files[:3])}.")
    actions.append("Handle the highest-severity findings first.")
    actions.append("Use architecture and ML signals to decide whether cleanup or structural refactoring should come next.")
    actions.append("Rerun the scan after the first pass to confirm measurable improvement.")

    why = []
    if summary:
        why.append(summary)
    why.extend([str(item) for item in _safe_list(retrieval.get("evidence"))[:3]])

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines(why, limit=4))}"
    )


def generate_chat_answer(result_json: dict, retrieval: dict[str, Any]) -> str:
    if not bool(retrieval.get("is_supported")):
        return _repo_only_message()

    intent = str(retrieval.get("intent") or "general_repo")

    if intent == "summary":
        return _build_summary_answer(result_json, retrieval)

    if intent == "risk":
        return _build_risk_answer(result_json, retrieval)

    if intent == "security":
        return _build_risk_answer(result_json, retrieval)

    if intent == "refactor":
        return _build_refactor_answer(result_json, retrieval)

    if intent == "architecture":
        return _build_architecture_answer(result_json, retrieval)

    if intent == "files":
        return _build_files_answer(retrieval)

    if intent == "quick_wins":
        return _build_quick_wins_answer(retrieval)

    if intent == "production":
        return _build_production_answer(retrieval)

    if intent == "debt":
        return _build_general_repo_answer(result_json, retrieval)

    if intent == "quality":
        return _build_general_repo_answer(result_json, retrieval)

    if intent == "compare":
        return _build_general_repo_answer(result_json, retrieval)

    return _build_general_repo_answer(result_json, retrieval)