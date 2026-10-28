from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UUIDStr


class ExpenseBase(BaseModel):
    device_id: UUIDStr | None = None
    description: str = Field(min_length=1, max_length=500)
    amount: float = Field(gt=0)


class ExpenseCreate(ExpenseBase):
    id: UUIDStr
    timestamp: datetime | None = None


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
