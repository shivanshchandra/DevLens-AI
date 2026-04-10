from __future__ import annotations

import json
from typing import Any

from app.services.ai.chat_prompt_builder import build_scan_rewrite_prompt
from app.services.ai.llm_client import LlmUnavailableError, generate_text_with_llm


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _pick_top_file_paths(items: list[dict], limit: int = 3) -> list[str]:
    paths: list[str] = []
    for item in items[:limit]:
        file_path = item.get("filePath") or item.get("file_path")
        if isinstance(file_path, str) and file_path.strip():
            paths.append(file_path)
    return paths


def _level_to_score(level: str | None) -> int:
    normalized = (level or "").strip().lower()

    if normalized in {"low", "healthy"}:
        return 1
    if normalized in {"moderate", "medium"}:
        return 2
    if normalized == "high":
        return 3
    if normalized == "critical":
        return 4
    return 0


def _score_to_level(score: int) -> str:
    if score >= 4:
        return "critical"
    if score == 3:
        return "high"
    if score == 2:
        return "moderate"
    return "low"


def _health_score_to_level(score: float) -> str:
    if score >= 85:
        return "low"
    if score >= 70:
        return "moderate"
    if score >= 50:
        return "high"
    return "critical"


def _derive_overall_risk_level(
    *,
    health_score: float,
    critical_count: int,
    high_count: int,
    architecture_smells_count: int,
    coupling_hotspots_count: int,
    dependency_hubs_count: int,
    arch_level: str | None,
    ml_risk_level: str | None,
) -> str:
    level_score = _level_to_score(_health_score_to_level(health_score))

    if critical_count > 0:
        level_score = max(level_score, 4)

    if high_count >= 3:
        level_score = max(level_score, 3)
    elif high_count > 0:
        level_score = max(level_score, 2)

    structural_signal_count = 0
    if architecture_smells_count > 0:
        structural_signal_count += 1
    if coupling_hotspots_count > 0:
        structural_signal_count += 1
    if dependency_hubs_count > 0:
        structural_signal_count += 1

    if structural_signal_count >= 2:
        level_score = max(level_score, 3)
    elif structural_signal_count == 1:
        level_score = max(level_score, 2)

    level_score = max(level_score, _level_to_score(arch_level))
    level_score = max(level_score, _level_to_score(ml_risk_level))

    return _score_to_level(level_score)


def _build_summary(
    *,
    health_score: float,
    grade: str,
    total_findings: int,
    critical_count: int,
    high_count: int,
    arch_level: str | None,
    ml_risk_level: str | None,
    ml_debt_level: str | None,
) -> str:
    summary_parts: list[str] = []

    summary_parts.append(
        f"This scan produced a health score of {int(round(health_score))} with grade {grade}."
    )

    if total_findings == 0:
        summary_parts.append(
            "No major findings were detected, which suggests the codebase is currently in a healthy state."
        )
    else:
        summary_parts.append(
            f"The analysis identified {total_findings} findings, including {critical_count} critical and {high_count} high-severity issues."
        )

    if arch_level:
        summary_parts.append(
            f"Architecture analysis indicates a {arch_level} level of structural risk."
        )

    if ml_risk_level or ml_debt_level:
        ml_bits: list[str] = []
        if ml_risk_level:
            ml_bits.append(f"predicted delivery risk is {ml_risk_level}")
        if ml_debt_level:
            ml_bits.append(f"predicted technical debt is {ml_debt_level}")
        summary_parts.append("ML signals suggest that " + " and ".join(ml_bits) + ".")

    return " ".join(summary_parts)


