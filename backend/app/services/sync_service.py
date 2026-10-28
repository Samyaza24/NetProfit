from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, select
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
        existing_transactions = {
            t.id: t
            for t in db.execute(
                select(Transaction).where(Transaction.id.in_(transaction_ids))
            ).scalars()
        }

        expense_ids = [e.id for e in payload.expenses]
        existing_expense_ids = set(
            db.execute(
                select(OperationalExpense.id).where(OperationalExpense.id.in_(expense_ids))
            ).scalars()
        )

        # Customers are matched by name (case-insensitive) so two phones never create duplicates.
        by_name = {
            c.name.lower(): c
            for c in db.execute(
                select(Customer).where(
                    func.lower(Customer.name).in_([c.name.lower() for c in payload.customers])
                )
            ).scalars()
        }
        remap: dict[str, str] = {}

        for c in payload.customers:
            incoming_updated = to_naive_utc(c.updated_at) if c.updated_at else utc_now()
            existing = existing_customers.get(c.id)
            twin = by_name.get(c.name.lower())
            if existing is None:
                if twin is not None:
                    # Same name under another id: fold into it and tell the phone to follow.
                    remap[c.id] = twin.id
                    existing_customers[c.id] = twin
                    continue
                new_customer = Customer(
                    id=c.id, name=c.name, status=c.status, updated_at=incoming_updated
                )
                db.add(new_customer)
                db.flush()  # acquire the row now so later rows in this payload can reference it
                existing_customers[c.id] = new_customer
                by_name[c.name.lower()] = new_customer
                counts.customers += 1
            elif twin is not None and twin.id != existing.id:
                continue  # renaming onto a name another customer already has is ignored
            elif incoming_updated > existing.updated_at:
                existing.name = c.name
                existing.status = c.status
                existing.updated_at = incoming_updated
                counts.customers += 1

        needed = {t.customer_id for t in payload.transactions} - existing_customers.keys()
        known = set(db.execute(select(Customer.id).where(Customer.id.in_(needed))).scalars())
        if missing := needed - known:
            raise HTTPException(422, f"Unknown customer_id: {sorted(missing)[0]}")

        for t in payload.transactions:
            existing = existing_transactions.get(t.id)
            if existing is not None:
                # Only Unpaid to Paid is allowed, so devices can never disagree on a final state.
                if existing.status == "Unpaid" and t.status == "Paid":
                    existing.status = "Paid"
                    counts.transactions += 1
                continue
            new_txn = Transaction(
                id=t.id,
                customer_id=remap.get(t.customer_id, t.customer_id),
                device_id=device.id,
                amount_received=t.amount_received,
                duration_days=t.duration_days,
                status=t.status,
                timestamp=to_naive_utc(t.timestamp) if t.timestamp else utc_now(),
            )
            db.add(new_txn)
            existing_transactions[t.id] = new_txn
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

    return SyncPushResponse(accepted=counts, customer_remap=remap, server_time=utc_now())


def pull_since(db: Session, since: datetime | None) -> SyncPullResponse:
    server_time = utc_now()  # taken before the queries so concurrent commits are not skipped
    customers_q = select(Customer)
    transactions_q = select(Transaction)
    expenses_q = select(OperationalExpense)
    if since is not None:
        since = to_naive_utc(since)
        customers_q = customers_q.where(Customer.modified_at > since)
        transactions_q = transactions_q.where(Transaction.modified_at > since)
        expenses_q = expenses_q.where(OperationalExpense.timestamp > since)

    return SyncPullResponse(
        customers=list(db.execute(customers_q).scalars().all()),
        transactions=list(db.execute(transactions_q).scalars().all()),
        expenses=list(db.execute(expenses_q).scalars().all()),
        server_time=server_time,
    )
