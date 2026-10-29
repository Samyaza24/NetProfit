from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction
from app.schemas.transaction import TransactionCreate
from app.services.commit import commit_or_conflict


def create_transaction(db: Session, data: TransactionCreate) -> Transaction:
    transaction = Transaction(
        id=data.id,
        customer_id=data.customer_id,
        device_id=data.device_id,
        amount_received=data.amount_received,
        duration_days=data.duration_days,
        status=data.status,
    )
    db.add(transaction)
    commit_or_conflict(db)
    db.refresh(transaction)
    return transaction


def list_transactions(db: Session) -> list[Transaction]:
    return list(db.execute(select(Transaction)).scalars().all())
