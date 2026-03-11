from __future__ import annotations


def _priority_from_severity(severity: str | None) -> str:
    value = str(severity or "").lower()
    if value == "critical":
        return "urgent"
    if value == "high":
        return "high"
    if value == "medium":
        return "medium"
    return "normal"


def _suggestion_for_rule(rule_id: str | None, finding_type: str | None) -> tuple[str, str, str | None]:
    rule = str(rule_id or "").upper()
    ftype = str(finding_type or "").lower()

    if rule == "CYCLO_COMPLEXITY":
        return (
            "Refactor complex function into smaller focused helpers and reduce nested branching.",
            "Split decision-heavy logic into smaller functions, isolate edge-case handling, and add targeted tests around each branch.",
            "Consider extracting validation, transformation, and response-building into separate helpers.",
        )

    if rule == "UNSAFE_EVAL":
        return (
            "Remove eval() usage and replace it with explicit parsing or a safe dispatch mechanism.",
            "eval() can execute arbitrary code. Prefer structured parsing, allowlists, or mapping inputs to known handlers.",
            "Use json parsing, ast.literal_eval for trusted literal-only cases, or a predefined function map.",
        )

    if rule == "UNSAFE_EXEC":
        return (
            "Avoid exec() and replace dynamic code execution with explicit program logic.",
            "exec() introduces arbitrary code execution risk and makes code harder to audit and test.",
            "Move behavior into normal functions, registries, or strategy objects instead of runtime code execution.",
        )

    if rule == "UNSAFE_SUBPROCESS_SHELL_TRUE":
        return (
            "Avoid subprocess shell=True and pass arguments as a list instead.",
            "shell=True increases command injection risk when user-controlled values reach the command string.",
            "Use subprocess.run(['cmd', 'arg1', 'arg2'], shell=False, check=True).",
        )

    if rule in {"WEAK_HASH_MD5", "WEAK_HASH_SHA1"}:
        return (
            "Replace weak hashing with a stronger algorithm such as SHA-256 where security matters.",
            "MD5 and SHA1 are not suitable for security-sensitive integrity or cryptographic use.",
            "Use hashlib.sha256() or stronger, depending on the use case.",
        )

    if rule in {"PRIVATE_KEY", "AWS_ACCESS_KEY_ID", "GENERIC_API_KEY", "PASSWORD_ASSIGN", "HARDCODED_PASSWORD", "HARDCODED_TOKEN", "PRIVATE_KEY_BLOCK"}:
        return (
            "Remove hardcoded secret material from source code and load it from environment variables or a secret manager.",
            "Secrets in code can leak through source control, logs, screenshots, and shared artifacts.",
            "Rotate exposed credentials, move them to env vars or a vault, and add ignore rules for secret files.",
        )

    if rule == "OSV" or ftype == "dependency":
        return (
            "Upgrade the vulnerable dependency to a patched version after reviewing changelog impact.",
            "Known vulnerable packages can expose the project to publicly documented exploits.",
            "Pin to a patched release, verify compatibility, and retest affected flows after upgrade.",
        )

    if ftype == "security":
        return (
            "Review this security finding and remove unsafe patterns before merge.",
            "Security findings should be resolved early because they can expand blast radius if merged.",
            None,
        )

    if ftype == "quality":
        return (
            "Refactor or simplify the flagged code to improve maintainability.",
            "Quality issues increase maintenance cost and make future changes riskier.",
            None,
        )

    if ftype == "risk":
        return (
            "Replace the risky pattern with a safer, more explicit implementation.",
            "Risk findings often indicate fragile or unsafe implementation choices.",
            None,
        )

    return (
        "Review this finding and apply an appropriate remediation based on the affected code path.",
        "This issue should be addressed to reduce future risk and maintenance cost.",
        None,
    )


def build_fix_suggestions(findings: list[dict], limit: int = 25) -> list[dict]:
    """
    Convert findings into user-facing remediation suggestions.

    Output shape:
    [
        {
            "findingId": "...",
            "filePath": "...",
            "title": "...",
            "priority": "urgent|high|medium|normal",
            "why": "...",
            "recommendedAction": "...",
            "saferAlternative": "..." | None
        }
    ]
    """
    suggestions: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    for finding in findings:
        finding_id = str(finding.get("id") or "")
        rule_id = str(finding.get("ruleId") or "")
        finding_type = str(finding.get("type") or "")
        severity = str(finding.get("severity") or "")
        file_path = str(finding.get("filePath") or "")
        title = str(finding.get("title") or "Suggested remediation")

        recommended_action, why, safer_alternative = _suggestion_for_rule(rule_id, finding_type)
        priority = _priority_from_severity(severity)

        dedupe_key = (file_path, rule_id, recommended_action)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        suggestions.append(
            {
                "findingId": finding_id,
                "filePath": file_path,
                "title": title,
                "priority": priority,
                "why": why,
                "recommendedAction": recommended_action,
                "saferAlternative": safer_alternative,
            }
        )

        if len(suggestions) >= limit:
            break

    return suggestions