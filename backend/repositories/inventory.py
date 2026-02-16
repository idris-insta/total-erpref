"""
Inventory Repositories - Data Access Layer for Inventory module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class ItemRepository(BaseRepository):
    """Repository for Item (Product) operations"""
    collection_name = "items"
    
    async def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get items by category"""
        return await self.get_all({'category': category})
    
    async def get_by_type(self, item_type: str) -> List[Dict[str, Any]]:
        """Get items by type"""
        return await self.get_all({'item_type': item_type})
    
    async def get_by_hsn(self, hsn_code: str) -> Optional[Dict[str, Any]]:
        """Get item by HSN code"""
        return await self.get_one({'hsn_code': hsn_code})
    
    async def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search items by name, code, or HSN"""
        return await self.get_all({
            '$or': [
                {'item_name': {'$regex': query, '$options': 'i'}},
                {'item_code': {'$regex': query, '$options': 'i'}},
                {'hsn_code': {'$regex': query, '$options': 'i'}}
            ]
        }, limit=limit)
    
    async def get_low_stock(self, threshold: int = None) -> List[Dict[str, Any]]:
        """Get items with stock below reorder level"""
        query = {'$expr': {'$lt': ['$stock_qty', '$reorder_level']}}
        if threshold:
            query = {'stock_qty': {'$lt': threshold}}
        return await self.get_all(query)
    
    async def update_stock(self, item_id: str, qty_change: float, user_id: str) -> Optional[Dict[str, Any]]:
        """Update item stock quantity"""
        item = await self.get_by_id(item_id)
        if not item:
            return None
        new_qty = item.get('stock_qty', 0) + qty_change
        return await self.update(item_id, {'stock_qty': new_qty}, user_id)


class WarehouseRepository(BaseRepository):
    """Repository for Warehouse operations"""
    collection_name = "warehouses"
    
    async def get_by_gstin(self, gstin: str) -> Optional[Dict[str, Any]]:
        """Get warehouse by GSTIN"""
        return await self.get_one({'gstin': gstin})
    
    async def get_active(self) -> List[Dict[str, Any]]:
        """Get all active warehouses"""
        return await self.get_all({'is_active': True})


class StockRepository(BaseRepository):
    """Repository for Stock operations (item stock per warehouse)"""
    collection_name = "stock"
    
    async def get_by_warehouse(self, warehouse_id: str) -> List[Dict[str, Any]]:
        """Get all stock for a warehouse"""
        return await self.get_all({'warehouse_id': warehouse_id})
    
    async def get_by_item(self, item_id: str) -> List[Dict[str, Any]]:
        """Get stock across all warehouses for an item"""
        return await self.get_all({'item_id': item_id})
    
    async def get_stock(self, item_id: str, warehouse_id: str) -> Optional[Dict[str, Any]]:
        """Get stock for specific item in specific warehouse"""
        return await self.get_one({'item_id': item_id, 'warehouse_id': warehouse_id})
    
    async def update_stock(self, item_id: str, warehouse_id: str, qty_change: float, user_id: str) -> Dict[str, Any]:
        """Update stock quantity for an item in a warehouse"""
        existing = await self.get_stock(item_id, warehouse_id)
        if existing:
            new_qty = existing.get('qty', 0) + qty_change
            return await self.update(existing['id'], {'qty': new_qty}, user_id)
        else:
            return await self.create({
                'item_id': item_id,
                'warehouse_id': warehouse_id,
                'qty': qty_change
            }, user_id)


class StockTransferRepository(BaseRepository):
    """Repository for Stock Transfer operations"""
    collection_name = "stock_transfers"
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get transfers by status"""
        return await self.get_all({'status': status})
    
    async def get_pending(self) -> List[Dict[str, Any]]:
        """Get pending transfers"""
        return await self.get_by_status('pending')
    
    async def get_in_transit(self) -> List[Dict[str, Any]]:
        """Get transfers in transit"""
        return await self.get_by_status('in_transit')


class StockAdjustmentRepository(BaseRepository):
    """Repository for Stock Adjustment operations"""
    collection_name = "stock_adjustments"
    
    async def get_by_type(self, adjustment_type: str) -> List[Dict[str, Any]]:
        """Get adjustments by type"""
        return await self.get_all({'adjustment_type': adjustment_type})
    
    async def get_pending_approval(self) -> List[Dict[str, Any]]:
        """Get adjustments pending approval"""
        return await self.get_all({'status': 'pending'})


class BatchRepository(BaseRepository):
    """Repository for Batch tracking operations"""
    collection_name = "batches"
    
    async def get_by_item(self, item_id: str) -> List[Dict[str, Any]]:
        """Get all batches for an item"""
        return await self.get_all({'item_id': item_id})
    
    async def get_expiring_soon(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get batches expiring within specified days"""
        from datetime import timedelta
        future_date = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        return await self.get_all({
            'expiry_date': {'$lte': future_date, '$gte': datetime.now(timezone.utc).isoformat()}
        })


# Repository instances
item_repository = ItemRepository()
warehouse_repository = WarehouseRepository()
stock_repository = StockRepository()
stock_transfer_repository = StockTransferRepository()
stock_adjustment_repository = StockAdjustmentRepository()
batch_repository = BatchRepository()
