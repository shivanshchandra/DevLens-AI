import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.scan import ScanCreate, ScanOut, ScanResultOut
from app.services.scan_service import create_scan, get_scan, list_scans
from app.worker.queue import get_queue
from app.worker.jobs import run_scan_job

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("", response_model=ScanOut)
def create_scan_endpoint(payload: ScanCreate, db: Session = Depends(get_db)):
    scan = create_scan(
        db=db,
        source_type=payload.source_type,
        repo_url=payload.repo_url,
        pr_number=payload.pr_number,
    )

    # NEW: enqueue background scan job (async)
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