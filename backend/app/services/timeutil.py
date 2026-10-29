from datetime import datetime, timedelta, timezone

# SQLite drops tzinfo on round-trip, so the whole app stores/compares naive UTC datetimes.


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def client_time(dt: datetime | None) -> datetime:
    """A phone's timestamp as naive UTC, capped one day ahead so a wrong or hostile clock cannot win forever."""
    now = utc_now()
    return min(to_naive_utc(dt), now + timedelta(days=1)) if dt else now
