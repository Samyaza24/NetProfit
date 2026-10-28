from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer, Device, OperationalExpense, Transaction
from app.schemas.sync import SyncPullResponse, SyncPushCounts, SyncPushRequest, SyncPushResponse
from app.services.timeutil import to_naive_utc, utc_now


def process_transaction_sync(
    db: Session, device: Device, payload: SyncPushRequest
) -> SyncPushResponse:
    counts = SyncPushCounts(customers=0, transactions=0, expenses=0)

    # The session already has an ambient (autobegun) transaction by the time this runs
    # (require_device's lookup started one), so atomicity is via commit/rollback, not db.begin().
    try:
        customer_ids = [c.id for c in payload.customers]
        existing_customers = {
            c.id: c
            for c in db.execute(select(Customer).where(Customer.id.in_(customer_ids))).scalars()
        }

        transaction_ids = [t.id for t in payload.transactions]
        existing_transaction_ids = set(
            db.execute(
                select(Transaction.id).where(Transaction.id.in_(transaction_ids))
            ).scalars()
        )

        expense_ids = [e.id for e in payload.expenses]
        existing_expense_ids = set(
            db.execute(
                select(OperationalExpense.id).where(OperationalExpense.id.in_(expense_ids))
            ).scalars()
        )

        for c in payload.customers:
            incoming_updated = to_naive_utc(c.updated_at) if c.updated_at else utc_now()
            existing = existing_customers.get(c.id)
            if existing is None:
                new_customer = Customer(
                    id=c.id, name=c.name, status=c.status, updated_at=incoming_updated
                )
                db.add(new_customer)
                db.flush()  # acquire the row now so later rows in this payload can reference it
                existing_customers[c.id] = new_customer
                counts.customers += 1
            elif incoming_updated > existing.updated_at:
                existing.name = c.name
                existing.status = c.status
                existing.updated_at = incoming_updated
                counts.customers += 1

        for t in payload.transactions:
            if t.id in existing_transaction_ids:
                continue
            db.add(
                Transaction(
                    id=t.id,
                    customer_id=t.customer_id,
                    device_id=device.id,
                    amount_received=t.amount_received,
                    duration_days=t.duration_days,
                    status=t.status,
                    timestamp=to_naive_utc(t.timestamp) if t.timestamp else utc_now(),
                )
            )
            existing_transaction_ids.add(t.id)
            counts.transactions += 1

        for e in payload.expenses:
            if e.id in existing_expense_ids:
                continue
            db.add(
                OperationalExpense(
                    id=e.id,
                    device_id=device.id,
                    description=e.description,
                    amount=e.amount,
                    timestamp=to_naive_utc(e.timestamp) if e.timestamp else utc_now(),
                )
            )
            existing_expense_ids.add(e.id)
            counts.expenses += 1

        device.last_synced_at = utc_now()
        db.commit()
    except Exception:
        db.rollback()
        raise

    return SyncPushResponse(accepted=counts, server_time=utc_now())


def pull_since(db: Session, since: datetime | None) -> SyncPullResponse:
    customers_q = select(Customer)
    transactions_q = select(Transaction)
    expenses_q = select(OperationalExpense)
    if since is not None:
        since = to_naive_utc(since)
        customers_q = customers_q.where(Customer.updated_at > since)
        transactions_q = transactions_q.where(Transaction.timestamp > since)
        expenses_q = expenses_q.where(OperationalExpense.timestamp > since)

    return SyncPullResponse(
        customers=list(db.execute(customers_q).scalars().all()),
        transactions=list(db.execute(transactions_q).scalars().all()),
        expenses=list(db.execute(expenses_q).scalars().all()),
        server_time=utc_now(),
    )
