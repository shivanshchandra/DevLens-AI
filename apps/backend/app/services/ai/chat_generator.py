from __future__ import annotations

from typing import Any

from app.services.ai.chat_prompt_builder import build_chat_prompt
from app.services.ai.llm_client import LlmUnavailableError, generate_text_with_llm


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


def _quick_facts(retrieval: dict[str, Any]) -> dict[str, Any]:
    return _safe_dict(retrieval.get("quickFacts") or retrieval.get("overview"))


def _deterministic_summary_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _quick_facts(retrieval)
    ai = _safe_dict(result_json.get("ai"))

    health_score = int(round(float(quick.get("healthScore") or 0)))
    grade = str(quick.get("grade") or "N/A")
    total_findings = int(quick.get("totalFindings") or 0)
    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)

    summary = _first_non_empty(ai.get("simpleSummary"), ai.get("summary"))
    direct = (
        f"This repository currently has a health score of {health_score} with grade {grade}. "
        f"It has {total_findings} findings, including {critical_count} critical and {high_count} high-severity issues."
    )

    actions = []
    if critical_count > 0:
        actions.append("Resolve critical issues before broader cleanup.")
    if high_count > 0:
        actions.append("Address high-severity findings next.")
    top_files = quick.get("topRefactorTargets") or quick.get("topFiles") or []
    if top_files:
        actions.append(f"Start with {', '.join(top_files[:3])}.")
    actions.append("After the first cleanup pass, rerun the scan to confirm improvement.")

    why = []
    if summary:
        why.append(summary)
    why.extend(_safe_list(retrieval.get("evidence"))[:3])

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in why], limit=4))}"
    )


def _deterministic_risk_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _quick_facts(retrieval)
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
    top_files = _safe_list(quick.get("topRefactorTargets") or quick.get("topFiles"))

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

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines(why, limit=4))}"
    )


def _deterministic_refactor_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _quick_facts(retrieval)
    ai = _safe_dict(result_json.get("ai"))
    refactor_plan = _safe_dict(ai.get("refactorPlan"))
    top_files = _safe_list(quick.get("topRefactorTargets") or quick.get("topFiles"))
    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)
    architecture_smells = int(quick.get("architectureSmells") or 0)

    if top_files:
        direct = (
            f"You should start with {', '.join(top_files[:3])}. "
            "These are the strongest current refactor targets from the scan."
        )
    elif architecture_smells > 0:
        direct = (
            "There are no urgent file-level refactor targets right now, so the best next step is to review the architecture smell indicators and improve structural weak points first."
        )
    else:
        direct = "You should start with the highest-severity findings and top refactor targets from the scan."

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


def _deterministic_architecture_answer(retrieval: dict[str, Any]) -> str:
    quick = _quick_facts(retrieval)

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
        "Use architecture recommendations and top refactor targets together.",
        "Rerun the scan after structural cleanup to confirm the architecture risk is dropping.",
    ]

    why = _safe_list(retrieval.get("evidence"))[:4]

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines([str(item) for item in why], limit=4))}"
    )


def _deterministic_files_answer(retrieval: dict[str, Any]) -> str:
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


def _deterministic_production_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _quick_facts(retrieval)
    architecture_risk = str(quick.get("architectureRiskLevel") or "unknown")
    critical_count = int(quick.get("criticalCount") or 0)
    high_count = int(quick.get("highCount") or 0)
    health_score = int(round(float(quick.get("healthScore") or 0)))

    if critical_count == 0 and high_count == 0 and architecture_risk in {"low", "unknown"}:
        direct = (
            f"This scan suggests the project is in a fairly safe state to deploy from a code-risk perspective. "
            f"It has a health score of {health_score} and no critical or high-severity findings."
        )
    else:
        direct = (
            "This project does not look fully ready for deployment yet from a scan perspective. "
            "There are still risk signals that should be reviewed before release."
        )

    actions = [
        "Review any architecture smells or structural warnings before release.",
        "Confirm there are no unresolved deployment blockers outside this scan, such as environment, infra, or test coverage gaps.",
        "Rerun the scan after the next cleanup pass to verify the risk picture stays stable.",
    ]

    why = [str(item) for item in _safe_list(retrieval.get("evidence"))[:4]]

    return (
        f"{direct}\n\n"
        f"What to do next:\n"
        f"{chr(10).join(_bullet_lines(actions, limit=4))}\n\n"
        f"Why I’m saying this:\n"
        f"{chr(10).join(_bullet_lines(why, limit=4))}"
    )


def _deterministic_general_answer(result_json: dict[str, Any], retrieval: dict[str, Any]) -> str:
    quick = _quick_facts(retrieval)
    ai = _safe_dict(result_json.get("ai"))

    summary = _first_non_empty(ai.get("simpleSummary"), ai.get("summary"))
    top_files = _safe_list(quick.get("topRefactorTargets") or quick.get("topFiles"))

    direct = (
        "Based on this scan, the repository does not show urgent failures, but it does show a few areas worth reviewing next. "
        "The safest approach is to follow the scan’s current risk, architecture, and refactor signals instead of changing things blindly."
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


def _generate_deterministic_chat_answer(result_json: dict, retrieval: dict[str, Any]) -> str:
    is_supported = (
        bool(retrieval.get("is_supported"))
        or str(retrieval.get("status") or "").strip().lower() == "supported"
    )

    if not is_supported:
        return _repo_only_message()

    intent = str(retrieval.get("intent") or "general_repo")

    if intent == "summary":
        return _deterministic_summary_answer(result_json, retrieval)
    if intent in {"risk", "security"}:
        return _deterministic_risk_answer(result_json, retrieval)
    if intent in {"fix_priority", "quick_wins"}:
        return _deterministic_refactor_answer(result_json, retrieval)
    if intent == "architecture":
        return _deterministic_architecture_answer(retrieval)
    if intent == "files":
        return _deterministic_files_answer(retrieval)
    if intent == "production_readiness":
        return _deterministic_production_answer(result_json, retrieval)

    return _deterministic_general_answer(result_json, retrieval)


def generate_chat_answer(result_json: dict, retrieval: dict[str, Any]) -> str:
    is_supported = (
        bool(retrieval.get("is_supported"))
        or str(retrieval.get("status") or "").strip().lower() == "supported"
    )

    if not is_supported:
        print("DEBUG unsupported question path", flush=True)
        return _repo_only_message()

    deterministic_answer = _generate_deterministic_chat_answer(result_json, retrieval)

    try:
        print("🚀 Trying LLM...", flush=True)

        prompt = build_chat_prompt(result_json=result_json, retrieval=retrieval)

        response = generate_text_with_llm(
            prompt=prompt,
            system_instruction=(
                "You are DevLens AI, a helpful repository assistant. "
                "Stay grounded in the provided scan data, but explain things like a mentor. "
                "Be simple, clear, beginner-friendly, practical, and natural. "
                "Do not sound robotic. "
                "Do not invent repository facts."
            ),
        )

        print("✅ LLM SUCCESS", flush=True)
        return response

    except LlmUnavailableError as e:
        print("❌ LLM FAILED:", str(e), flush=True)
        print("DEBUG returning deterministic fallback", flush=True)
        return deterministic_answer