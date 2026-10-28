import os
import tempfile
import uuid
from pathlib import Path

# Must be set before app modules import settings and build the engine.
os.environ["DEVICE_TOKEN_SIGNING_KEY"] = "test-signing-key-0123456789-abcdefghij"
os.environ["DATABASE_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.api.v1 import devices  # noqa: E402
from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402

LOCAL = ("127.0.0.1", 50000)
LAN = ("192.168.1.50", 50000)


@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):
    monkeypatch.setattr(devices, "get_server_url", lambda: "http://test/api/v1")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, client=LOCAL, base_url="http://localhost:8001")


@pytest.fixture
def lan_client() -> TestClient:
    return TestClient(app, client=LAN)


def pair(client: TestClient, label: str = "phone") -> dict:
    code = client.post("/api/v1/devices/pairing-code").json()["pairing_code"]
    res = client.post("/api/v1/devices/pair", json={"pairing_code": code, "label": label})
    assert res.status_code == 201
    return res.json()


@pytest.fixture
def device(client) -> dict:
    return pair(client)


@pytest.fixture
def auth(device) -> dict:
    return {"X-NetProfit-Key": device["token"]}


def new_id() -> str:
    return str(uuid.uuid4())
