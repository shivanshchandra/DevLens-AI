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

    ai_simple_summary = str(ai.get("simpleSummary") or "").strip()
    risk_explanation = _safe_dict(ai.get("riskExplanation"))
    refactor_plan = _safe_dict(ai.get("refactorPlan"))

    prompt = f"""
You are DevLens AI — a smart, friendly engineering mentor built into a repository analysis tool.

A developer has just scanned their repository and is now asking you a question about it.
Your job is to give them a clear, honest, helpful answer that:
- Directly answers their question in plain English
- Explains what the scan data actually means for them
- Tells them exactly what to do next, in order of priority
- Feels like advice from a senior engineer, not a robot reading out numbers

GROUND RULES:
- Only use the scan data provided below. Never invent files, metrics, or issues.
- If the scan data does not contain enough information for a specific answer, say so honestly and use what you have.
- Write in plain English. If you use a technical term (coupling, dependency hub, etc.), explain it briefly.
- Be specific. Mention actual numbers and file names from the data when they are available.
- Do not repeat the question back to the user. Just answer it.
- Minimum 3 complete paragraphs or a mix of paragraph + bullet list. Short one-liners are not acceptable.

DEVELOPER QUESTION:
{question}

DETECTED INTENT: {intent}

SCAN FACTS (reference these in your answer):
- Programming Languages used: {quick.get("languages") or "Not detected"}
- Total files profiled: {quick.get("totalFiles", 0)}
- Health score: {quick.get("healthScore")} / 100
- Grade: {quick.get("grade")}
- Total findings: {quick.get("totalFindings")}
- Critical findings: {quick.get("criticalCount")} (most urgent — fix these first)
- High-severity findings: {quick.get("highCount")}
- Medium findings: {quick.get("mediumCount")}
- Architecture risk level: {quick.get("architectureRiskLevel")}
- Architecture smells: {quick.get("architectureSmells")}
- Coupling hotspots: {quick.get("couplingHotspots")} (files too connected to others)
- Dependency hubs: {quick.get("dependencyHubs")} (files many others depend on)
- Boundary warnings: {quick.get("boundaryWarnings")}
- ML predicted risk: {quick.get("predictedRiskLevel")}
- ML predicted technical debt: {quick.get("predictedDebtLevel")}
- Top priority files: {", ".join(_safe_list(quick.get("topFiles"))[:5]) or "None identified"}

AI-GENERATED SUMMARY (from scan engine — use for context):
{ai_simple_summary or "Not available"}

RISK EXPLANATION FROM SCAN:
- Level: {risk_explanation.get("level")}
- Narrative: {risk_explanation.get("narrative")}
- Key signals: {", ".join(_safe_list(risk_explanation.get("bullets"))[:4]) or "None"}

REFACTOR PLAN FROM SCAN:
- Steps: {", ".join(_safe_list(refactor_plan.get("steps"))[:4]) or "None"}

GROUNDED EVIDENCE FOR THIS QUESTION:
{chr(10).join(evidence_lines) if evidence_lines else "- No specific evidence matched for this question."}

CITED SECTIONS:
{chr(10).join(citation_lines) if citation_lines else "- None"}

NOW WRITE YOUR ANSWER using this structure:

**Direct Answer** (1–2 sentences: answer the question directly)

**What This Means For You** (1–3 sentences: explain what these scan signals mean in plain words for this developer's specific situation)

**What To Do Next** (a numbered list of 3–5 specific, actionable steps in priority order)

**Why This Matters** (1–2 sentences: explain the consequence of not addressing this, or the benefit of fixing it)

Keep language simple, warm, and practical. Never sound robotic.
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

    arch_smells = int(architecture_summary.get("architectureSmells") or 0)
    coupling = int(architecture_summary.get("couplingHotspots") or 0)
    dep_hubs = int(architecture_summary.get("dependencyHubs") or 0)
    boundary = int(architecture_summary.get("boundaryWarnings") or 0)
    critical = int(by_severity.get("critical") or 0)
    high = int(by_severity.get("high") or 0)
    medium = int(by_severity.get("medium") or 0)
    health_score = result_json.get("healthScore") or 0
    grade = result_json.get("grade") or "N/A"
    arch_risk = architecture_summary.get("architectureRiskLevel") or "unknown"
    predicted_risk = ml_summary.get("predictedRiskLevel") or "unknown"
    predicted_debt = ml_summary.get("predictedDebtLevel") or "unknown"

    det_summary = deterministic_insights.get("summary") or ""
    det_risk_narrative = (_safe_dict(deterministic_insights.get("riskExplanation"))).get("narrative") or ""
    det_refactor_steps = ", ".join(
        _safe_list((_safe_dict(deterministic_insights.get("refactorPlan"))).get("steps"))[:5]
    ) or "None"

    prompt = f"""
