from datetime import timedelta

from sqlalchemy import select

from app.database import SessionLocal
from app.models import PairingCode
from app.services.device_service import exchange_pairing_code
from app.services.timeutil import utc_now

from .conftest import pair


def test_pair_returns_token_and_lists_device(client):
    paired = pair(client, "phone-1")
    assert paired["token"]
    devices = client.get("/api/v1/devices").json()
    assert [d["id"] for d in devices] == [paired["device_id"]]
    assert devices[0]["label"] == "phone-1"


def test_code_is_single_use(client):
    code = client.post("/api/v1/devices/pairing-code").json()["pairing_code"]
    body = {"pairing_code": code, "label": "a"}
    assert client.post("/api/v1/devices/pair", json=body).status_code == 201
    assert client.post("/api/v1/devices/pair", json=body).status_code == 400


def test_code_cannot_be_claimed_twice_by_overlapping_requests(client):
    code = client.post("/api/v1/devices/pairing-code").json()["pairing_code"]
    with SessionLocal() as first, SessionLocal() as second:
        stale = second.execute(select(PairingCode)).scalar_one()  # second request saw it unused
        assert not stale.consumed
        assert exchange_pairing_code(first, code, "a") is not None
        assert exchange_pairing_code(second, code, "b") is None


def test_unknown_code_rejected(client):
    res = client.post("/api/v1/devices/pair", json={"pairing_code": "nope", "label": "a"})
    assert res.status_code == 400


def test_expired_code_rejected(client):
    code = client.post("/api/v1/devices/pairing-code").json()["pairing_code"]
    with SessionLocal() as db:
        row = db.execute(select(PairingCode)).scalar_one()
        row.expires_at = utc_now() - timedelta(minutes=1)
        db.commit()
    res = client.post("/api/v1/devices/pair", json={"pairing_code": code, "label": "a"})
    assert res.status_code == 400


def test_raw_code_not_stored(client):
    code = client.post("/api/v1/devices/pairing-code").json()["pairing_code"]
    with SessionLocal() as db:
        assert db.execute(select(PairingCode)).scalar_one().code_hash != code
