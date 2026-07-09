from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

DB_PATH = Path(__file__).resolve().parent.parent / settings.database_path
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# check_same_thread=False: Starlette runs sync route handlers in a threadpool.
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import Base

    Base.metadata.create_all(bind=engine)
