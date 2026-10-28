from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.customer import CustomerCreate, CustomerRead
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.schemas.transaction import TransactionCreate, TransactionRead


MAX_BATCH = 1000


class SyncPushRequest(BaseModel):
    customers: list[CustomerCreate] = Field(default=[], max_length=MAX_BATCH)
    transactions: list[TransactionCreate] = Field(default=[], max_length=MAX_BATCH)
    expenses: list[ExpenseCreate] = Field(default=[], max_length=MAX_BATCH)


class SyncPushCounts(BaseModel):
    customers: int
    transactions: int
    expenses: int


class SyncPushResponse(BaseModel):
    accepted: SyncPushCounts
    # Pushed customer id -> existing customer id, when the name already existed under another id.
    customer_remap: dict[str, str] = {}
    server_time: datetime


class SyncPullResponse(BaseModel):
    customers: list[CustomerRead]
    transactions: list[TransactionRead]
    expenses: list[ExpenseRead]
    server_time: datetime
