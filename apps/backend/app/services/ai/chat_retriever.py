from __future__ import annotations

from typing import Any


SUPPORTED_INTENTS = {
    "summary",
    "risk",
    "fix_priority",
    "quick_wins",
    "architecture",
    "security",
    "complexity",
    "technical_debt",
    "production_readiness",
    "files",
    "quality",
    "maintainability",
    "testing",
    "general_repo",
}

UNSUPPORTED_PATTERNS = [
    "weather",
    "temperature",
    "news",
    "world",
    "politics",
    "president",
    "prime minister",
    "stock price",
    "crypto",
    "bitcoin",
    "ipl",
    "football",
    "cricket",
    "movie",
    "song",
    "lyrics",
    "recipe",
    "travel",
    "restaurant",
    "joke",
    "who won",
    "today news",
]

INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("fix_priority", ["fix first", "what should i fix", "priority", "start with", "where should i start", "refactor first"]),
    ("quick_wins", ["quick win", "quick wins", "under 1 hour", "under 1 hr", "small changes", "easy improvements"]),
    ("risk", ["risky", "risk", "danger", "unsafe", "problematic", "fragile"]),
    ("security", ["security", "vulnerability", "vulnerabilities", "secret", "secrets", "token leak", "insecure"]),
    ("architecture", ["architecture", "coupling", "boundary", "dependency hub", "layering", "structure", "module design"]),
    ("complexity", ["complexity", "complex", "hotspot", "hotspots", "maintainability hotspot"]),
    ("technical_debt", ["technical debt", "debt", "cleanup burden", "maintenance pain"]),
    ("production_readiness", ["production", "deploy", "deployment", "release", "launch", "ship", "go live", "ready for prod"]),
    ("files", ["which files", "where is", "file", "files", "auth", "login", "jwt", "token", "configuration"]),
    ("quality", ["quality", "code quality", "standards", "cleanliness"]),
    ("maintainability", ["maintainability", "maintainable", "hard to maintain", "maintenance"]),
    ("testing", ["test", "tests", "testing", "coverage"]),
    ("summary", ["summary", "summarize", "overview", "plain language", "explain this scan", "simple summary"]),
]


KEYWORD_SECTION_MAP = {
    "risk": ["ai.riskExplanation", "risk_summary", "ml.summary", "top_files_to_fix", "findings"],
    "risky": ["ai.riskExplanation", "risk_summary", "ml.summary", "top_files_to_fix", "findings"],
    "security": ["findings", "fix_suggestions", "risk_summary"],
    "secret": ["findings", "fix_suggestions"],
    "dependency": ["architecture.summary", "architecture.dependencyHubs", "findings"],
    "dependencies": ["architecture.summary", "architecture.dependencyHubs", "findings"],
    "architecture": ["architecture.summary", "architecture.smells", "architecture.recommendations"],
    "coupling": ["architecture.couplingHotspots", "architecture.summary", "architecture.recommendations"],
    "boundary": ["architecture.boundaryWarnings", "architecture.summary", "architecture.recommendations"],
    "refactor": ["top_files_to_fix", "ai.refactorPlan", "fix_suggestions"],
    "fix": ["top_files_to_fix", "fix_suggestions", "ai.refactorPlan", "findings"],
    "files": ["top_files_to_fix", "findings", "fix_suggestions", "architecture.couplingHotspots"],
    "start": ["top_files_to_fix", "fix_suggestions", "ai.refactorPlan"],
    "summary": ["ai.summary", "ml.summary", "architecture.summary"],
    "overview": ["ai.summary", "ml.summary", "architecture.summary"],
    "debt": ["ml.summary", "ai.riskExplanation", "top_files_to_fix"],
    "quality": ["findings", "top_files_to_fix", "ml.summary"],
    "auth": ["findings", "top_files_to_fix", "fix_suggestions"],
    "login": ["findings", "top_files_to_fix", "fix_suggestions"],
    "token": ["findings", "fix_suggestions"],
    "jwt": ["findings", "fix_suggestions"],
    "complexity": ["metrics.complexityHotspots", "top_files_to_fix", "findings"],
    "production": ["risk_summary", "fix_suggestions", "top_files_to_fix", "architecture.summary"],
    "deploy": ["risk_summary", "fix_suggestions", "top_files_to_fix", "architecture.summary"],
    "launch": ["risk_summary", "fix_suggestions", "top_files_to_fix", "architecture.summary"],
}


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _tokenize(text: str) -> list[str]:
    return [part.strip(".,:;!?()[]{}\"'").lower() for part in text.split() if part.strip()]


