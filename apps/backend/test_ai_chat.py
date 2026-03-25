from app.services.ai.chat_generator import generate_chat_answer
from app.services.ai.chat_retriever import retrieve_chat_context


def _sample_result():
    return {
        "ai": {
            "summary": "The repository shows moderate-to-high delivery risk because critical refactor targets and architecture pressure are concentrated in a few core files.",
            "riskExplanation": {
                "level": "high",
                "narrative": "Risk is elevated due to architecture pressure and high-severity findings.",
                "bullets": [
                    "High-severity findings are concentrated in app/services/auth.py.",
                    "Coupling hotspots increase change risk.",
                ],
            },
            "refactorPlan": {
                "steps": [
                    "Stabilize app/services/auth.py first.",
                    "Reduce coupling in app/api/routes/login.py.",
                ]
            },
        },
        "ml": {
            "summary": {
                "predictedRiskLevel": "high",
                "predictedDebtLevel": "medium",
            }
        },
        "risk_summary": {
            "bySeverity": {
                "critical": 0,
                "high": 3,
                "medium": 2,
                "low": 1,
            }
        },
        "top_files_to_fix": [
            {
                "filePath": "app/services/auth.py",
                "reasons": ["high finding density", "production application path"],
            },
            {
                "filePath": "app/api/routes/login.py",
                "reasons": ["coupling hotspot"],
            },
        ],
        "fix_suggestions": [
            {
                "filePath": "app/services/auth.py",
                "title": "Remove unsafe token handling",
                "recommendedAction": "Replace unsafe token parsing with explicit validation.",
            }
        ],
        "findings": [
            {
                "filePath": "app/services/auth.py",
                "title": "Unsafe token parsing",
                "severity": "high",
            }
        ],
        "architecture": {
            "summary": {
                "architectureRiskLevel": "high",
                "architectureSmells": 2,
                "couplingHotspots": 2,
                "dependencyHubs": 1,
                "boundaryWarnings": 1,
            },
            "couplingHotspots": [
                {"filePath": "app/api/routes/login.py"},
            ],
            "dependencyHubs": [
                {"filePath": "app/services/auth.py"},
            ],
            "recommendations": [
                "Split auth orchestration from token parsing.",
            ],
        },
    }


def test_chat_retriever_for_risk_question():
    result = _sample_result()

    retrieval = retrieve_chat_context(result, "Why is this repo risky?")

    assert "ai.riskExplanation" in retrieval["matchedSections"] or "risk_summary" in retrieval["matchedSections"]
    assert len(retrieval["citations"]) > 0
    assert retrieval["confidence"] in {"low", "medium", "high"}


def test_chat_generator_for_risk_question():
    result = _sample_result()
    retrieval = retrieve_chat_context(result, "Why is this repo risky?")

    answer = generate_chat_answer(result, retrieval)

    assert "risk" in answer.lower()
    assert "app/services/auth.py" in answer or "app/api/routes/login.py" in answer


def test_chat_generator_for_refactor_question():
    result = _sample_result()
    retrieval = retrieve_chat_context(result, "Which files should I fix first?")

    answer = generate_chat_answer(result, retrieval)

    assert "app/services/auth.py" in answer
    assert "app/api/routes/login.py" in answer or "start" in answer.lower()


def test_chat_generator_for_architecture_question():
    result = _sample_result()
    retrieval = retrieve_chat_context(result, "What are the biggest architecture problems?")

    answer = generate_chat_answer(result, retrieval)

    assert "architecture" in answer.lower()
    assert "coupling" in answer.lower() or "boundary" in answer.lower()


def test_chat_generator_for_summary_question():
    result = _sample_result()
    retrieval = retrieve_chat_context(result, "Summarize this scan simply")

    answer = generate_chat_answer(result, retrieval)

    assert len(answer) > 20