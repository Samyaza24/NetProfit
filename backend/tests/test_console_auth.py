import pytest

CONSOLE = [
    ("get", "/api/v1/dashboard"),
    ("get", "/api/v1/customers"),
    ("get", "/api/v1/transactions"),
    ("get", "/api/v1/expenses"),
    ("get", "/api/v1/devices"),
    ("post", "/api/v1/devices/pairing-code"),
    ("post", "/api/v1/devices/some-id/revoke"),
]


@pytest.mark.parametrize("method,path", CONSOLE)
def test_console_blocked_from_lan(lan_client, method, path):
    assert getattr(lan_client, method)(path).status_code == 403


@pytest.mark.parametrize("method,path", CONSOLE[:5])
def test_console_open_on_localhost(client, method, path):
    assert getattr(client, method)(path).status_code == 200


def test_phone_routes_open_from_lan(lan_client):
    assert lan_client.get("/api/v1/health").status_code == 200
    # Reaches the handler (400 bad code / 401 no token), not the 403 locality check.
    assert lan_client.post("/api/v1/devices/pair", json={"pairing_code": "x", "label": "a"}).status_code == 400
    assert lan_client.get("/api/v1/sync").status_code == 401
