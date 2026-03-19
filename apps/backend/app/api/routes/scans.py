import uuid
from pathlib import Path
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.scan import ScanCreate, ScanOut, ScanResultOut
from app.services.scan_service import create_scan, get_scan, list_scans

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
    q.enqueue(run_scan_job, str(scan.id))

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
    q.enqueue(run_scan_job, str(scan.id))

    return scan


@router.get("", response_model=list[ScanOut])
def list_scans_endpoint(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return list_scans(db, limit=limit, offset=offset)


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