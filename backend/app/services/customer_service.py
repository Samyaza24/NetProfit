from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


def create_customer(db: Session, data: CustomerCreate) -> Customer:
    customer = Customer(id=data.id, name=data.name, status=data.status)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(db: Session) -> list[Customer]:
    return list(db.execute(select(Customer)).scalars().all())


def get_customer(db: Session, customer_id: str) -> Customer | None:
    return db.get(Customer, customer_id)


def update_customer(db: Session, customer: Customer, data: CustomerUpdate) -> Customer:
    if data.name is not None:
        customer.name = data.name
    if data.status is not None:
        customer.status = data.status
    db.commit()
    db.refresh(customer)
    return customer
