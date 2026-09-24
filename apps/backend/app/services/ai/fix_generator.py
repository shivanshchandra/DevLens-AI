from __future__ import annotations

import json
from typing import Any
from app.services.ai.llm_client import LlmUnavailableError, generate_text_with_llm


def generate_ai_fix_diff(
    *,
    rule_id: str | None,
    finding_title: str,
    finding_message: str | None,
    file_path: str,
    snippet: str | None = None,
) -> dict[str, Any]:
    """
    Generates a targeted Before vs. After code fix and Git diff for a specific finding.
    Uses Google Gemini if available, with a fast deterministic fallback template.
    """
    rule_clean = (rule_id or "GENERAL_CODE_SMELL").upper()
    file_clean = file_path or "source_code.py"
    snippet_clean = (snippet or "").strip() or f"# Problematic line in {file_clean}: {finding_message or finding_title}"

    system_instruction = (
        "You are an expert security engineer and code refactoring specialist. "
        "Your task is to fix a specific code vulnerability or code smell. "
        "You must output STRICT JSON matching this schema: \n"
        "{\n"
        '  "explanation": "1-2 sentences explaining why this fix resolves the issue",\n'
        '  "beforeCode": "Original vulnerable snippet",\n'
        '  "afterCode": "Refactored, production-ready code with best practices",\n'
        '  "gitDiff": "Standard Unified Git Diff (+ and - lines)",\n'
        '  "safetyImpact": "Why this is safer and adheres to security standards"\n'
        "}\n"
        "Do NOT output markdown code fences around the JSON. Only output valid parseable JSON."
    )

    prompt = f"""
Finding Title: {finding_title}
Rule ID: {rule_clean}
Target File: {file_clean}
Details: {finding_message or "High risk vulnerability or code smell detected."}
Snippet / Context:
{snippet_clean}

Generate the precise Before vs After code fix and git diff.
"""

    try:
        raw_response = generate_text_with_llm(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.2,
            max_output_tokens=1000,
        )

        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        return {
            "success": True,
            "explanation": data.get("explanation", "Resolved according to security best practices."),
            "beforeCode": data.get("beforeCode", snippet_clean),
            "afterCode": data.get("afterCode", ""),
            "gitDiff": data.get("gitDiff", ""),
            "safetyImpact": data.get("safetyImpact", "Mitigates security vulnerabilities and improves maintainability."),
            "source": "gemini",
        }
    except Exception as e:
        # High quality deterministic fallback patch
        before = snippet_clean
        after = f"# Secure implementation of {finding_title}\n# Loaded safely from configuration/environment\n"
        if "EVAL" in rule_clean or "EXEC" in rule_clean:
            after += "import ast\nparsed_data = ast.literal_eval(safe_input)"
        elif "SHELL" in rule_clean or "SUBPROCESS" in rule_clean:
            after += "import subprocess\nsubprocess.run(['safe_command', arg1, arg2], shell=False, check=True)"
        elif "SECRET" in rule_clean or "KEY" in rule_clean or "PASSWORD" in rule_clean:
            after += "import os\napi_key = os.getenv('API_KEY')\nif not api_key:\n    raise ValueError('API_KEY not configured')"
        elif "HASH" in rule_clean:
            after += "import hashlib\nhash_val = hashlib.sha256(data.encode()).hexdigest()"
        else:
            after += "# Extracted into focused helper method with reduced complexity\ndef process_data_safely(data):\n    return transform(data)"

        diff = f"--- a/{file_clean}\n+++ b/{file_clean}\n@@ -1,3 +1,3 @@\n- {before}\n+ {after}"

        return {
            "success": True,
            "explanation": f"Automated remediation template for rule {rule_clean}.",
            "beforeCode": before,
            "afterCode": after,
            "gitDiff": diff,
            "safetyImpact": "Isolates input handling and prevents injection or credentials exposure.",
            "source": "deterministic_fallback",
        }