def _contains_any(text: str, patterns: list[str]) -> bool:
    return any(pattern in text for pattern in patterns)


def _classify_question(question: str) -> tuple[str, str]:
    q = question.strip().lower()

    if not q:
        return "unsupported", "Please ask a question about this repository, scan, architecture, risk, fixes, or production readiness."

    if _contains_any(q, UNSUPPORTED_PATTERNS):
        return "unsupported", "This chat is designed for repository and scan questions only."

    for intent, patterns in INTENT_PATTERNS:
        if _contains_any(q, patterns):
            return intent, "supported"

    repo_words = [
        "repo",
        "repository",
        "project",
        "github",
        "scan",
        "codebase",
        "code",
        "app",
        "backend",
        "frontend",
        "module",
        "file",
        "files",
        "risk",
        "security",
        "architecture",
        "refactor",
        "deploy",
        "production",
        "health score",
        "grade",
    ]

    if _contains_any(q, repo_words):
        return "general_repo", "supported"

    return "unsupported", "This chat can answer questions about the scanned repository, app, codebase, and GitHub project only."


def _pick_top_paths(items: list[dict[str, Any]], limit: int = 5) -> list[str]:
    paths: list[str] = []
    seen: set[str] = set()

    for item in items:
        file_path = item.get("filePath") or item.get("file_path")
        if isinstance(file_path, str) and file_path.strip() and file_path not in seen:
            seen.add(file_path)
            paths.append(file_path)
        if len(paths) >= limit:
            break

    return paths


def _get_findings(result_json: dict[str, Any]) -> list[dict[str, Any]]:
    return _safe_list(result_json.get("findings"))


def _get_fix_suggestions(result_json: dict[str, Any]) -> list[dict[str, Any]]:
    raw = result_json.get("fix_suggestions")
    if isinstance(raw, list):
        return raw

    recommendations = _safe_dict(result_json.get("recommendations"))
    nested = recommendations.get("fixSuggestions")
    return _safe_list(nested)


def _get_top_files_to_fix(result_json: dict[str, Any]) -> list[dict[str, Any]]:
    raw = result_json.get("top_files_to_fix")
    if isinstance(raw, list):
        return raw

    recommendations = _safe_dict(result_json.get("recommendations"))
    nested = recommendations.get("topFilesToFix")
    return _safe_list(nested)


def _get_complexity_hotspots(result_json: dict[str, Any]) -> list[dict[str, Any]]:
    metrics = _safe_dict(result_json.get("metrics"))
    return _safe_list(metrics.get("complexityHotspots"))


def _get_risk_summary(result_json: dict[str, Any]) -> dict[str, Any]:
    return _safe_dict(result_json.get("risk_summary"))


def _get_ai(result_json: dict[str, Any]) -> dict[str, Any]:
    return _safe_dict(result_json.get("ai"))


def _get_ml(result_json: dict[str, Any]) -> dict[str, Any]:
    return _safe_dict(result_json.get("ml"))


def _get_architecture(result_json: dict[str, Any]) -> dict[str, Any]:
    return _safe_dict(result_json.get("architecture"))


def _repo_overview(result_json: dict[str, Any]) -> dict[str, Any]:
    ai = _get_ai(result_json)
    ml = _get_ml(result_json)
    architecture = _get_architecture(result_json)
    risk_summary = _get_risk_summary(result_json)
    findings = _get_findings(result_json)
    top_files = _get_top_files_to_fix(result_json)

    by_severity = _safe_dict(risk_summary.get("bySeverity"))
    ml_summary = _safe_dict(ml.get("summary"))
    architecture_summary = _safe_dict(architecture.get("summary"))

    health_score = _safe_float(result_json.get("healthScore"), 0.0)
    grade = _safe_str(result_json.get("grade"), "N/A")

    return {
        "healthScore": health_score,
        "grade": grade,
        "totalFindings": len(findings),
        "criticalCount": _safe_int(by_severity.get("critical"), 0),
        "highCount": _safe_int(by_severity.get("high"), 0),
        "mediumCount": _safe_int(by_severity.get("medium"), 0),
        "lowCount": _safe_int(by_severity.get("low"), 0),
        "architectureRiskLevel": _safe_str(architecture_summary.get("architectureRiskLevel"), "unknown"),
        "architectureSmells": _safe_int(architecture_summary.get("architectureSmells"), 0),
        "couplingHotspots": _safe_int(architecture_summary.get("couplingHotspots"), 0),
        "dependencyHubs": _safe_int(architecture_summary.get("dependencyHubs"), 0),
        "boundaryWarnings": _safe_int(architecture_summary.get("boundaryWarnings"), 0),
        "predictedRiskLevel": _safe_str(ml_summary.get("predictedRiskLevel"), "unknown"),
        "predictedDebtLevel": _safe_str(ml_summary.get("predictedDebtLevel"), "unknown"),
        "topRefactorTargets": _pick_top_paths(top_files, limit=5),
        "summary": _safe_str(ai.get("summary")),
    }


