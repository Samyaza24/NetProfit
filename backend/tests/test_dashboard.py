from .test_sync import SYNC, txn
from .conftest import new_id


def test_crm_aggregates(client, auth):
    cid = new_id()
    payload = {
        "customers": [{"id": cid, "name": "Ana"}, {"id": new_id(), "name": "Ben"}],
        "transactions": [
            txn(cid, amount_received=20, status="Paid"),
            txn(cid, amount_received=50, duration_days=5, status="Paid"),
            txn(cid, amount_received=70, duration_days=7, status="Unpaid"),
        ],
    }
    client.post(SYNC, json=payload, headers=auth)
    rows = {r["name"]: r for r in client.get("/api/v1/dashboard").json()}
    assert rows["Ana"]["total_visits"] == 3
    assert rows["Ana"]["lifetime_value"] == 70
    assert rows["Ana"]["outstanding_debt"] == 70
    assert rows["Ben"]["total_visits"] == 0
    assert rows["Ben"]["lifetime_value"] == 0
