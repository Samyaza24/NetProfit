from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.api.deps import LOCAL_HOSTS

# The built dashboard (npm run build in web/); when it is missing the API still runs on its own.
WEB_DIR = Path(__file__).resolve().parent.parent.parent / "web" / "out"


class LocalStaticFiles(StaticFiles):
    # Same rule as the console routes: the dashboard opens on the PC itself. The LAN just sees 404.
    async def get_response(self, path, scope):
        peer = (scope.get("client") or (None,))[0]
        if peer not in LOCAL_HOSTS:
            return PlainTextResponse("Not Found", status_code=404)
        return await super().get_response(path, scope)


def mount_dashboard(app: FastAPI, directory: Path = WEB_DIR) -> bool:
    """Serves the built dashboard at /. Call after the API routes so they keep priority."""
    if not directory.is_dir():
        return False
    app.mount("/", LocalStaticFiles(directory=directory, html=True), name="dashboard")
    return True