def _score_sections(question: str) -> list[str]:
    tokens = set(_tokenize(question))
    section_scores: dict[str, int] = {}

    for token in tokens:
        for section in KEYWORD_SECTION_MAP.get(token, []):
            section_scores[section] = section_scores.get(section, 0) + 3

    q = question.lower()
    if "what should i fix" in q or "fix first" in q:
        for section in ["top_files_to_fix", "fix_suggestions", "risk_summary", "findings"]:
            section_scores[section] = section_scores.get(section, 0) + 4

    if "quick win" in q or "under 1 hour" in q:
        for section in ["fix_suggestions", "top_files_to_fix", "findings"]:
            section_scores[section] = section_scores.get(section, 0) + 4

    if "production" in q or "deploy" in q or "launch" in q:
        for section in ["risk_summary", "fix_suggestions", "top_files_to_fix", "architecture.summary"]:
            section_scores[section] = section_scores.get(section, 0) + 4

    if not section_scores:
        section_scores = {
            "ai.summary": 1,
            "ai.riskExplanation": 1,
            "top_files_to_fix": 1,
            "fix_suggestions": 1,
        }

    return sorted(section_scores.keys(), key=lambda name: (-section_scores[name], name))[:6]


def _append_citation(
    citations: list[dict[str, Any]],
    *,
    citation_type: str,
    label: str,
    file_path: str | None = None,
    section: str | None = None,
    reason: str | None = None,
) -> None:
    citations.append(
        {
            "type": citation_type,
            "label": label,
            "filePath": file_path,
            "section": section,
            "reason": reason,
        }
    )


