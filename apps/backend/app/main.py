from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.scans import router as scans_router
from app.api.routes import team

app = FastAPI(title="DevLens API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# optional: versioned prefix
app.include_router(health_router, prefix="/api")
app.include_router(scans_router, prefix="/api")
app.include_router(team.router, prefix="/api")