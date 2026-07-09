import hashlib
import hmac
import secrets
import socket

from app.config import settings


def generate_device_token() -> str:
    return secrets.token_urlsafe(32)


def generate_pairing_code() -> str:
    return secrets.token_urlsafe(16)


def hash_secret(raw: str) -> str:
    key = settings.device_token_signing_key.encode()
    return hmac.new(key, raw.encode(), hashlib.sha256).hexdigest()


def get_lan_ip() -> str:
    # UDP connect doesn't send packets; it just makes the OS pick the outbound-facing local IP.
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]


def get_server_url() -> str:
    return f"http://{get_lan_ip()}:{settings.server_port}{settings.api_v1_prefix}"
