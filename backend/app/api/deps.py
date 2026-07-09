from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Device
from app.services.security import hash_secret


def require_device(
    x_netprofit_key: str = Header(None), db: Session = Depends(get_db)
) -> Device:
    if not x_netprofit_key:
        raise HTTPException(status_code=401, detail="Missing device token")
    token_hash = hash_secret(x_netprofit_key)
    device = db.execute(
        select(Device).where(Device.token_hash == token_hash)
    ).scalar_one_or_none()
    if device is None or device.revoked:
        raise HTTPException(status_code=401, detail="Invalid or revoked device token")
    return device
