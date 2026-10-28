from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.config import settings

DB_PATH = Path(__file__).resolve().parent.parent / settings.database_path
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# check_same_thread=False: Starlette runs sync route handlers in a threadpool.
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA busy_timeout=5000")
    cur.close()


SessionLocal =sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import Base

    Base.metadata.create_all(bind=engine)
    # create_all does not alter existing tables, so add modified_at to databases created before it.
    with engine.begin() as conn:
        for table, backfill in (("customers", "updated_at"), ("transactions", "timestamp")):
            cols = [row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")]
            if "modified_at" not in cols:
                conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN modified_at DATETIME")
                conn.exec_driver_sql(f"UPDATE {table} SET modified_at = {backfill}")
                conn.exec_driver_sql(f"CREATE INDEX ix_{table}_modified_at ON {table} (modified_at)")
