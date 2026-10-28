from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ServerState(Base):
    """Single-row table. `data_epoch` changes on every reset so phones holding old data can tell."""

    __tablename__ = "server_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    data_epoch: Mapped[str] = mapped_column(String(36))
