from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UUIDStr

# Active follows the customer's plan; Disabled means the operator cut them off by hand.
CustomerStatus = Literal["Active", "Disabled"]


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    status: CustomerStatus = "Active"


class CustomerCreate(CustomerBase):
    id: UUIDStr
    # Set by sync clients so last-write-wins can compare edit times; direct POST /customers omits it.
    updated_at: datetime | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    status: CustomerStatus | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    updated_at: datetime
