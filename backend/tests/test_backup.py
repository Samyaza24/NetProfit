import sqlite3

from app.backup import make_backup


def make_db(path, rows: int):
    con = sqlite3.connect(path)
    con.execute("PRAGMA journal_mode=WAL")  # the live database runs in WAL mode
    con.execute("CREATE TABLE t (n INTEGER)")
    con.executemany("INSERT INTO t VALUES (?)", [(i,) for i in range(rows)])
    con.commit()
    return con  # left open, like a running server


def count(path) -> int:
    con = sqlite3.connect(path)
    try:
        return con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    finally:
        con.close()


def test_backup_restores_with_every_row(tmp_path):
    live = make_db(tmp_path / "live.db", 25)
    backup = make_backup(tmp_path / "live.db", tmp_path / "backups")
    live.close()
    assert count(backup) == 25


def test_old_backups_are_pruned_and_copy_dir_gets_a_copy(tmp_path):
    live = make_db(tmp_path / "live.db", 3)
    for day in range(1, 5):  # four older backups already on disk
        (tmp_path / "backups").mkdir(exist_ok=True)
        (tmp_path / "backups" / f"netprofit-2020010{day}-000000.db").write_bytes(b"x")
    newest = make_backup(tmp_path / "live.db", tmp_path / "backups", tmp_path / "usb", keep=2)
    live.close()
    kept = sorted(p.name for p in (tmp_path / "backups").glob("netprofit-*.db"))
    assert len(kept) == 2 and newest.name in kept
    assert [p.name for p in (tmp_path / "usb").glob("*.db")] == [newest.name]
