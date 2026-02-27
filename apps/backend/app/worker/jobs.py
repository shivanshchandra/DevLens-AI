import time
import uuid

from app.db.session import SessionLocal
from app.mock.results import MOCK_RESULT_JSON
from app.services.scan_service import get_scan, set_scan_failed, set_scan_result, set_scan_status


def run_scan_job(scan_id: str) -> None:
    """
    Background job:
    queued -> running -> completed/failed
    Stores result_json into Postgres.
    """
    db = SessionLocal()
    try:
        sid = uuid.UUID(scan_id)
        scan = get_scan(db, sid)
        if not scan:
            return

        # mark running
        set_scan_status(db, scan, "running")

        # simulate work (later: clone repo, run analyzers, etc.)
        time.sleep(2)

        # store results + mark completed
        set_scan_result(db, scan, MOCK_RESULT_JSON)

    except Exception as e:
        # best effort to mark failed
        try:
            sid = uuid.UUID(scan_id)
            scan = get_scan(db, sid)
            if scan:
                set_scan_failed(db, scan, str(e))
        finally:
            pass
    finally:
        db.close()