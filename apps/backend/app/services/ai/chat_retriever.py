from __future__ import annotations

from typing import Any


KEYWORD_SECTION_MAP = {
    "risk": ["ai.riskExplanation", "risk_summary", "ml.summary", "top_files_to_fix"],
    "risky": ["ai.riskExplanation", "risk_summary", "ml.summary", "top_files_to_fix"],
    "security": ["findings", "fix_suggestions", "risk_summary"],
    "secret": ["findings", "fix_suggestions"],
    "dependency": ["architecture.summary", "architecture.dependencyHubs", "findings"],
    "dependencies": ["architecture.summary", "architecture.dependencyHubs", "findings"],
    "architecture": ["architecture.summary", "architecture.smells", "architecture.recommendations"],
    "coupling": ["architecture.couplingHotspots", "architecture.summary"],
    "boundary": ["architecture.boundaryWarnings", "architecture.summary"],
    "refactor": ["top_files_to_fix", "ai.refactorPlan", "fix_suggestions"],
    "fix": ["top_files_to_fix", "fix_suggestions", "ai.refactorPlan"],
    "files": ["top_files_to_fix", "findings"],
    "start": ["top_files_to_fix", "fix_suggestions", "ai.refactorPlan"],
    "summary": ["ai.summary", "ml.summary", "architecture.summary"],
    "overview": ["ai.summary", "ml.summary", "architecture.summary"],
    "debt": ["ml.summary", "ai.riskExplanation", "top_files_to_fix"],
    "quality": ["findings", "top_files_to_fix"],
    "auth": ["findings", "top_files_to_fix", "fix_suggestions"],
    "login": ["findings", "top_files_to_fix", "fix_suggestions"],
    "token": ["findings", "fix_suggestions"],
    "jwt": ["findings", "fix_suggestions"],
}


