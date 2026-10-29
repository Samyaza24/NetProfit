import uuid
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Device, PairingCode
from app.services.security import generate_device_token, generate_pairing_code, hash_secret
from app.services.timeutil import utc_now

PAIRING_CODE_TTL = timedelta(minutes=10)


def list_devices(db: Session) -> list[Device]:
    return list(db.execute(select(Device)).scalars().all())


def get_device(db: Session, device_id: str) -> Device | None:
    return db.get(Device, device_id)


def create_device(db: Session, device_id: str, label: str, token_hash: str) -> Device:
    device = Device(
        id=device_id,
        label=label,
        token_hash=token_hash,
        paired_at=utc_now(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def create_pairing_code(db: Session) -> tuple[str, PairingCode]:
    raw_code = generate_pairing_code()
    now = utc_now()
    pairing_code = PairingCode(
        id=str(uuid.uuid4()),
        code_hash=hash_secret(raw_code),
        created_at=now,
        expires_at=now + PAIRING_CODE_TTL,
    )
    db.add(pairing_code)
    db.commit()
    db.refresh(pairing_code)
    return raw_code, pairing_code


def exchange_pairing_code(db: Session, code: str, label: str) -> tuple[Device, str] | None:
    # One conditional UPDATE so two simultaneous requests cannot both consume the same code.
    claimed = db.execute(
        update(PairingCode)
        .where(
            PairingCode.code_hash == hash_secret(code),
            PairingCode.consumed.is_(False),
            PairingCode.expires_at >= utc_now(),
        )
        .values(consumed=True)
    )
    db.commit()
    if claimed.rowcount != 1:
        return None

    raw_token = generate_device_token()
    device = create_device(
        db, device_id=str(uuid.uuid4()), label=label, token_hash=hash_secret(raw_token)
    )
    return device, raw_token


def revoke_device(db: Session, device_id: str) -> Device | None:
    device = db.get(Device, device_id)
    if device is None:
        return None
    device.revoked = True
    db.commit()
    db.refresh(device)
    return device
