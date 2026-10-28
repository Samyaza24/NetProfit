import logging
import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Customer, OperationalExpense, ServerState, Transaction

logger = logging.getLogger("netprofit")


def get_epoch(db: Session) -> str:
    """The current data version; created on first use."""
    state = db.get(ServerState, 1)
    if state is None:
        try:
            state = ServerState(id=1, data_epoch=str(uuid.uuid4()))
            db.add(state)
            db.commit()
        except IntegrityError:  # another request created it first
            db.rollback()
            state = db.get(ServerState, 1)
    return state.data_epoch


def reset_all(db: Session, source: str) -> tuple[str, dict[str, int]]:
    """Erases every customer, sale and expense and starts a new data version.

    Paired devices stay paired. Phones holding old data see the new version on their next sync and erase
    their copy instead of pushing it back.
    """
    erased = {
        "customers": db.scalar(select(func.count()).select_from(Customer)) or 0,
        "transactions": db.scalar(select(func.count()).select_from(Transaction)) or 0,
        "expenses": db.scalar(select(func.count()).select_from(OperationalExpense)) or 0,
    }
    # Children first: transactions point at customers.
    db.execute(delete(Transaction))
    db.execute(delete(OperationalExpense))
    db.execute(delete(Customer))

    epoch = str(uuid.uuid4())
    state = db.get(ServerState, 1)
    if state is None:
        db.add(ServerState(id=1, data_epoch=epoch))
    else:
        state.data_epoch = epoch
    db.commit()

    logger.warning("All shop data was reset by %s: %s", source, erased)
    return epoch, erased
