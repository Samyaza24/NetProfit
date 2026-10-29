import socket

from app.services.security import get_lan_ip


def _offline(self, *args):
    raise OSError("Network is unreachable")


def test_lan_ip_falls_back_to_hostname_when_offline(monkeypatch):
    monkeypatch.setattr(socket.socket, "connect", _offline)
    monkeypatch.setattr(socket, "gethostbyname", lambda _: "192.168.1.20")
    assert get_lan_ip() == "192.168.1.20"


def test_lan_ip_falls_back_to_loopback_as_last_resort(monkeypatch):
    def fail(_):
        raise OSError("no hostname")

    monkeypatch.setattr(socket.socket, "connect", _offline)
    monkeypatch.setattr(socket, "gethostbyname", fail)
    assert get_lan_ip() == "127.0.0.1"