def _collect_evidence(result_json: dict[str, Any], matched_sections: list[str]) -> tuple[list[str], list[dict[str, Any]]]:
    evidence: list[str] = []
    citations: list[dict[str, Any]] = []

    ai = _get_ai(result_json)
    ml = _get_ml(result_json)
    architecture = _get_architecture(result_json)
    risk_summary = _get_risk_summary(result_json)
    findings = _get_findings(result_json)
    fix_suggestions = _get_fix_suggestions(result_json)
    top_files = _get_top_files_to_fix(result_json)
    complexity_hotspots = _get_complexity_hotspots(result_json)

    if "ai.summary" in matched_sections and ai.get("summary"):
        evidence.append(_safe_str(ai.get("summary")))
        _append_citation(
            citations,
            citation_type="section",
            label="AI Summary",
            section="ai.summary",
            reason="matched scan summary",
        )

    if "ai.riskExplanation" in matched_sections:
        risk_explanation = _safe_dict(ai.get("riskExplanation"))
        narrative = _safe_str(risk_explanation.get("narrative"))
        bullets = _safe_list(risk_explanation.get("bullets"))

        if narrative:
            evidence.append(narrative)
        for bullet in bullets[:3]:
            evidence.append(_safe_str(bullet))

        if narrative or bullets:
            _append_citation(
                citations,
                citation_type="section",
                label="AI Risk Explanation",
                section="ai.riskExplanation",
                reason="matched risk explanation",
            )

    if "ml.summary" in matched_sections:
        ml_summary = _safe_dict(ml.get("summary"))
        if ml_summary:
            evidence.append(
                f"ML signals predict risk {ml_summary.get('predictedRiskLevel', 'unknown')} and technical debt {ml_summary.get('predictedDebtLevel', 'unknown')}."
            )
            _append_citation(
                citations,
                citation_type="section",
                label="ML Summary",
                section="ml.summary",
                reason="matched ML signals",
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
        _append_citation(
            citations,
            citation_type="section",
            label="Risk Summary",
            section="risk_summary",
            reason="matched severity summary",
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
            _append_citation(
                citations,
                citation_type="section",
                label="Architecture Summary",
                section="architecture.summary",
                reason="matched architecture overview",
            )

    if "architecture.smells" in matched_sections:
        smells = _safe_list(architecture.get("smells"))
        for smell in smells[:3]:
            title = _safe_str(smell.get("title"), "Architecture smell")
            message = _safe_str(smell.get("message"))
            recommendation = _safe_str(smell.get("recommendation"))
            evidence.append(f"{title}: {message} {recommendation}".strip())
        if smells:
            _append_citation(
                citations,
                citation_type="section",
                label="Architecture Smells",
                section="architecture.smells",
                reason="matched structural issues",
            )

    if "architecture.recommendations" in matched_sections:
        recommendations = _safe_list(architecture.get("recommendations"))
        for item in recommendations[:3]:
            evidence.append(_safe_str(item))
        if recommendations:
            _append_citation(
                citations,
                citation_type="section",
                label="Architecture Recommendations",
                section="architecture.recommendations",
                reason="matched architecture guidance",
            )

    if "architecture.couplingHotspots" in matched_sections:
        coupling_hotspots = _safe_list(architecture.get("couplingHotspots"))
        for item in coupling_hotspots[:3]:
            file_path = _safe_str(item.get("filePath"))
            reasons = _safe_list(item.get("reasons"))
            if file_path:
                evidence.append(
                    f"Coupling hotspot: {file_path}" + (f" ({_safe_str(reasons[0])})" if reasons else "")
                )
                _append_citation(
                    citations,
                    citation_type="file",
                    label=file_path,
                    file_path=file_path,
                    reason="coupling hotspot",
                )

    if "architecture.dependencyHubs" in matched_sections:
        dependency_hubs = _safe_list(architecture.get("dependencyHubs"))
        for item in dependency_hubs[:3]:
            file_path = _safe_str(item.get("filePath"))
            reasons = _safe_list(item.get("reasons"))
            if file_path:
                evidence.append(
                    f"Dependency hub: {file_path}" + (f" ({_safe_str(reasons[0])})" if reasons else "")
                )
                _append_citation(
                    citations,
                    citation_type="file",
                    label=file_path,
                    file_path=file_path,
                    reason="dependency hub",
                )

    if "architecture.boundaryWarnings" in matched_sections:
        boundary_warnings = _safe_list(architecture.get("boundaryWarnings"))
        for item in boundary_warnings[:3]:
            source = _safe_str(item.get("sourceDirectory"))
            target = _safe_str(item.get("targetDirectory"))
            message = _safe_str(item.get("message"))
            evidence.append(f"Boundary warning: {source} -> {target}. {message}".strip())
        if boundary_warnings:
            _append_citation(
                citations,
                citation_type="section",
                label="Boundary Warnings",
                section="architecture.boundaryWarnings",
                reason="matched boundary issues",
            )

    if "metrics.complexityHotspots" in matched_sections:
        for item in complexity_hotspots[:3]:
            file_path = _safe_str(item.get("filePath"))
            score = item.get("score")
            if file_path:
                evidence.append(f"Complexity hotspot: {file_path} (score={score})")
                _append_citation(
                    citations,
                    citation_type="file",
                    label=file_path,
                    file_path=file_path,
                    reason="complexity hotspot",
                )

    if "top_files_to_fix" in matched_sections:
        for item in top_files[:5]:
            file_path = _safe_str(item.get("filePath"))
            reasons = _safe_list(item.get("reasons"))
            recommended_action = _safe_str(item.get("recommendedAction"))
            if file_path:
                detail = reasons[0] if reasons else recommended_action or "priority refactor target"
                evidence.append(f"Top refactor target: {file_path} ({detail})")
                _append_citation(
                    citations,
                    citation_type="file",
                    label=file_path,
                    file_path=file_path,
                    reason="top refactor target",
                )

    if "fix_suggestions" in matched_sections:
        for item in fix_suggestions[:4]:
            title = _safe_str(item.get("title"), "Suggested remediation")
            file_path = _safe_str(item.get("filePath"))
            recommended_action = _safe_str(item.get("recommendedAction") or item.get("action"))
            priority = _safe_str(item.get("priority") or item.get("severity"))
            evidence.append(
                f"{title}" +
                (f" in {file_path}" if file_path else "") +
                (f": {recommended_action}" if recommended_action else "") +
                (f" [{priority}]" if priority else "")
            )
            _append_citation(
                citations,
                citation_type="file" if file_path else "section",
                label=file_path or title,
                file_path=file_path or None,
                section=None if file_path else "fix_suggestions",
                reason="fix suggestion",
            )

    if "findings" in matched_sections:
        for item in findings[:5]:
            file_path = _safe_str(item.get("filePath"))
            title = _safe_str(item.get("title"), "Finding")
            severity = _safe_str(item.get("severity"), "unknown")
            evidence.append(f"{severity} finding in {file_path or 'unknown file'}: {title}")
            _append_citation(
                citations,
                citation_type="file" if file_path else "section",
                label=file_path or title,
                file_path=file_path or None,
                section=None if file_path else "findings",
                reason="matched finding",
            )

    deduped_citations: list[dict[str, Any]] = []
    seen: set[tuple[Any, ...]] = set()

    for item in citations:
        key = (item.get("type"), item.get("label"), item.get("filePath"), item.get("section"))
        if key in seen:
            continue
        seen.add(key)
        deduped_citations.append(item)

    return evidence[:14], deduped_citations[:10]


def _suggested_questions(intent: str) -> list[str]:
    base = [
        "What should I fix first?",
        "What are the quickest improvements I can make?",
        "Why is this repo risky?",
        "What are the biggest architecture problems?",
        "Is this project ready for production?",
    ]

    by_intent = {
        "security": [
            "What is the biggest security concern?",
            "Which security issues should I handle before deployment?",
        ],
        "architecture": [
            "Which modules look structurally weak?",
            "Where is coupling highest in this repo?",
        ],
        "fix_priority": [
            "Which files should I fix first?",
            "What should a junior developer start with?",
        ],
        "quick_wins": [
            "What can I improve in under 1 hour?",
            "What are the easiest high-impact cleanups?",
        ],
        "production_readiness": [
            "What should I clean before launching?",
            "What blocks this repo from being production-ready?",
        ],
    }

    extra = by_intent.get(intent, [])
    merged: list[str] = []
    seen: set[str] = set()

    for item in extra + base:
        if item not in seen:
            seen.add(item)
            merged.append(item)

    return merged[:6]


def retrieve_chat_context(result_json: dict, question: str) -> dict:
    intent, scope_state = _classify_question(question)
    matched_sections = _score_sections(question) if intent in SUPPORTED_INTENTS else []

    overview = _repo_overview(result_json)

    if intent in SUPPORTED_INTENTS:
        evidence, citations = _collect_evidence(result_json, matched_sections)
    else:
        evidence, citations = [], []

    top_files = overview.get("topRefactorTargets") or []

    quick_wins: list[str] = []
    for item in _get_fix_suggestions(result_json)[:5]:
        title = _safe_str(item.get("title"))
        action = _safe_str(item.get("recommendedAction") or item.get("action"))
        if title or action:
            quick_wins.append(f"{title}: {action}".strip(": "))

    confidence = "medium"
    if intent == "unsupported":
        confidence = "low"
    elif len(citations) >= 6 and len(evidence) >= 6:
        confidence = "high"
    elif len(citations) <= 2 or len(evidence) <= 2:
        confidence = "low"

    scope_note = (
        "This chat is designed for questions about the scanned repository, codebase, app, architecture, findings, fixes, and production readiness."
        if intent == "unsupported"
        else "Answers are grounded in the current scan result, including findings, ML signals, architecture analysis, and fix suggestions."
    )

    return {
        "question": question,
        "intent": intent,
        "status": scope_state,
        "is_supported": intent in SUPPORTED_INTENTS,
        "scopeNote": scope_note,
        "matchedSections": matched_sections,
        "overview": overview,
        "evidence": evidence,
        "citations": citations,
        "confidence": confidence,
        "topFiles": top_files[:5],
        "quickWins": quick_wins[:5],
        "suggestedQuestions": _suggested_questions(intent),
    }