def _build_simple_summary(
    *,
    health_score: float,
    grade: str,
    total_findings: int,
    critical_count: int,
    high_count: int,
    architecture_smells_count: int,
    arch_level: str | None,
    ml_risk_level: str | None,
) -> str:
    if total_findings == 0 and architecture_smells_count == 0 and (arch_level or "low") == "low":
        return (
            f"This repository currently looks healthy overall. It has a health score of {int(round(health_score))} "
            f"with grade {grade}, and the scan did not detect major code issues. "
            f"From a first-pass review, the codebase appears stable enough for normal development work, "
            f"although it is still worth checking the top recommendations before making larger architectural changes."
        )

    parts: list[str] = [
        f"This repository currently has a health score of {int(round(health_score))} and grade {grade}."
    ]

    if total_findings > 0:
        parts.append(
            f"The scan found {total_findings} total issues, including {critical_count} critical and {high_count} high-severity findings."
        )
    else:
        parts.append(
            "The scan did not find major code issues, but there are still structural signals that deserve review."
        )

    if architecture_smells_count > 0:
        parts.append(
            f"Architecture analysis identified {architecture_smells_count} structural smell indicators, which suggests that some module boundaries or ownership lines may need cleanup."
        )

    if arch_level:
        parts.append(
            f"Overall architecture risk is currently {arch_level}."
        )

    if ml_risk_level:
        parts.append(
            f"ML-based signals also estimate delivery risk as {ml_risk_level}, which helps confirm the broader scan picture."
        )

    parts.append(
        "A practical next step is to review the top refactor targets, look at architecture recommendations, and then rerun the scan after the first cleanup pass."
    )

    return " ".join(parts)


def _build_risk_explanation(
    *,
    health_score: float,
    total_findings: int,
    critical_count: int,
    high_count: int,
    architecture_smells_count: int,
    coupling_hotspots_count: int,
    dependency_hubs_count: int,
    arch_level: str | None,
    ml_risk_level: str | None,
    top_files: list[str],
) -> dict[str, Any]:
    computed_risk_level = _derive_overall_risk_level(
        health_score=health_score,
        critical_count=critical_count,
        high_count=high_count,
        architecture_smells_count=architecture_smells_count,
        coupling_hotspots_count=coupling_hotspots_count,
        dependency_hubs_count=dependency_hubs_count,
        arch_level=arch_level,
        ml_risk_level=ml_risk_level,
    )

    bullets: list[str] = []

    if critical_count > 0:
        bullets.append(
            f"There are {critical_count} critical findings that should be addressed before broader refactoring."
        )

    if high_count > 0:
        bullets.append(
            f"There are {high_count} high-severity findings contributing meaningful operational and maintenance risk."
        )

    if architecture_smells_count > 0:
        bullets.append(
            f"Architecture analysis detected {architecture_smells_count} structural smell indicators."
        )

    if coupling_hotspots_count > 0:
        bullets.append(
            f"Import coupling analysis found {coupling_hotspots_count} coupling hotspots, suggesting fragile module boundaries."
        )

    if dependency_hubs_count > 0:
        bullets.append(
            f"{dependency_hubs_count} dependency hubs were detected, which may increase change impact across the codebase."
        )

    if arch_level:
        bullets.append(f"Architecture risk is currently assessed as {arch_level}.")

    if ml_risk_level:
        bullets.append(
            f"ML inference predicts an overall risk level of {ml_risk_level}, reinforcing the static analysis signals."
        )

    if top_files:
        bullets.append(
            "The highest-priority files currently appear to be: "
            + ", ".join(top_files)
            + "."
        )

    if not bullets:
        bullets.append(
            "The scan did not surface strong risk drivers, so the repository currently appears relatively stable."
        )

    if computed_risk_level == "low" and total_findings == 0 and health_score >= 85:
        narrative = (
            "The repository appears low risk overall. Static analysis, architecture signals, and ML indicators do not currently show major instability drivers."
        )
    elif computed_risk_level == "moderate":
        narrative = (
            "The repository shows some meaningful risk signals. The scan indicates moderate pressure from findings, structural signals, or predicted delivery risk, but the codebase does not yet appear severely unstable."
        )
    else:
        narrative = (
            "The repository risk appears elevated because the scan combines code findings, structural architecture signals, and prioritization hotspots into a consistent warning pattern."
        )

    return {
        "title": "Why this repository is risky",
        "level": computed_risk_level,
        "narrative": narrative,
        "bullets": bullets,
    }


