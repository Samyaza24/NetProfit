import uuid
from typing import Annotated

from pydantic import AfterValidator


def _validate_uuid(value: str) -> str:
    uuid.UUID(value)  # enforce RFC 4122 structure before it reaches the service layer
    return value


UUIDStr = Annotated[str, AfterValidator(_validate_uuid)]
