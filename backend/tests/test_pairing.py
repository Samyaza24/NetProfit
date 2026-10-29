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


def test_overlong_pairing_code_rejected(client):
    res = client.post("/api/v1/devices/pair", json={"pairing_code": "x" * 65, "label": "a"})
    assert res.status_code == 422


def test_old_pairing_codes_are_purged_on_new_code(client):
    client.post("/api/v1/devices/pairing-code")
    with SessionLocal() as db:
        row = db.execute(select(PairingCode)).scalar_one()
        row.expires_at = utc_now() - timedelta(minutes=1)
        db.commit()
    client.post("/api/v1/devices/pairing-code")
    with SessionLocal() as db:
        assert len(db.execute(select(PairingCode)).scalars().all()) == 1


def test_pairing_code_refused_without_network(client, monkeypatch):
    from app.api.v1 import devices

    monkeypatch.setattr(devices, "get_server_url", lambda: "http://127.0.0.1:8001/api/v1")
    assert client.post("/api/v1/devices/pairing-code").status_code == 409
