from datetime import datetime, timezone

# SQLite drops tzinfo on round-trip, so the whole app stores/compares naive UTC datetimes.


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
