from urllib.parse import urlsplit

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Device
from app.services.security import hash_secret


LOCAL_HOSTS = ("127.0.0.1", "::1", "localhost")


def require_local(request: Request) -> None:
    peer = request.client.host if request.client else None
    # Host check blocks DNS rebinding; Origin check blocks cross-site writes from the operator's browser.
    host = urlsplit("//" + request.headers.get("host", "")).hostname
    origin = request.headers.get("origin")
    bad_origin = request.method not in ("GET", "HEAD") and origin and origin not in settings.cors_origins
    if peer not in LOCAL_HOSTS or host not in LOCAL_HOSTS or bad_origin:
        raise HTTPException(status_code=403, detail="Console endpoints are localhost-only")


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
