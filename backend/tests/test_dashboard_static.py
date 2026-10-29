from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.dashboard_static import mount_dashboard

from .conftest import LAN, LOCAL


def make_app(tmp_path) -> FastAPI:
    (tmp_path / "devices").mkdir()
    (tmp_path / "index.html").write_text("home")
    (tmp_path / "devices" / "index.html").write_text("devices")
    app = FastAPI()

    @app.get("/api/v1/ping")
    def ping():
        return {"ok": True}

    assert mount_dashboard(app, tmp_path)
    return app


def test_dashboard_pages_open_on_the_pc(tmp_path):
    c = TestClient(make_app(tmp_path), client=LOCAL)
    assert c.get("/").text == "home"
    assert c.get("/devices").text == "devices"  # no trailing slash needed
    assert c.get("/nope").status_code == 404


def test_dashboard_refused_from_the_lan(tmp_path):
    c = TestClient(make_app(tmp_path), client=LAN)
    assert c.get("/").status_code == 404
    assert c.get("/devices/").status_code == 404


def test_api_routes_keep_priority_over_the_dashboard(tmp_path):
    c = TestClient(make_app(tmp_path), client=LAN)
    assert c.get("/api/v1/ping").json() == {"ok": True}


def test_missing_dashboard_folder_is_skipped(tmp_path):
    assert mount_dashboard(FastAPI(), tmp_path / "missing") is False
