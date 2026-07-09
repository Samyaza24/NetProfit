from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import OperationalExpense
from app.schemas.expense import ExpenseCreate


def create_expense(db: Session, data: ExpenseCreate) -> OperationalExpense:
    expense = OperationalExpense(
        id=data.id,
        device_id=data.device_id,
        description=data.description,
        amount=data.amount,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def list_expenses(db: Session) -> list[OperationalExpense]:
    return list(db.execute(select(OperationalExpense)).scalars().all())
