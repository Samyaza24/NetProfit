import pytest
from pydantic import ValidationError

from app.config import Settings


def test_short_or_empty_signing_key_rejected():
    for key in ("", "short"):
        with pytest.raises(ValidationError):
            Settings(device_token_signing_key=key)
