from .conftest import new_id, pair

SYNC = "/api/v1/sync"


def txn(customer_id: str, **kw) -> dict:
    return {
        "id": new_id(),
        "customer_id": customer_id,
        "amount_received": 20,
        "duration_days": 1,
        "status": "Paid",
        **kw,
    }


def test_sync_requires_valid_token(client, auth):
    assert client.post(SYNC, json={}).status_code == 401
    assert client.post(SYNC, json={}, headers={"X-NetProfit-Key": "bad"}).status_code == 401
    assert client.post(SYNC, json={}, headers=auth).status_code == 200


def test_revoked_device_rejected(client, device, auth):
    client.post(f"/api/v1/devices/{device['device_id']}/revoke")
    assert client.get(SYNC, headers=auth).status_code == 401


def test_push_new_customer_with_dependent_transaction(client, auth):
    cid = new_id()
    payload = {
        "customers": [{"id": cid, "name": "Ana"}],
        "transactions": [txn(cid)],
        "expenses": [{"id": new_id(), "description": "fuel", "amount": 50}],
    }
    res = client.post(SYNC, json=payload, headers=auth)
    assert res.status_code == 200
    assert res.json()["accepted"] == {"customers": 1, "transactions": 1, "expenses": 1}


def test_push_keeps_client_timestamp(client, auth):
    cid, ts = new_id(), "2020-01-02T03:04:05Z"
    payload = {
        "customers": [{"id": cid, "name": "Ana"}],
        "transactions": [txn(cid, timestamp=ts)],
        "expenses": [{"id": new_id(), "description": "fuel", "amount": 50, "timestamp": ts}],
    }
    assert client.post(SYNC, json=payload, headers=auth).status_code == 200
    pulled = client.get(SYNC, headers=auth).json()
    assert pulled["transactions"][0]["timestamp"].startswith("2020-01-02T03:04:05")
    assert pulled["expenses"][0]["timestamp"].startswith("2020-01-02T03:04:05")


def test_push_rejects_unknown_customer(client, auth):
    res = client.post(SYNC, json={"transactions": [txn(new_id())]}, headers=auth)
    assert res.status_code == 422
    assert client.get(SYNC, headers=auth).json()["transactions"] == []


def test_push_is_idempotent(client, auth):
    cid = new_id()
    # Mobile clients always send updated_at; without it the server stamps "now" on every push.
    customer = {"id": cid, "name": "Ana", "updated_at": "2026-01-01T00:00:00"}
    payload = {"customers": [customer], "transactions": [txn(cid)]}
    client.post(SYNC, json=payload, headers=auth)
    again = client.post(SYNC, json=payload, headers=auth).json()["accepted"]
    assert again == {"customers": 0, "transactions": 0, "expenses": 0}
    assert len(client.get("/api/v1/transactions").json()) == 1


def test_push_tags_rows_with_device_and_updates_last_synced(client, device, auth):
    cid = new_id()
    client.post(SYNC, json={"customers": [{"id": cid, "name": "Ana"}], "transactions": [txn(cid)]}, headers=auth)
    assert client.get("/api/v1/transactions").json()[0]["device_id"] == device["device_id"]
    assert client.get(f"/api/v1/devices/{device['device_id']}").json()["last_synced_at"]


def test_pull_since_returns_only_newer(client, auth):
    cid = new_id()
    first = client.post(SYNC, json={"customers": [{"id": cid, "name": "Ana"}]}, headers=auth).json()
    cursor = first["server_time"]
    assert client.get(SYNC, params={"since": cursor}, headers=auth).json()["customers"] == []
    assert len(client.get(SYNC, headers=auth).json()["customers"]) == 1


def test_pull_sees_customer_pushed_with_old_client_timestamp(client, auth):
    cursor = client.get(SYNC, headers=auth).json()["server_time"]
    cid = new_id()
    client.post(SYNC, json={"customers": [{"id": cid, "name": "Ana", "updated_at": "2000-01-01T00:00:00"}]}, headers=auth)
    pulled = client.get(SYNC, params={"since": cursor}, headers=auth).json()
    assert [c["id"] for c in pulled["customers"]] == [cid]


def test_pull_includes_other_devices_rows(client, auth):
    other = pair(client, "phone-2")
    cid = new_id()
    client.post(SYNC, json={"customers": [{"id": cid, "name": "Ana"}]}, headers={"X-NetProfit-Key": other["token"]})
    assert [c["id"] for c in client.get(SYNC, headers=auth).json()["customers"]] == [cid]


def test_customer_last_write_wins(client, auth):
    cid = new_id()
    def push(name: str, ts: str):
        client.post(SYNC, json={"customers": [{"id": cid, "name": name, "updated_at": ts}]}, headers=auth)

    push("Newer", "2026-01-02T00:00:00")
    push("Older", "2026-01-01T00:00:00")
    assert client.get(f"/api/v1/customers/{cid}").json()["name"] == "Newer"
    push("Newest", "2026-01-03T00:00:00")
    assert client.get(f"/api/v1/customers/{cid}").json()["name"] == "Newest"
