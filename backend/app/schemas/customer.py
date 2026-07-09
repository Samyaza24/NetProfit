from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class CustomerBase(BaseModel):
    name: str
    status: str = "Active"


class CustomerCreate(CustomerBase):
    id: UUIDStr
    # Set by sync clients so last-write-wins can compare edit times; direct POST /customers omits it.
    updated_at: datetime | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    status: str | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    updated_at: datetime
