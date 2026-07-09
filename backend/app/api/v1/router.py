from fastapi import APIRouter

from app.api.v1 import customers, dashboard, devices, expenses, health, sync, transactions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(customers.router)
api_router.include_router(transactions.router)
api_router.include_router(expenses.router)
api_router.include_router(devices.router)
api_router.include_router(sync.router)
api_router.include_router(dashboard.router)
