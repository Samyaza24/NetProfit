from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_device
from app.database import get_db
from app.models import Device
from app.schemas.sync import SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncPushResponse)
def push_sync(
    payload: SyncPushRequest,
    device: Device = Depends(require_device),
    db: Session = Depends(get_db),
) -> SyncPushResponse:
    return sync_service.process_transaction_sync(db, device, payload)


@router.get("", response_model=SyncPullResponse)
def pull_sync(
    since: datetime | None = None,
    device: Device = Depends(require_device),
    db: Session = Depends(get_db),
) -> SyncPullResponse:
    return sync_service.pull_since(db, since)
