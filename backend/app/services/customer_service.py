from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.commit import commit_or_conflict


def _reject_taken_name(db: Session, name: str, own_id: str) -> None:
    # Names are unique ignoring case, the same rule sync uses to merge customers.
    taken = db.execute(
        select(Customer.id).where(func.lower(Customer.name) == name.lower(), Customer.id != own_id)
    ).first()
    if taken:
        raise HTTPException(status_code=409, detail="A customer with that name already exists")


def create_customer(db: Session, data: CustomerCreate) -> Customer:
    _reject_taken_name(db, data.name, data.id)
    customer = Customer(id=data.id, name=data.name, status=data.status)
    db.add(customer)
    commit_or_conflict(db)
    db.refresh(customer)
    return customer


def list_customers(db: Session) -> list[Customer]:
    return list(db.execute(select(Customer)).scalars().all())


def get_customer(db: Session, customer_id: str) -> Customer | None:
    return db.get(Customer, customer_id)


def update_customer(db: Session, customer: Customer, data: CustomerUpdate) -> Customer:
    if data.name is not None:
        _reject_taken_name(db, data.name, customer.id)
        customer.name = data.name
    if data.status is not None:
        customer.status = data.status
    commit_or_conflict(db)
    db.refresh(customer)
    return customer