You are writing a detailed, beginner-friendly scan report summary for a developer dashboard product called DevLens AI.

Your job is to take the grounded scan facts below and rewrite them into clear, warm, human-readable insights.
The developer reading this may be a junior or mid-level developer. Write like a senior engineer explaining to a teammate — honest, helpful, not scary.

STRICT RULES:
- Use ONLY the data provided below. Do not invent files, metrics, or issues.
- Write in plain English. Avoid jargon where possible. If you use a technical term, explain it in the same sentence.
- The summary must be 4–6 sentences minimum. It must explain: what the health score means, what the main risks are, what the architecture signals mean, and what the developer should focus on first.
- risk_narrative must be 3–4 sentences. Explain WHY the repo is risky or stable in plain words.
- risk_bullets must be 4–5 bullet points. Each one must be a complete sentence that explains a specific signal from the scan.
- refactor_steps must be 4–6 steps. Each step must be a clear action sentence telling the developer exactly what to do.

SCAN DATA (use only this):
- Health score: {health_score} (out of 100)
- Grade: {grade}
- Total findings: {len(findings)}
- Critical findings: {critical} (these are the most urgent — secrets exposed, severe vulnerabilities)
- High-severity findings: {high} (important bugs or security issues)
- Medium-severity findings: {medium}
- Architecture risk level: {arch_risk}
- Architecture smells detected: {arch_smells} (design problems in how the code is structured)
- Coupling hotspots: {coupling} (files that are too tightly connected to too many other files)
- Dependency hubs: {dep_hubs} (files that many other files depend on — risky if they break)
- Boundary warnings: {boundary} (code crossing module boundaries in unsafe ways)
- ML predicted risk: {predicted_risk}
- ML predicted technical debt: {predicted_debt}
- Top files to fix: {", ".join(top_file_paths[:5]) or "None identified"}
- Fix suggestions count: {len(fix_suggestions)}

DETERMINISTIC BASELINE (you must expand and improve these, not copy them):
- Baseline summary: {det_summary}
- Baseline risk narrative: {det_risk_narrative}
- Baseline refactor steps: {det_refactor_steps}

Return ONLY valid JSON. No markdown, no explanation text outside the JSON. Use this exact structure:
{{
  "summary": "A 4 to 6 sentence beginner-friendly explanation of this scan result. Cover what the health score means, the main risk drivers, what the architecture signals indicate, and what to focus on first.",
  "risk_narrative": "A 3 to 4 sentence plain-English explanation of why this repository is currently risky or stable, based only on the scan signals above.",
  "risk_bullets": [
    "Complete sentence explaining one specific scan signal and why it matters.",
    "Complete sentence explaining another signal.",
    "Complete sentence explaining another signal.",
    "Complete sentence explaining another signal."
  ],
  "refactor_steps": [
    "Step 1 as a clear action sentence.",
    "Step 2 as a clear action sentence.",
    "Step 3 as a clear action sentence.",
    "Step 4 as a clear action sentence.",
    "Step 5 as a clear action sentence."
  ]
}}
""".strip()

    return prompt