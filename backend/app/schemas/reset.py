from typing import Literal

from pydantic import BaseModel


class ResetRequest(BaseModel):
    # Typed by the operator; anything else is rejected, so a stray request cannot wipe the data.
    confirm: Literal["RESET"]


class ResetResponse(BaseModel):
    data_epoch: str
    erased: dict[str, int]
