# apps/backend/app/services/analysis/fs_utils.py

from __future__ import annotations
from pathlib import Path


def safe_rmtree(path: str | Path) -> None:
    """
    Recursively delete a directory tree (best-effort).
    Avoids shutil for predictable behavior inside containers.
    """
    p = Path(path)
    if not p.exists():
        return

    for child in sorted(p.rglob("*"), reverse=True):
        try:
            if child.is_file() or child.is_symlink():
                child.unlink()
            elif child.is_dir():
                child.rmdir()
        except Exception:
            # best effort cleanup
            pass

    try:
        p.rmdir()
    except Exception:
        pass