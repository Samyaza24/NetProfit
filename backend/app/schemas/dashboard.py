from pydantic import BaseModel


class DashboardRow(BaseModel):
    id: str
    name: str
    total_visits: int
    lifetime_value: float
    outstanding_debt: float