def _tokenize(text: str) -> list[str]:
    return [part.strip(".,:;!?()[]{}\"'").lower() for part in text.split() if part.strip()]


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def retrieve_chat_context(result_json: dict, question: str) -> dict:
    tokens = set(_tokenize(question))

    section_scores: dict[str, int] = {}
    for token in tokens:
        for section in KEYWORD_SECTION_MAP.get(token, []):
            section_scores[section] = section_scores.get(section, 0) + 3

    if not section_scores:
        section_scores = {
            "ai.summary": 1,
            "ai.riskExplanation": 1,
            "top_files_to_fix": 1,
        }

    matched_sections = sorted(
        section_scores.keys(),
        key=lambda name: (-section_scores[name], name),
    )[:5]

    citations: list[dict[str, Any]] = []
    evidence: list[str] = []

    ai = _safe_dict(result_json.get("ai"))
    ml = _safe_dict(result_json.get("ml"))
    architecture = _safe_dict(result_json.get("architecture"))
    risk_summary = _safe_dict(result_json.get("risk_summary"))

    findings = _safe_list(result_json.get("findings"))
    fix_suggestions = _safe_list(result_json.get("fix_suggestions"))
    top_files = _safe_list(result_json.get("top_files_to_fix"))

    if "ai.summary" in matched_sections and ai.get("summary"):
        evidence.append(str(ai["summary"]))
        citations.append(
            {
                "type": "section",
                "label": "AI Summary",
                "section": "ai.summary",
                "reason": "matched scan narrative",
            }
        )

    if "ai.riskExplanation" in matched_sections and isinstance(ai.get("riskExplanation"), dict):
        risk_explanation = ai["riskExplanation"]
        narrative = str(risk_explanation.get("narrative") or "")
        bullets = risk_explanation.get("bullets") or []
        if narrative:
            evidence.append(narrative)
        for bullet in bullets[:3]:
            evidence.append(str(bullet))
        citations.append(
            {
                "type": "section",
                "label": "AI Risk Explanation",
                "section": "ai.riskExplanation",
                "reason": "matched risk question",
            }
        )

    if "ml.summary" in matched_sections:
        ml_summary = ml.get("summary")
        if isinstance(ml_summary, dict):
            predicted_risk = ml_summary.get("predictedRiskLevel")
            predicted_debt = ml_summary.get("predictedDebtLevel")
            evidence.append(
                f"ML predicts risk level {predicted_risk or 'unknown'} and debt level {predicted_debt or 'unknown'}."
            )
            citations.append(
                {
                    "type": "section",
                    "label": "ML Summary",
                    "section": "ml.summary",
                    "reason": "matched ML signal",
                }
            )

    if "risk_summary" in matched_sections:
        by_severity = _safe_dict(risk_summary.get("bySeverity"))
        evidence.append(
            "Severity counts: "
            f"critical={by_severity.get('critical', 0)}, "
            f"high={by_severity.get('high', 0)}, "
            f"medium={by_severity.get('medium', 0)}, "
            f"low={by_severity.get('low', 0)}."
        )
        citations.append(
            {
                "type": "section",
                "label": "Risk Summary",
                "section": "risk_summary",
                "reason": "matched severity summary",
            }
        )

    if "architecture.summary" in matched_sections:
        summary = _safe_dict(architecture.get("summary"))
        if summary:
            evidence.append(
                "Architecture summary: "
                f"risk={summary.get('architectureRiskLevel', 'unknown')}, "
                f"smells={summary.get('architectureSmells', 0)}, "
                f"couplingHotspots={summary.get('couplingHotspots', 0)}, "
                f"dependencyHubs={summary.get('dependencyHubs', 0)}, "
                f"boundaryWarnings={summary.get('boundaryWarnings', 0)}."
            )
            citations.append(
                {
                    "type": "section",
                    "label": "Architecture Summary",
                    "section": "architecture.summary",
                    "reason": "matched architecture question",
                }
            )

    if "architecture.smells" in matched_sections:
        smells = _safe_list(architecture.get("smells"))
        for smell in smells[:3]:
            title = smell.get("title") or "Architecture smell"
            message = smell.get("message") or ""
            evidence.append(f"{title}: {message}")
        if smells:
            citations.append(
                {
                    "type": "section",
                    "label": "Architecture Smells",
                    "section": "architecture.smells",
                    "reason": "matched structural issues",
                }
            )

    if "architecture.recommendations" in matched_sections:
        recommendations = _safe_list(architecture.get("recommendations"))
        for item in recommendations[:3]:
            evidence.append(str(item))
        if recommendations:
            citations.append(
                {
                    "type": "section",
                    "label": "Architecture Recommendations",
                    "section": "architecture.recommendations",
                    "reason": "matched architecture guidance",
                }
            )

    if "architecture.couplingHotspots" in matched_sections:
        coupling_hotspots = _safe_list(architecture.get("couplingHotspots"))
        for item in coupling_hotspots[:3]:
            file_path = str(item.get("filePath") or "")
            if file_path:
                evidence.append(f"Coupling hotspot: {file_path}")
                citations.append(
                    {
                        "type": "file",
                        "label": file_path,
                        "filePath": file_path,
                        "reason": "coupling hotspot",
                    }
                )

    if "architecture.dependencyHubs" in matched_sections:
        dependency_hubs = _safe_list(architecture.get("dependencyHubs"))
        for item in dependency_hubs[:3]:
            file_path = str(item.get("filePath") or "")
            if file_path:
                evidence.append(f"Dependency hub: {file_path}")
                citations.append(
                    {
                        "type": "file",
                        "label": file_path,
                        "filePath": file_path,
                        "reason": "dependency hub",
                    }
                )

    if "architecture.boundaryWarnings" in matched_sections:
        boundary_warnings = _safe_list(architecture.get("boundaryWarnings"))
        for item in boundary_warnings[:3]:
            source = str(item.get("sourceDirectory") or "")
            target = str(item.get("targetDirectory") or "")
            message = str(item.get("message") or "")
            evidence.append(f"Boundary warning: {source} -> {target}. {message}".strip())
        if boundary_warnings:
            citations.append(
                {
                    "type": "section",
                    "label": "Boundary Warnings",
                    "section": "architecture.boundaryWarnings",
                    "reason": "matched boundary issue",
                }
            )

    if "top_files_to_fix" in matched_sections:
        for item in top_files[:5]:
            file_path = str(item.get("filePath") or "")
            if file_path:
                reasons = item.get("reasons") or []
                first_reason = str(reasons[0]) if reasons else "priority refactor target"
                evidence.append(f"Top refactor target: {file_path} ({first_reason})")
                citations.append(
                    {
                        "type": "file",
                        "label": file_path,
                        "filePath": file_path,
                        "reason": "top_files_to_fix",
                    }
                )

    if "fix_suggestions" in matched_sections:
        for item in fix_suggestions[:3]:
            title = str(item.get("title") or "Suggested remediation")
            file_path = str(item.get("filePath") or "")
            recommended_action = str(item.get("recommendedAction") or "")
            evidence.append(f"{title} in {file_path}: {recommended_action}".strip())
            citations.append(
                {
                    "type": "file" if file_path else "section",
                    "label": file_path or title,
                    "filePath": file_path or None,
                    "section": None if file_path else "fix_suggestions",
                    "reason": "fix suggestion",
                }
            )

    if "findings" in matched_sections:
        for item in findings[:5]:
            file_path = str(item.get("filePath") or "")
            title = str(item.get("title") or "Finding")
            severity = str(item.get("severity") or "unknown")
            if file_path or title:
                evidence.append(f"{severity} finding in {file_path or 'unknown file'}: {title}")
                citations.append(
                    {
                        "type": "file" if file_path else "section",
                        "label": file_path or title,
                        "filePath": file_path or None,
                        "section": None if file_path else "findings",
                        "reason": "matched finding",
                    }
                )

    deduped_citations: list[dict[str, Any]] = []
    seen = set()
    for item in citations:
        key = (item.get("type"), item.get("label"), item.get("filePath"), item.get("section"))
        if key in seen:
            continue
        seen.add(key)
        deduped_citations.append(item)

    confidence = "medium"
    if len(deduped_citations) >= 5:
        confidence = "high"
    elif len(deduped_citations) <= 2:
        confidence = "low"

    return {
        "question": question,
        "matchedSections": matched_sections,
        "evidence": evidence[:12],
        "citations": deduped_citations[:8],
        "confidence": confidence,
    }