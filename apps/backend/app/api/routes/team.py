from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.team import TeamOverviewOut
from app.services.analysis.team_analytics import build_team_overview

router = APIRouter(prefix="/team", tags=["team"])


@router.get("/overview", response_model=TeamOverviewOut)
def get_team_overview_endpoint(
    trend_days: int = Query(14, ge=1, le=90),
    latest_limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return build_team_overview(
        db=db,
        trend_days=trend_days,
        latest_limit=latest_limit,
    )