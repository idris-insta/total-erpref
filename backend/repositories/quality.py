"""
Quality Repositories - Data Access Layer for Quality module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class QCInspectionRepository(BaseRepository):
    """Repository for QC Inspection operations"""
    collection_name = "qc_inspections"
    
    async def get_by_type(self, inspection_type: str) -> List[Dict[str, Any]]:
        """Get inspections by type"""
        return await self.get_all({'inspection_type': inspection_type})
    
    async def get_by_result(self, result: str) -> List[Dict[str, Any]]:
        """Get inspections by result (pass/fail)"""
        return await self.get_all({'result': result})
    
    async def get_by_reference(self, reference_type: str, reference_id: str) -> List[Dict[str, Any]]:
        """Get inspections by reference (e.g., work_order, grn)"""
        return await self.get_all({'reference_type': reference_type, 'reference_id': reference_id})
    
    async def get_by_item(self, item_id: str) -> List[Dict[str, Any]]:
        """Get inspections for an item"""
        return await self.get_all({'item_id': item_id})
    
    async def get_failed_inspections(self) -> List[Dict[str, Any]]:
        """Get all failed inspections"""
        return await self.get_by_result('fail')
    
    async def generate_inspection_number(self) -> str:
        """Generate unique inspection number"""
        import uuid
        return f"QC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"


class CustomerComplaintRepository(BaseRepository):
    """Repository for Customer Complaint operations"""
    collection_name = "customer_complaints"
    
    async def get_by_account(self, account_id: str) -> List[Dict[str, Any]]:
        """Get complaints for an account"""
        return await self.get_all({'account_id': account_id})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get complaints by status"""
        return await self.get_all({'status': status})
    
    async def get_by_severity(self, severity: str) -> List[Dict[str, Any]]:
        """Get complaints by severity"""
        return await self.get_all({'severity': severity})
    
    async def get_open_complaints(self) -> List[Dict[str, Any]]:
        """Get all open complaints"""
        return await self.get_all({'status': {'$in': ['open', 'in_progress']}})
    
    async def generate_complaint_number(self) -> str:
        """Generate unique complaint number"""
        count = await self.count()
        return f"CC-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"


class TDSRepository(BaseRepository):
    """Repository for Technical Data Sheet operations"""
    collection_name = "tds"
    
    async def get_by_item(self, item_id: str) -> List[Dict[str, Any]]:
        """Get TDS documents for an item"""
        return await self.get_all({'item_id': item_id})
    
    async def get_latest_by_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get the latest TDS for an item"""
        docs = await self.get_all({'item_id': item_id})
        if docs:
            return sorted(docs, key=lambda x: x.get('created_at', ''), reverse=True)[0]
        return None


class QCParameterRepository(BaseRepository):
    """Repository for QC Parameter Master operations"""
    collection_name = "qc_parameters"
    
    async def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get parameters by category"""
        return await self.get_all({'category': category})
    
    async def get_active(self) -> List[Dict[str, Any]]:
        """Get active parameters"""
        return await self.get_all({'is_active': True})


# Repository instances
qc_inspection_repository = QCInspectionRepository()
customer_complaint_repository = CustomerComplaintRepository()
tds_repository = TDSRepository()
qc_parameter_repository = QCParameterRepository()
