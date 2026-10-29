"""Daily backup of the shop database. Run from backend/: python -m app.backup"""

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

KEEP = 14


def _prune(folder: Path, keep: int) -> None:
    for old in sorted(folder.glob("netprofit-*.db"))[:-keep]:
        old.unlink()


def make_backup(db_path: Path, backup_dir: Path, copy_dir: Path | None = None, keep: int = KEEP) -> Path:
    """Copies the live database with SQLite's own backup (safe while the server is writing)."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    target = backup_dir / f"netprofit-{datetime.now():%Y%m%d-%H%M%S}.db"
    src = sqlite3.connect(db_path)
    dst = sqlite3.connect(target)
    try:
        src.backup(dst)
        if dst.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("Backup failed its integrity check")
    finally:
        dst.close()
        src.close()
    _prune(backup_dir, keep)

    if copy_dir is not None:  # a second place (USB drive, synced folder) in case this disk fails
        copy_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, copy_dir / target.name)
        _prune(copy_dir, keep)
    return target


if __name__ == "__main__":
    from app.config import settings
    from app.database import DB_PATH

    copy = Path(settings.backup_copy_dir) if settings.backup_copy_dir else None
    print(f"Backup written: {make_backup(DB_PATH, DB_PATH.parent / 'backups', copy)}")
