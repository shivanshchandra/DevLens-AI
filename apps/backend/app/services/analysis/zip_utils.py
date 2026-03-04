# apps/backend/app/services/analysis/zip_utils.py

from __future__ import annotations
from pathlib import Path
import zipfile


def safe_extract_zip(zip_path: str | Path, dest_dir: str | Path) -> Path:
    """
    Safely extract zip into dest_dir.
    Prevents Zip Slip (../ path traversal).
    """
    zip_path = Path(zip_path).resolve()
    dest_dir = Path(dest_dir).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            # Skip directories created implicitly
            member_path = Path(member.filename)

            # Disallow absolute paths
            if member_path.is_absolute():
                raise ValueError("Unsafe zip: absolute path detected")

            # Compute final path and ensure it's inside dest_dir
            target_path = (dest_dir / member.filename).resolve()
            if not str(target_path).startswith(str(dest_dir)):
                raise ValueError("Unsafe zip: path traversal detected")

        # If all members are safe, extract
        zf.extractall(dest_dir)

    return dest_dir