def _build_refactor_plan(
    *,
    critical_count: int,
    high_count: int,
    top_files: list[str],
    coupling_hotspots_count: int,
    dependency_hubs_count: int,
    architecture_smells_count: int,
    fix_suggestions_count: int,
) -> dict[str, Any]:
    steps: list[str] = []

    if critical_count > 0:
        steps.append(
            "Resolve critical issues first, especially secrets, high-risk vulnerabilities, or severe correctness problems."
        )

    if high_count > 0:
        steps.append(
            "Address the highest-severity findings next to reduce immediate operational and maintainability risk."
        )

    if top_files:
        steps.append(
            "Start refactoring the top priority files first: " + ", ".join(top_files) + "."
        )

    if coupling_hotspots_count > 0 or dependency_hubs_count > 0:
        steps.append(
            "Reduce coupling around hotspot files and dependency hubs by introducing cleaner module boundaries and smaller interfaces."
        )

    if architecture_smells_count > 0:
        steps.append(
            "Review architecture smells and hotspot directories to separate overloaded modules and improve ownership boundaries."
        )

    if fix_suggestions_count > 0:
        steps.append(
            "Use the generated fix suggestions as the implementation checklist for the first cleanup pass."
        )

    steps.append(
        "After the first refactor pass, rerun the scan and compare results to confirm health score and risk signals are improving."
    )

    return {
        "title": "Recommended refactor plan",
        "steps": steps,
    }


def _maybe_rewrite_with_llm(
    *,
    result: dict[str, Any],
    insights: dict[str, Any],
) -> dict[str, Any]:
    insights["llmEnhanced"] = False
    insights["summarySource"] = "fallback"

    print("🚀 Trying LLM summary rewrite...", flush=True)

    try:
        prompt = build_scan_rewrite_prompt(
            result_json=result,
            deterministic_insights=insights,
        )
        print("✅ Summary rewrite prompt built", flush=True)

        raw_text = generate_text_with_llm(
            prompt=prompt,
            max_output_tokens=2500,
            system_instruction=(
                "You are an expert engineering mentor writing scan report content for DevLens AI, a developer tool. "
                "Your audience is a junior to mid-level developer who wants to understand their codebase. "
                "You must use ONLY the scan data provided in the prompt. Do not invent any files, metrics, or issues. "
                "Write every sentence in plain, warm, human English — like a senior engineer explaining to a teammate. "
                "Every field in your JSON response must meet the length and sentence requirements stated in the prompt. "
                "A short or vague response is a failure. A detailed, grounded, readable response is success. "
                "Return ONLY valid JSON with keys: summary, risk_narrative, risk_bullets, refactor_steps. "
                "Do not include any text outside the JSON object. Do not use markdown code fences."
            ),
        )

        print("✅ Raw LLM summary response received", flush=True)
        print(raw_text[:1200], flush=True)

        parsed = json.loads(raw_text)

        print("✅ LLM summary JSON parsed successfully", flush=True)

        summary = str(parsed.get("summary") or "").strip()
        risk_narrative = str(parsed.get("risk_narrative") or "").strip()
        risk_bullets = parsed.get("risk_bullets") or []
        refactor_steps = parsed.get("refactor_steps") or []

        if summary:
            insights["simpleSummary"] = summary

        risk_explanation = _safe_dict(insights.get("riskExplanation"))
        if risk_narrative:
            risk_explanation["narrative"] = risk_narrative
        if isinstance(risk_bullets, list) and risk_bullets:
            cleaned_bullets = [str(item).strip() for item in risk_bullets[:5] if str(item).strip()]
            risk_explanation["bullets"] = cleaned_bullets
            insights["simpleHighlights"] = cleaned_bullets[:3]
        insights["riskExplanation"] = risk_explanation

        refactor_plan = _safe_dict(insights.get("refactorPlan"))
        if isinstance(refactor_steps, list) and refactor_steps:
            refactor_plan["steps"] = [str(item).strip() for item in refactor_steps[:6] if str(item).strip()]
        insights["refactorPlan"] = refactor_plan

        insights["llmEnhanced"] = True
        insights["summarySource"] = "llm"

        print("✅ LLM summary applied successfully", flush=True)
        print(f"DEBUG llmEnhanced={insights['llmEnhanced']} summarySource={insights['summarySource']}", flush=True)

        return insights

    except LlmUnavailableError as llm_err:
        print(f"⚠️ LLM unavailable for insight rewrite: {llm_err}", flush=True)
        insights["llmEnhanced"] = False
        insights["summarySource"] = "fallback"
        return insights
    
    except (json.JSONDecodeError, TypeError, ValueError) as parse_err:
        print(f"⚠️ LLM JSON parse failed for insight rewrite: {parse_err}", flush=True)
        insights["llmEnhanced"] = False
        insights["summarySource"] = "fallback"
        return insights

    except Exception as unexpected_err:
        print(f"⚠️ Unexpected error in LLM rewrite: {unexpected_err}", flush=True)
        insights["llmEnhanced"] = False
        insights["summarySource"] = "fallback"
        return insights


