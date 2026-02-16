"""
API V1 Package - Version 1 of the API
"""
from .crm import router as crm_router
from .inventory import router as inventory_router
from .production import router as production_router
from .accounts import router as accounts_router
from .hrms import router as hrms_router
from .procurement import router as procurement_router

__all__ = [
    "crm_router",
    "inventory_router",
    "production_router",
    "accounts_router",
    "hrms_router",
    "procurement_router"
]
