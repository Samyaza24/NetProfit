from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UUIDStr


class TransactionBase(BaseModel):
    customer_id: UUIDStr
    device_id: UUIDStr | None = None
    amount_received: float = Field(gt=0)
    duration_days: int = Field(gt=0)
    status: Literal["Paid", "Unpaid"]


class TransactionCreate(TransactionBase):
    id: UUIDStr


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
