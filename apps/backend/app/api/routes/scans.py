import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat import ScanChatRequest, ScanChatResponse
from app.schemas.scan import ScanCreate, ScanOut, ScanResultOut
from app.services.ai.chat_generator import generate_chat_answer
from app.services.ai.chat_retriever import retrieve_chat_context
from app.services.scan_service import create_scan, get_scan, get_scan_result, list_scans
from app.schemas.compare import ScanCompareOut
from app.services.analysis.compare_results import compare_scan_results

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("", response_model=ScanOut)
def create_scan_endpoint(payload: ScanCreate, db: Session = Depends(get_db)):
    scan = create_scan(
        db=db,
        source_type=payload.source_type,
        repo_url=payload.repo_url,
        pr_number=payload.pr_number,
        ref=payload.ref,
    )

    from app.worker.queue import get_queue
    from app.worker.jobs import run_scan_job

    q = get_queue()
    q.enqueue(run_scan_job, str(scan.id), job_timeout=900)

    return scan


@router.post("/upload-zip", response_model=ScanOut)
def upload_zip_scan_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="ZIP filename is missing")

    if not filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are supported")

    uploads_dir = Path(os.getenv("DEVLENS_UPLOADS_DIR", "./uploads")).resolve()
    uploads_dir.mkdir(parents=True, exist_ok=True)

    zip_path = uploads_dir / f"{uuid.uuid4()}.zip"

    try:
        with zip_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        if zip_path.exists():
            zip_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to store uploaded ZIP")
    finally:
        file.file.close()

    scan = create_scan(
        db=db,
        source_type="zip",
        repo_url=None,
        pr_number=None,
        zip_path=str(zip_path),
        ref=None,
    )

    from app.worker.queue import get_queue
    from app.worker.jobs import run_scan_job

    q = get_queue()
    q.enqueue(run_scan_job, str(scan.id), job_timeout=900)

    return scan


@router.get("", response_model=list[ScanOut])
def list_scans_endpoint(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return list_scans(db, limit=limit, offset=offset)


@router.get("/compare", response_model=ScanCompareOut)
def compare_scans_endpoint(
    base_scan_id: uuid.UUID = Query(...),
    target_scan_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
):
    if base_scan_id == target_scan_id:
        raise HTTPException(status_code=400, detail="base_scan_id and target_scan_id must be different")

    base_scan = get_scan(db, base_scan_id)
    target_scan = get_scan(db, target_scan_id)

    if not base_scan or not target_scan:
        raise HTTPException(status_code=404, detail="One or both scans were not found")

    if not base_scan.result_json or not target_scan.result_json:
        raise HTTPException(status_code=400, detail="Both scans must have completed results")

    comparison = compare_scan_results(base_scan.result_json, target_scan.result_json)

    return {
        "baseScanId": base_scan.id,
        "targetScanId": target_scan.id,
        **comparison,
    }


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan_endpoint(scan_id: uuid.UUID, db: Session = Depends(get_db)):
    scan = get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/{scan_id}/results", response_model=ScanResultOut)
def get_results_endpoint(scan_id: uuid.UUID, db: Session = Depends(get_db)):
    scan = get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if not scan.result_json:
        raise HTTPException(status_code=404, detail="Results not ready yet")
    return {"scan_id": scan.id, "result_json": scan.result_json}


@router.post("/{scan_id}/chat", response_model=ScanChatResponse)
def chat_with_scan_endpoint(
    scan_id: uuid.UUID,
    payload: ScanChatRequest,
    db: Session = Depends(get_db),
):
    scan = get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if not scan.result_json:
        raise HTTPException(status_code=404, detail="Results not ready yet")

    result_json = get_scan_result(db, scan_id) or {}
    retrieval = retrieve_chat_context(result_json, payload.question)
    answer = generate_chat_answer(result_json, retrieval)

    return {
        "answer": answer,
        "citations": retrieval["citations"],
        "matchedSections": retrieval["matchedSections"],
        "confidence": retrieval["confidence"],
    }


@router.post("/{scan_id}/findings/ai-fix")
def generate_finding_fix_endpoint(
    scan_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
):
    scan = get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    from app.services.ai.fix_generator import generate_ai_fix_diff

    rule_id = payload.get("ruleId")
    finding_title = payload.get("title") or "Code finding"
    finding_message = payload.get("message")
    file_path = payload.get("filePath") or "source.py"
    snippet = payload.get("snippet")

    fix = generate_ai_fix_diff(
        rule_id=rule_id,
        finding_title=finding_title,
        finding_message=finding_message,
        file_path=file_path,
        snippet=snippet,
    )

    return fix