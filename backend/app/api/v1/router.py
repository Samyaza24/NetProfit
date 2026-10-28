from fastapi import APIRouter, Depends

from app.api.deps import require_local
from app.api.v1 import customers, dashboard, devices, expenses, health, sync, transactions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(devices.pair_router)
api_router.include_router(sync.router)

# Console routes: reachable only from the operator's own PC.
console = [Depends(require_local)]
api_router.include_router(customers.router, dependencies=console)
api_router.include_router(transactions.router, dependencies=console)
api_router.include_router(expenses.router, dependencies=console)
api_router.include_router(devices.router, dependencies=console)
api_router.include_router(dashboard.router, dependencies=console)
