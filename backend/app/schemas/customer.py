from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UUIDStr


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    status: str = Field(default="Active", max_length=32)


class CustomerCreate(CustomerBase):
    id: UUIDStr
    # Set by sync clients so last-write-wins can compare edit times; direct POST /customers omits it.
    updated_at: datetime | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = Field(default=None, max_length=32)


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    updated_at: datetime
