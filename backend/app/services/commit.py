from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def commit_or_conflict(db: Session) -> None:
    """Commits; a duplicate or dangling reference becomes a 409 instead of a server error."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicts with existing data (duplicate or unknown reference)")
