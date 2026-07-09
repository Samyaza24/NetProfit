from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.device import (
    DeviceRead,
    PairExchangeRequest,
    PairExchangeResponse,
    PairingCodeResponse,
)
from app.services import device_service
from app.services.security import get_server_url

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=list[DeviceRead])
def list_devices(db: Session = Depends(get_db)) -> list[DeviceRead]:
    return device_service.list_devices(db)


@router.get("/{device_id}", response_model=DeviceRead)
def get_device(device_id: str, db: Session = Depends(get_db)) -> DeviceRead:
    device = device_service.get_device(db, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.post("/pairing-code", response_model=PairingCodeResponse, status_code=201)
def create_pairing_code(db: Session = Depends(get_db)) -> PairingCodeResponse:
    raw_code, pairing_code = device_service.create_pairing_code(db)
    server_url = get_server_url()
    return PairingCodeResponse(
        pairing_code=raw_code, server_url=server_url, expires_at=pairing_code.expires_at
    )


@router.post("/pair", response_model=PairExchangeResponse, status_code=201)
def pair_device(data: PairExchangeRequest, db: Session = Depends(get_db)) -> PairExchangeResponse:
    result = device_service.exchange_pairing_code(db, data.pairing_code, data.label)
    if result is None:
        raise HTTPException(status_code=400, detail="Invalid, used, or expired pairing code")
    device, raw_token = result
    server_url = get_server_url()
    return PairExchangeResponse(device_id=device.id, token=raw_token, server_url=server_url)


@router.post("/{device_id}/revoke", response_model=DeviceRead)
def revoke_device(device_id: str, db: Session = Depends(get_db)) -> DeviceRead:
    device = device_service.revoke_device(db, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return device
