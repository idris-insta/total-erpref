"""
Production Repositories - Data Access Layer for Production module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class MachineRepository(BaseRepository):
    """Repository for Machine Master operations"""
    collection_name = "machines"
    
    async def get_active(self) -> List[Dict[str, Any]]:
        """Get all active machines"""
        return await self.get_all({'status': 'active'})
    
    async def get_by_type(self, machine_type: str) -> List[Dict[str, Any]]:
        """Get machines by type (coating, slitting, rewinding, etc.)"""
        return await self.get_all({'machine_type': machine_type})
    
    async def get_available(self) -> List[Dict[str, Any]]:
        """Get machines available for production"""
        return await self.get_all({'status': 'active', 'current_job': None})


class OrderSheetRepository(BaseRepository):
    """Repository for Order Sheet (Production Order) operations"""
    collection_name = "order_sheets"
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get order sheets by status"""
        return await self.get_all({'status': status})
    
    async def get_pending(self) -> List[Dict[str, Any]]:
        """Get pending order sheets"""
        return await self.get_all({'status': {'$in': ['pending', 'in_progress']}})
    
    async def generate_order_number(self) -> str:
        """Generate unique order sheet number"""
        count = await self.count()
        return f"OS-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"


class WorkOrderRepository(BaseRepository):
    """Repository for Work Order operations"""
    collection_name = "work_orders"
    
    async def get_by_order_sheet(self, order_sheet_id: str) -> List[Dict[str, Any]]:
        """Get work orders for an order sheet"""
        return await self.get_all({'order_sheet_id': order_sheet_id})
    
    async def get_by_stage(self, stage: str) -> List[Dict[str, Any]]:
        """Get work orders by production stage"""
        return await self.get_all({'stage': stage})
    
    async def get_by_machine(self, machine_id: str) -> List[Dict[str, Any]]:
        """Get work orders assigned to a machine"""
        return await self.get_all({'machine_id': machine_id})
    
    async def get_in_progress(self) -> List[Dict[str, Any]]:
        """Get work orders in progress"""
        return await self.get_all({'status': 'in_progress'})
    
    async def generate_wo_number(self) -> str:
        """Generate unique work order number"""
        count = await self.count()
        return f"WO-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"


class ProductionEntryRepository(BaseRepository):
    """Repository for Production Entry (actual production log) operations"""
    collection_name = "production_entries"
    
    async def get_by_work_order(self, work_order_id: str) -> List[Dict[str, Any]]:
        """Get production entries for a work order"""
        return await self.get_all({'work_order_id': work_order_id})
    
    async def get_by_machine(self, machine_id: str, date: str = None) -> List[Dict[str, Any]]:
        """Get production entries for a machine"""
        query = {'machine_id': machine_id}
        if date:
            query['production_date'] = date
        return await self.get_all(query)
    
    async def get_by_date_range(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Get production entries within date range"""
        return await self.get_all({
            'production_date': {'$gte': start_date, '$lte': end_date}
        })


class RMRequisitionRepository(BaseRepository):
    """Repository for Raw Material Requisition operations"""
    collection_name = "rm_requisitions"
    
    async def get_by_work_order(self, work_order_id: str) -> List[Dict[str, Any]]:
        """Get RM requisitions for a work order"""
        return await self.get_all({'work_order_id': work_order_id})
    
    async def get_pending(self) -> List[Dict[str, Any]]:
        """Get pending RM requisitions"""
        return await self.get_all({'status': 'pending'})
    
    async def generate_requisition_number(self) -> str:
        """Generate unique requisition number"""
        count = await self.count()
        return f"RMR-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"


# Repository instances
machine_repository = MachineRepository()
order_sheet_repository = OrderSheetRepository()
work_order_repository = WorkOrderRepository()
production_entry_repository = ProductionEntryRepository()
rm_requisition_repository = RMRequisitionRepository()
