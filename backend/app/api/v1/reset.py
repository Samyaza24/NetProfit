from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.reset import ResetRequest, ResetResponse
from app.services import reset_service

router = APIRouter(prefix="/reset", tags=["reset"])


@router.post("", response_model=ResetResponse)
def reset_data(_: ResetRequest, db: Session = Depends(get_db)) -> ResetResponse:
    epoch, erased = reset_service.reset_all(db, source="the web console")
    return ResetResponse(data_epoch=epoch, erased=erased)
