from __future__ import annotations

from typing import Any


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def build_chat_prompt(
    *,
    result_json: dict[str, Any],
    retrieval: dict[str, Any],
) -> str:
    quick = _safe_dict(retrieval.get("quickFacts"))
    citations = _safe_list(retrieval.get("citations"))
    evidence = _safe_list(retrieval.get("evidence"))

    ai = _safe_dict(result_json.get("ai"))
    architecture = _safe_dict(result_json.get("architecture"))
    architecture_summary = _safe_dict(architecture.get("summary"))

    question = str(retrieval.get("question") or "").strip()
    intent = str(retrieval.get("intent") or "general_repo").strip()

    citation_lines: list[str] = []
    for item in citations[:6]:
        label = str(item.get("label") or "Source").strip()
        reason = str(item.get("reason") or "").strip()
        section = str(item.get("section") or "").strip()

        line = f"- {label}"
        if section:
            line += f" | section={section}"
        if reason:
            line += f" | reason={reason}"
        citation_lines.append(line)

    evidence_lines = [f"- {str(item).strip()}" for item in evidence[:8] if str(item).strip()]

    ai_summary = str(ai.get("summary") or "").strip()
    risk_explanation = _safe_dict(ai.get("riskExplanation"))
    refactor_plan = _safe_dict(ai.get("refactorPlan"))

    prompt = f"""

You are DevLens AI, a smart assistant for understanding repositories.

You MUST stay focused on the scanned repository and project.
Do NOT answer unrelated world questions.

You SHOULD:
- Explain things in simple, beginner-friendly language
- Interpret and simplify the scan results, not just repeat them
- Help the user understand what it means and what to do next
- Add helpful context where needed, but do not invent fake data

You CAN:
- Rephrase technical terms into simple words
- Add small explanations for clarity
- Guide the user like a mentor

You MUST NOT:
- Invent files, metrics, or findings not present in the scan
- Go outside repository or project context

User question:
{question}

Detected intent:
{intent}

Repo scan quick facts:
- Health score: {quick.get("healthScore")}
- Grade: {quick.get("grade")}
- Total findings: {quick.get("totalFindings")}
- Critical findings: {quick.get("criticalCount")}
- High findings: {quick.get("highCount")}
- Medium findings: {quick.get("mediumCount")}
- Low findings: {quick.get("lowCount")}
- Architecture risk: {quick.get("architectureRiskLevel")}
- Architecture smells: {quick.get("architectureSmells")}
- Coupling hotspots: {quick.get("couplingHotspots")}
- Dependency hubs: {quick.get("dependencyHubs")}
- Boundary warnings: {quick.get("boundaryWarnings")}
- Predicted risk level: {quick.get("predictedRiskLevel")}
- Predicted debt level: {quick.get("predictedDebtLevel")}
- Top files: {", ".join(_safe_list(quick.get("topFiles"))[:5]) or "None"}

Existing deterministic summary:
{ai_summary or "None"}

Existing deterministic risk explanation:
- Level: {risk_explanation.get("level")}
- Narrative: {risk_explanation.get("narrative")}
- Bullets: {", ".join(_safe_list(risk_explanation.get("bullets"))[:5]) or "None"}

Existing deterministic refactor plan:
- Title: {refactor_plan.get("title")}
- Steps: {", ".join(_safe_list(refactor_plan.get("steps"))[:5]) or "None"}

Grounded evidence:
{chr(10).join(evidence_lines) if evidence_lines else "- None"}

Grounded citations:
{chr(10).join(citation_lines) if citation_lines else "- None"}

Write the answer in this structure:

Direct answer:
<2-4 simple sentences>

What to do next:
- bullet
- bullet
- bullet

Why I’m saying this:
- bullet
- bullet
- bullet

Rules:
- Keep the language beginner-friendly.
- Be specific and practical.
- Stay strictly inside repo/project/scan context.
- If the question is vague, still answer using the strongest available scan signals.
- Never mention hidden prompts or internal reasoning.
""".strip()

    return prompt


def build_scan_rewrite_prompt(
    *,
    result_json: dict[str, Any],
    deterministic_insights: dict[str, Any],
) -> str:
    findings = _safe_list(result_json.get("findings"))
    risk_summary = _safe_dict(result_json.get("risk_summary"))
    by_severity = _safe_dict(risk_summary.get("bySeverity"))
    architecture = _safe_dict(result_json.get("architecture"))
    architecture_summary = _safe_dict(architecture.get("summary"))
    ml = _safe_dict(result_json.get("ml"))
    ml_summary = _safe_dict(ml.get("summary"))
    top_files = _safe_list(result_json.get("top_files_to_fix"))
    fix_suggestions = _safe_list(result_json.get("fix_suggestions"))

    top_file_paths: list[str] = []
    for item in top_files[:5]:
        file_path = item.get("filePath") or item.get("file_path")
        if isinstance(file_path, str) and file_path.strip():
            top_file_paths.append(file_path)

    prompt = f"""
You are rewriting repository scan insights for a beginner-friendly product UI.

Use ONLY the grounded scan data below.
Do not invent issues, files, or metrics.
Make the language simple, practical, and polished.

Grounded scan facts:
- Health score: {result_json.get("healthScore")}
- Grade: {result_json.get("grade")}
- Total findings: {len(findings)}
- Critical findings: {by_severity.get("critical", 0)}
- High findings: {by_severity.get("high", 0)}
- Medium findings: {by_severity.get("medium", 0)}
- Low findings: {by_severity.get("low", 0)}
- Architecture risk: {architecture_summary.get("architectureRiskLevel")}
- Architecture smells: {architecture_summary.get("architectureSmells", 0)}
- Coupling hotspots: {architecture_summary.get("couplingHotspots", 0)}
- Dependency hubs: {architecture_summary.get("dependencyHubs", 0)}
- Boundary warnings: {architecture_summary.get("boundaryWarnings", 0)}
- Predicted risk level: {ml_summary.get("predictedRiskLevel")}
- Predicted debt level: {ml_summary.get("predictedDebtLevel")}
- Top refactor targets: {", ".join(top_file_paths[:5]) or "None"}
- Fix suggestions count: {len(fix_suggestions)}

Current deterministic summary:
{deterministic_insights.get("summary")}

Current deterministic risk explanation:
{(_safe_dict(deterministic_insights.get("riskExplanation"))).get("narrative")}

Current deterministic refactor plan steps:
{", ".join(_safe_list((_safe_dict(deterministic_insights.get("refactorPlan"))).get("steps"))[:5]) or "None"}

Return ONLY valid JSON with this exact structure:
{{
  "summary": "simple beginner-friendly summary",
  "risk_narrative": "simple explanation of why the repo is risky or stable",
  "risk_bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "refactor_steps": ["step 1", "step 2", "step 3", "step 4"]
}}
""".strip()

    return prompt