# apps/backend/app/worker/jobs.py

import os
import uuid
from pathlib import Path

from app.db.session import SessionLocal
from app.services.scan_service import (
    get_scan,
    set_scan_failed,
    set_scan_result,
    set_scan_status,
)
from app.services.analysis.directory_analyzer import analyze_directory
from app.core.paths import WORKDIR_BASE
from app.services.analysis.zip_utils import safe_extract_zip
from app.services.analysis.fs_utils import safe_rmtree
from app.services.analysis.git_utils import clone_repo, checkout_ref


def run_scan_job(scan_id: str) -> None:
    """
    Background job:
    queued -> running -> completed/failed
    Stores result_json into Postgres.
    """
    db = SessionLocal()

    # cleanup targets (best-effort)
    extract_dir: Path | None = None
    zip_file: Path | None = None
    repo_dir: Path | None = None

    try:
        sid = uuid.UUID(scan_id)
        scan = get_scan(db, sid)
        if not scan:
            return

        # 1) mark running
        set_scan_status(db, scan, "running")

        # 2) ZIP scan
        if scan.source_type == "zip":
            if not scan.zip_path:
                raise RuntimeError("zip_path missing for zip scan")

            zip_file = Path(scan.zip_path).resolve()
            extract_dir = (WORKDIR_BASE / "extracts" / str(scan.id)).resolve()

            # ensure clean
            safe_rmtree(extract_dir)
            extract_dir.mkdir(parents=True, exist_ok=True)

            safe_extract_zip(zip_file, extract_dir)
            result = analyze_directory(extract_dir)

            # include some meta context
            result.setdefault("meta", {})
            result["meta"].update({
                "source_type": "zip",
                "scan_id": str(scan.id),
            })

            set_scan_result(db, scan, result)
            return

        # 3) GitHub scan
        if scan.source_type == "github":
            if not scan.repo_url:
                raise RuntimeError("repo_url missing for github scan")

            repo_dir = (WORKDIR_BASE / "repos" / str(scan.id)).resolve()

            # ensure clean
            safe_rmtree(repo_dir)

            # clone
            clone_repo(scan.repo_url, repo_dir, depth=1)

            # checkout ref if provided (branch/tag/commit)
            if getattr(scan, "ref", None):
                checkout_ref(repo_dir, scan.ref)

            # analyze cloned repo
            result = analyze_directory(repo_dir)

            # include meta context
            result.setdefault("meta", {})
            result["meta"].update({
                "source_type": "github",
                "scan_id": str(scan.id),
                "repo_url": scan.repo_url,
                "ref": getattr(scan, "ref", None),
            })

            set_scan_result(db, scan, result)
            return

        # 4) fallback (dev-only)
        target_dir = Path(os.getenv("DEVLENS_ANALYZE_DIR", Path.cwd())).resolve()
        result = analyze_directory(target_dir)

        result.setdefault("meta", {})
        result["meta"].update({
            "source_type": "dev_fallback",
            "scan_id": str(scan.id),
            "rootAnalyzed": str(target_dir),
        })

        set_scan_result(db, scan, result)

    except Exception as e:
        try:
            sid = uuid.UUID(scan_id)
            scan = get_scan(db, sid)
            if scan:
                set_scan_failed(db, scan, str(e))
        finally:
            pass

    finally:
        # cleanup always runs (best effort)
        try:
            if extract_dir is not None:
                safe_rmtree(extract_dir)
        except Exception:
            pass

        try:
            if repo_dir is not None:
                safe_rmtree(repo_dir)
        except Exception:
            pass

        try:
            if zip_file is not None and zip_file.exists() and zip_file.is_file():
                zip_file.unlink()
        except Exception:
            pass

        db.close()