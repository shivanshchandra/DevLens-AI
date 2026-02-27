# apps/backend/app/mock/results.py

from datetime import datetime

MOCK_RESULT_JSON = {
    "healthScore": 82,
    "grade": "B",
    "subScores": {
        "quality": 78,
        "security": 91,
        "maintainability": 76,
    },
    "metrics": {
        "files": 284,
        "loc": 35240,
        "languages": [
            {"name": "TypeScript", "percent": 58},
            {"name": "Python", "percent": 24},
            {"name": "Markdown", "percent": 10},
            {"name": "Other", "percent": 8},
        ],
        "complexityHotspots": [
            {"filePath": "apps/backend/app/api/routes/scans.py", "score": 78},
            {"filePath": "apps/frontend/components/analyze/repo-tab.tsx", "score": 71},
            {"filePath": "apps/frontend/components/scanning/scanning-client.tsx", "score": 63},
        ],
    },
    "findings": [
        {
            "id": "F-1",
            "type": "security",
            "severity": "critical",
            "title": "Hardcoded secret detected",
            "filePath": "apps/api/.env.example",
            "message": "Potential secret pattern found. Use environment variables and secret managers.",
        },
        {
            "id": "F-2",
            "type": "security",
            "severity": "high",
            "title": "Vulnerable dependency detected",
            "filePath": "package.json",
            "message": "Dependency matches a known advisory. Upgrade to a patched version.",
        },
        {
            "id": "F-3",
            "type": "quality",
            "severity": "medium",
            "title": "Lint warnings clustered",
            "filePath": "apps/frontend/components/analyze/repo-tab.tsx",
            "message": "Multiple warnings suggest missing validation and error boundaries.",
        },
        {
            "id": "F-4",
            "type": "quality",
            "severity": "low",
            "title": "Inconsistent naming",
            "filePath": "services/scanner/src/utils.ts",
            "message": "Consider consistent naming conventions and extracting constants.",
        },
        {
            "id": "F-5",
            "type": "complexity",
            "severity": "high",
            "title": "High cyclomatic complexity",
            "filePath": "services/scanner/src/core/pipeline.ts",
            "message": "Split into smaller functions and add tests around edge cases.",
        },
        {
            "id": "F-6",
            "type": "complexity",
            "severity": "medium",
            "title": "Large file size (low cohesion)",
            "filePath": "apps/frontend/app/dashboard/[scanId]/page.tsx",
            "message": "Break into smaller components for readability and reusability.",
        },
    ],
    "generatedAt": datetime.utcnow().isoformat() + "Z",
}