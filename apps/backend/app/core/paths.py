# apps/backend/app/core/paths.py

from pathlib import Path
import os

# In Docker Linux this is fine. On Windows local dev it will still work.
WORKDIR_BASE = Path(os.getenv("DEVLENS_WORKDIR", "/tmp/devlens")).resolve()
WORKDIR_BASE.mkdir(parents=True, exist_ok=True)