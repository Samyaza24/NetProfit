from datetime import datetime

from pydantic import BaseModel

from app.schemas.customer import CustomerCreate, CustomerRead
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.schemas.transaction import TransactionCreate, TransactionRead


class SyncPushRequest(BaseModel):
    customers: list[CustomerCreate] = []
    transactions: list[TransactionCreate] = []
    expenses: list[ExpenseCreate] = []


class SyncPushCounts(BaseModel):
    customers: int
    transactions: int
    expenses: int


class SyncPushResponse(BaseModel):
    accepted: SyncPushCounts
    server_time: datetime


class SyncPullResponse(BaseModel):
    customers: list[CustomerRead]
    transactions: list[TransactionRead]
    expenses: list[ExpenseRead]
    server_time: datetime
