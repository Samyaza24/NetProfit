from .conftest import new_id
from .test_sync import SYNC


def test_oversize_fields_rejected(client, auth):
    big = {"customers": [{"id": new_id(), "name": "x" * 256}]}
    assert client.post(SYNC, json=big, headers=auth).status_code == 422
    expense = {"expenses": [{"id": new_id(), "description": "x" * 501, "amount": 1}]}
    assert client.post(SYNC, json=expense, headers=auth).status_code == 422
    pair = {"pairing_code": "x", "label": "x" * 256}
    assert client.post("/api/v1/devices/pair", json=pair).status_code == 422


def test_oversize_batch_rejected(client, auth):
    batch = {"customers": [{"id": new_id(), "name": f"c{i}"} for i in range(1001)]}
    assert client.post(SYNC, json=batch, headers=auth).status_code == 422
