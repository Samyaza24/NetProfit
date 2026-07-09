from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionRead
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionRead, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)) -> TransactionRead:
    return transaction_service.create_transaction(db, data)


@router.get("", response_model=list[TransactionRead])
def list_transactions(db: Session = Depends(get_db)) -> list[TransactionRead]:
    return transaction_service.list_transactions(db)
