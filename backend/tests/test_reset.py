from .conftest import new_id, pair

SYNC = "/api/v1/sync"
RESET = "/api/v1/reset"
CONFIRM = {"confirm": "RESET"}


def seed(client, auth):
    cid = new_id()
    payload = {
        "customers": [{"id": cid, "name": "Ana"}],
        "transactions": [
            {"id": new_id(), "customer_id": cid, "amount_received": 20, "duration_days": 1, "status": "Paid"}
        ],
        "expenses": [{"id": new_id(), "description": "fuel", "amount": 50}],
    }
    res = client.post(SYNC, json=payload, headers=auth)
    assert res.status_code == 200
    return res.json()["data_epoch"]


def test_console_reset_erases_the_shop_data(client, auth):
    seed(client, auth)
    res = client.post(RESET, json=CONFIRM)
    assert res.status_code == 200
    assert res.json()["erased"] == {"customers": 1, "transactions": 1, "expenses": 1}
    assert client.get("/api/v1/customers").json() == []
    assert client.get("/api/v1/transactions").json() == []
    assert client.get("/api/v1/expenses").json() == []
    assert client.get("/api/v1/dashboard").json() == []


def test_reset_keeps_paired_phones_paired(client, device, auth):
    seed(client, auth)
    client.post(RESET, json=CONFIRM)
    assert client.get(SYNC, headers=auth).status_code == 200
    assert [d["id"] for d in client.get("/api/v1/devices").json()] == [device["device_id"]]


def test_reset_needs_the_typed_confirmation(client, auth):
    seed(client, auth)
    for body in ({}, {"confirm": "reset"}, {"confirm": "yes"}, {"confirm": ""}):
        assert client.post(RESET, json=body).status_code == 422
    assert len(client.get("/api/v1/customers").json()) == 1  # nothing was erased


def test_console_reset_is_blocked_from_other_machines_and_sites(lan_client, client):
    assert lan_client.post(RESET, json=CONFIRM).status_code == 403
    assert client.post(RESET, json=CONFIRM, headers={"Origin": "https://evil.example"}).status_code == 403


def test_every_reset_starts_a_new_data_version(client, auth):
    before = seed(client, auth)
    first = client.post(RESET, json=CONFIRM).json()["data_epoch"]
    second = client.post(RESET, json=CONFIRM).json()["data_epoch"]
    assert len({before, first, second}) == 3
    assert client.get(SYNC, headers=auth).json()["data_epoch"] == second


def test_phone_with_old_data_is_refused_after_a_reset(client, auth):
    old = seed(client, auth)
    new = client.post(RESET, json=CONFIRM).json()["data_epoch"]

    stale = {"data_epoch": old, "customers": [{"id": new_id(), "name": "Ghost"}]}
    res = client.post(SYNC, json=stale, headers=auth)
    assert res.status_code == 409
    assert res.json()["detail"] == {"code": "data_reset", "data_epoch": new}
    assert client.get("/api/v1/customers").json() == []  # the stale push was not stored

    fresh = {"data_epoch": new, "customers": [{"id": new_id(), "name": "Ben"}]}
    assert client.post(SYNC, json=fresh, headers=auth).status_code == 200
    assert [c["name"] for c in client.get("/api/v1/customers").json()] == ["Ben"]


def test_phone_without_a_known_version_can_still_sync_and_learns_it(client, auth):
    res = client.post(SYNC, json={"customers": [{"id": new_id(), "name": "Ana"}]}, headers=auth)
    assert res.status_code == 200
    assert res.json()["data_epoch"]
    assert client.get(SYNC, headers=auth).json()["data_epoch"] == res.json()["data_epoch"]


def test_a_phone_can_reset_the_shop_and_other_phones_find_out(client, auth):
    other = {"X-NetProfit-Key": pair(client, "phone-2")["token"]}
    old = seed(client, auth)

    res = client.post(f"{SYNC}/reset", json=CONFIRM, headers=other)
    assert res.status_code == 200
    assert res.json()["erased"]["customers"] == 1
    assert client.get("/api/v1/customers").json() == []

    stale = client.post(SYNC, json={"data_epoch": old}, headers=auth)
    assert stale.status_code == 409
    assert stale.json()["detail"]["data_epoch"] == res.json()["data_epoch"]


def test_phone_reset_needs_a_valid_token_and_the_confirmation(client, auth):
    seed(client, auth)
    assert client.post(f"{SYNC}/reset", json=CONFIRM).status_code == 401
    assert client.post(f"{SYNC}/reset", json=CONFIRM, headers={"X-NetProfit-Key": "bad"}).status_code == 401
    assert client.post(f"{SYNC}/reset", json={"confirm": "no"}, headers=auth).status_code == 422
    assert len(client.get("/api/v1/customers").json()) == 1


def test_a_revoked_phone_cannot_reset(client, device, auth):
    seed(client, auth)
    client.post(f"/api/v1/devices/{device['device_id']}/revoke")
    assert client.post(f"{SYNC}/reset", json=CONFIRM, headers=auth).status_code == 401
    assert len(client.get("/api/v1/customers").json()) == 1


def test_reset_on_an_empty_shop_is_fine(client):
    res = client.post(RESET, json=CONFIRM)
    assert res.status_code == 200
    assert res.json()["erased"] == {"customers": 0, "transactions": 0, "expenses": 0}