def generate_ai_insights(result: dict[str, Any]) -> dict[str, Any]:
    findings = _safe_list(result.get("findings"))
    architecture = _safe_dict(result.get("architecture"))
    ml = _safe_dict(result.get("ml"))
    fix_suggestions = _safe_list(result.get("fix_suggestions"))
    top_files_to_fix = _safe_list(result.get("top_files_to_fix"))
    risk_summary = _safe_dict(result.get("risk_summary"))

    health_score = _to_float(result.get("healthScore"), 0.0)
    grade = str(result.get("grade") or "N/A")

    by_severity = _safe_dict(risk_summary.get("bySeverity"))
    critical_count = _to_int(by_severity.get("critical"), 0)
    high_count = _to_int(by_severity.get("high"), 0)

    architecture_summary = _safe_dict(architecture.get("summary"))
    architecture_smells_count = _to_int(
        architecture_summary.get("architectureSmells"), 0
    )
    coupling_hotspots_count = _to_int(
        architecture_summary.get("couplingHotspots"), 0
    )
    dependency_hubs_count = _to_int(
        architecture_summary.get("dependencyHubs"), 0
    )
    arch_level = architecture_summary.get("architectureRiskLevel")
    arch_level = str(arch_level) if arch_level else None

    ml_summary = _safe_dict(ml.get("summary"))
    ml_risk_level = ml_summary.get("predictedRiskLevel")
    ml_debt_level = ml_summary.get("predictedDebtLevel")
    ml_risk_level = str(ml_risk_level) if ml_risk_level else None
    ml_debt_level = str(ml_debt_level) if ml_debt_level else None

    top_files = _pick_top_file_paths(top_files_to_fix, limit=3)

    summary = _build_summary(
        health_score=health_score,
        grade=grade,
        total_findings=len(findings),
        critical_count=critical_count,
        high_count=high_count,
        arch_level=arch_level,
        ml_risk_level=ml_risk_level,
        ml_debt_level=ml_debt_level,
    )

    simple_summary = _build_simple_summary(
        health_score=health_score,
        grade=grade,
        total_findings=len(findings),
        critical_count=critical_count,
        high_count=high_count,
        architecture_smells_count=architecture_smells_count,
        arch_level=arch_level,
        ml_risk_level=ml_risk_level,
    )

    risk_explanation = _build_risk_explanation(
        health_score=health_score,
        total_findings=len(findings),
        critical_count=critical_count,
        high_count=high_count,
        architecture_smells_count=architecture_smells_count,
        coupling_hotspots_count=coupling_hotspots_count,
        dependency_hubs_count=dependency_hubs_count,
        arch_level=arch_level,
        ml_risk_level=ml_risk_level,
        top_files=top_files,
    )

    refactor_plan = _build_refactor_plan(
        critical_count=critical_count,
        high_count=high_count,
        top_files=top_files,
        coupling_hotspots_count=coupling_hotspots_count,
        dependency_hubs_count=dependency_hubs_count,
        architecture_smells_count=architecture_smells_count,
        fix_suggestions_count=len(fix_suggestions),
    )

    insights = {
        "version": "v2",
        "summary": summary,
        "simpleSummary": simple_summary,
        "simpleHighlights": risk_explanation.get("bullets", [])[:3],
        "riskExplanation": risk_explanation,
        "refactorPlan": refactor_plan,
        "llmEnhanced": False,
        "summarySource": "fallback",
        "grounding": {
            "healthScore": health_score,
            "grade": grade,
            "totalFindings": len(findings),
            "criticalCount": critical_count,
            "highCount": high_count,
            "architectureRiskLevel": arch_level,
            "couplingHotspots": coupling_hotspots_count,
            "dependencyHubs": dependency_hubs_count,
            "predictedRiskLevel": ml_risk_level,
            "predictedDebtLevel": ml_debt_level,
            "topRefactorTargets": top_files,
        },
    }

    return _maybe_rewrite_with_llm(result=result, insights=insights)