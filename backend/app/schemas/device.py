from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DeviceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    paired_at: datetime
    last_synced_at: datetime | None
    revoked: bool


class PairingCodeResponse(BaseModel):
    pairing_code: str
    server_url: str
    expires_at: datetime


class PairExchangeRequest(BaseModel):
    pairing_code: str
    label: str


class PairExchangeResponse(BaseModel):
    device_id: str
    token: str
    server_url: str
