import uuid
from sqlalchemy.orm import Session

from app.models.scan import Scan


def create_scan(
    db: Session,
    source_type: str,
    repo_url: str | None,
    pr_number: int | None,
    zip_path: str | None = None,
    ref: str | None = None,
) -> Scan:
    """
    Creates a scan row in DB.
    - ref is optional (branch/tag/commit) for github/pr scans
    - zip_path is optional for zip scans
    """
    scan = Scan(
        source_type=source_type,
        repo_url=repo_url,
        pr_number=pr_number,
        zip_path=zip_path,
        ref=ref,
        status="queued",
        progress=0,
        current_step="queued",
        status_message="Scan queued",
        result_json=None,
        error_message=None,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def get_scan(db: Session, scan_id: uuid.UUID) -> Scan | None:
    return db.get(Scan, scan_id)


def list_scans(db: Session, limit: int = 20, offset: int = 0) -> list[Scan]:
    return (
        db.query(Scan)
        .order_by(Scan.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def set_scan_status(
    db: Session,
    scan: Scan,
    status: str,
    progress: int | None = None,
    current_step: str | None = None,
    status_message: str | None = None,
) -> Scan:
    scan.status = status

    if progress is not None:
        scan.progress = progress
    if current_step is not None:
        scan.current_step = current_step
    if status_message is not None:
        scan.status_message = status_message

    db.commit()
    db.refresh(scan)
    return scan


def set_scan_progress(
    db: Session,
    scan: Scan,
    *,
    progress: int,
    current_step: str,
    status_message: str,
) -> Scan:
    scan.progress = progress
    scan.current_step = current_step
    scan.status_message = status_message
    db.commit()
    db.refresh(scan)
    return scan


def set_scan_result(db: Session, scan: Scan, result_json: dict) -> Scan:
    scan.result_json = result_json
    scan.status = "completed"
    scan.progress = 100
    scan.current_step = "completed"
    scan.status_message = "Scan completed successfully"
    scan.error_message = None
    db.commit()
    db.refresh(scan)
    return scan


def set_scan_failed(db: Session, scan: Scan, error_message: str) -> Scan:
    scan.status = "failed"
    scan.current_step = "failed"
    scan.status_message = "Scan failed"
    scan.error_message = error_message[:1000]
    db.commit()
    db.refresh(scan)
    return scan