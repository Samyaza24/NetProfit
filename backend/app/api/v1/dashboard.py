from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import DashboardRow
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=list[DashboardRow])
def get_dashboard(db: Session = Depends(get_db)) -> list[DashboardRow]:
    return dashboard_service.fetch_crm_dashboard(db)
