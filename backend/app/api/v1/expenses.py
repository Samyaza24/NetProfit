from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db)) -> ExpenseRead:
    return expense_service.create_expense(db, data)


@router.get("", response_model=list[ExpenseRead])
def list_expenses(db: Session = Depends(get_db)) -> list[ExpenseRead]:
    return expense_service.list_expenses(db)
