import os
import sys
import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.scans import router as scans_router
from app.api.routes import team

worker_process = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global worker_process
    enable_worker = os.getenv("ENABLE_EMBEDDED_WORKER", "true").lower() in ("true", "1", "yes")
    if enable_worker:
        try:
            print("[Lifespan] Starting embedded background RQ worker...", flush=True)
            worker_process = subprocess.Popen(
                [sys.executable, "-m", "app.worker.worker"],
                stdout=sys.stdout,
                stderr=sys.stderr,
            )
            print(f"[Lifespan] Embedded RQ worker running with PID {worker_process.pid}", flush=True)
        except Exception as e:
            print(f"[Lifespan] Could not launch embedded worker: {e}", flush=True)

    yield

    if worker_process and worker_process.poll() is None:
        print("[Lifespan] Shutting down embedded RQ worker...", flush=True)
        worker_process.terminate()
        try:
            worker_process.wait(timeout=5)
        except Exception:
            worker_process.kill()


app = FastAPI(title="DevLens API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://devlens-ai-frontend.vercel.app",
        "https://devlens-ai.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# optional: versioned prefix
app.include_router(health_router, prefix="/api")
app.include_router(scans_router, prefix="/api")
app.include_router(team.router, prefix="/api")