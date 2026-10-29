from .conftest import new_id

API = "/api/v1"


def test_duplicate_customer_name_is_409_ignoring_case(client):
    assert client.post(f"{API}/customers", json={"id": new_id(), "name": "Ana"}).status_code == 201
    assert client.post(f"{API}/customers", json={"id": new_id(), "name": "ana"}).status_code == 409


def test_rename_onto_existing_name_is_409(client):
    client.post(f"{API}/customers", json={"id": new_id(), "name": "Ana"})
    other = new_id()
    client.post(f"{API}/customers", json={"id": other, "name": "Ben"})
    assert client.patch(f"{API}/customers/{other}", json={"name": "ANA"}).status_code == 409
    assert client.patch(f"{API}/customers/{other}", json={"name": "Ben"}).status_code == 200


def test_transaction_for_unknown_customer_is_409(client):
    body = {"id": new_id(), "customer_id": new_id(), "amount_received": 20, "duration_days": 1, "status": "Paid"}
    assert client.post(f"{API}/transactions", json=body).status_code == 409
