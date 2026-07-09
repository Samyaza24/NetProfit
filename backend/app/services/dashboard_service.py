from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Customer, Transaction
from app.schemas.dashboard import DashboardRow


def fetch_crm_dashboard(db: Session) -> list[DashboardRow]:
    stmt = (
        select(
            Customer.id,
            Customer.name,
            func.count(Transaction.id).label("total_visits"),
            func.coalesce(
                func.sum(case((Transaction.status == "Paid", Transaction.amount_received), else_=0)),
                0,
            ).label("lifetime_value"),
            func.coalesce(
                func.sum(case((Transaction.status == "Unpaid", Transaction.amount_received), else_=0)),
                0,
            ).label("outstanding_debt"),
        )
        .select_from(Customer)
        .outerjoin(Transaction, Transaction.customer_id == Customer.id)
        .group_by(Customer.id, Customer.name)
    )
    rows = db.execute(stmt).mappings().all()
    return [DashboardRow(**row) for row in rows]
