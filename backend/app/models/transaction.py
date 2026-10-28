from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.services.timeutil import utc_now


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), index=True)
    device_id: Mapped[str | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    amount_received: Mapped[float] = mapped_column(Float)
    duration_days: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)

    # Server-assigned, so a status change (Unpaid to Paid) is picked up by other devices' pulls.
    modified_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now, index=True
    )

    customer: Mapped["Customer"] = relationship(back_populates="transactions")
