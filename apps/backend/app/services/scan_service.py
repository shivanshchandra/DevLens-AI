import uuid
from sqlalchemy.orm import Session

from app.models.scan import Scan


def create_scan(
    db: Session,
    source_type: str,
    repo_url: str | None,
    pr_number: int | None,
    zip_path: str | None = None,
) -> Scan:

    scan = Scan(
        source_type=source_type,
        repo_url=repo_url,
        pr_number=pr_number,
        zip_path=zip_path,
        status="queued",
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


def set_scan_status(db: Session, scan: Scan, status: str) -> Scan:
    scan.status = status
    db.commit()
    db.refresh(scan)
    return scan


def set_scan_result(db: Session, scan: Scan, result_json: dict) -> Scan:
    scan.result_json = result_json
    scan.status = "completed"
    scan.error_message = None
    db.commit()
    db.refresh(scan)
    return scan


def set_scan_failed(db: Session, scan: Scan, error_message: str) -> Scan:
    scan.status = "failed"
    scan.error_message = error_message[:1000]
    db.commit()
    db.refresh(scan)
    return scan