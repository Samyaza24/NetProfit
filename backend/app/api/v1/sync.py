from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_device
from app.database import get_db
from app.models import Device
from app.schemas.reset import ResetRequest, ResetResponse
from app.schemas.sync import MAX_BATCH, SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.services import reset_service, sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncPushResponse)
def push_sync(
    payload: SyncPushRequest,
    device: Device = Depends(require_device),
    db: Session = Depends(get_db),
) -> SyncPushResponse:
    return sync_service.process_transaction_sync(db, device, payload)


@router.post("/reset", response_model=ResetResponse)
def reset_from_phone(
    _: ResetRequest,
    device: Device = Depends(require_device),
    db: Session = Depends(get_db),
) -> ResetResponse:
    # Lets a paired phone start the whole shop from scratch; the typed confirmation is checked by the schema.
    epoch, erased = reset_service.reset_all(db, source=f"phone '{device.label}'")
    return ResetResponse(data_epoch=epoch, erased=erased)


@router.get("", response_model=SyncPullResponse)
def pull_sync(
    since: datetime | None = None,
    limit: int | None = Query(default=None, ge=1, le=MAX_BATCH),
    device: Device = Depends(require_device),
    db: Session = Depends(get_db),
) -> SyncPullResponse:
    return sync_service.pull_since(db, since, limit)
