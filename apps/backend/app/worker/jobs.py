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

    extract_dir: Path | None = None
    zip_file: Path | None = None
    repo_dir: Path | None = None

    try:
        sid = uuid.UUID(scan_id)
        scan = get_scan(db, sid)
        if not scan:
            return

        set_scan_status(db, scan, "running")

        # ZIP scan
        if scan.source_type == "zip":
            if not scan.zip_path:
                raise RuntimeError("zip_path missing for zip scan")

            zip_file = Path(scan.zip_path).resolve()
            extract_dir = (WORKDIR_BASE / "extracts" / str(scan.id)).resolve()

            safe_rmtree(extract_dir)
            extract_dir.mkdir(parents=True, exist_ok=True)

            safe_extract_zip(zip_file, extract_dir)
            result = analyze_directory(extract_dir)

            result.setdefault("meta", {})
            result["meta"].update({
                "source_type": "zip",
                "scan_id": str(scan.id),
            })

            set_scan_result(db, scan, result)
            return

        # GitHub scan
        if scan.source_type == "github":
            if not scan.repo_url:
                raise RuntimeError("repo_url missing for github scan")

            repo_dir = (WORKDIR_BASE / "repos" / str(scan.id)).resolve()
            safe_rmtree(repo_dir)

            repo_dir, normalized_repo_url = clone_repo(scan.repo_url, repo_dir, depth=1)

            normalized_ref = None
            if getattr(scan, "ref", None):
                normalized_ref = checkout_ref(repo_dir, scan.ref)

            result = analyze_directory(repo_dir)

            result.setdefault("meta", {})
            result["meta"].update({
                "source_type": "github",
                "scan_id": str(scan.id),
                "repo_url": normalized_repo_url,
                "ref": normalized_ref,
                "rootAnalyzed": str(repo_dir),
            })

            set_scan_result(db, scan, result)
            return

        # dev fallback
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