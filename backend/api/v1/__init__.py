"""
API V1 Package - Version 1 of the API
"""
from .crm import router as crm_router
from .inventory import router as inventory_router

__all__ = ["crm_router", "inventory_router"]
