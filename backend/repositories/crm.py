"""
CRM Repositories - Data Access Layer for CRM module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class LeadRepository(BaseRepository):
    """Repository for Lead operations"""
    collection_name = "leads"
    
    async def get_by_status(self, status: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get leads by status"""
        return await self.get_all({'status': status}, limit=limit)
    
    async def get_kanban_data(self, stages: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """Get leads grouped by status for Kanban view"""
        result = {}
        for stage in stages:
            result[stage] = await self.get_by_status(stage)
        return result
    
    async def update_status(self, lead_id: str, new_status: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Update lead status"""
        return await self.update(lead_id, {'status': new_status}, user_id)
    
    async def get_by_assigned_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get leads assigned to a specific user"""
        return await self.get_all({'assigned_to': user_id})
    
    async def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search leads by company name, contact person, or email"""
        return await self.get_all({
            '$or': [
                {'company_name': {'$regex': query, '$options': 'i'}},
                {'contact_person': {'$regex': query, '$options': 'i'}},
                {'email': {'$regex': query, '$options': 'i'}}
            ]
        }, limit=limit)


class AccountRepository(BaseRepository):
    """Repository for Account (Customer/Supplier) operations"""
    collection_name = "accounts"
    
    async def get_by_type(self, account_type: str) -> List[Dict[str, Any]]:
        """Get accounts by type (customer/supplier/both)"""
        if account_type == 'all':
            return await self.get_all()
        return await self.get_all({'account_type': {'$in': [account_type, 'both']}})
    
    async def get_customers(self) -> List[Dict[str, Any]]:
        """Get all customer accounts"""
        return await self.get_all({'account_type': {'$in': ['customer', 'both']}})
    
    async def get_suppliers(self) -> List[Dict[str, Any]]:
        """Get all supplier accounts"""
        return await self.get_all({'account_type': {'$in': ['supplier', 'both']}})
    
    async def get_by_gstin(self, gstin: str) -> Optional[Dict[str, Any]]:
        """Get account by GSTIN"""
        return await self.get_one({'gstin': gstin})
    
    async def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search accounts by name or GSTIN"""
        return await self.get_all({
            '$or': [
                {'customer_name': {'$regex': query, '$options': 'i'}},
                {'gstin': {'$regex': query, '$options': 'i'}}
            ]
        }, limit=limit)
    
    async def get_with_balance(self, account_id: str) -> Optional[Dict[str, Any]]:
        """Get account with calculated receivable/payable balance"""
        account = await self.get_by_id(account_id)
        if not account:
            return None
        
        # Calculate receivable from invoices
        pipeline = [
            {'$match': {'account_id': account_id, 'status': {'$ne': 'cancelled'}}},
            {'$group': {'_id': None, 'total': {'$sum': '$balance_due'}}}
        ]
        receivable = await db.invoices.aggregate(pipeline).to_list(1)
        account['receivable_amount'] = receivable[0]['total'] if receivable else 0
        
        return account


class QuotationRepository(BaseRepository):
    """Repository for Quotation operations"""
    collection_name = "quotations"
    
    async def get_by_account(self, account_id: str) -> List[Dict[str, Any]]:
        """Get quotations for an account"""
        return await self.get_all({'account_id': account_id})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get quotations by status"""
        return await self.get_all({'status': status})
    
    async def generate_quote_number(self) -> str:
        """Generate unique quote number"""
        count = await self.count()
        return f"QT-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    async def update_status(self, quote_id: str, status: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Update quotation status"""
        return await self.update(quote_id, {'status': status}, user_id)
    
    async def get_total_value(self, status: Optional[str] = None) -> float:
        """Get total value of quotations"""
        query = {} if not status else {'status': status}
        pipeline = [
            {'$match': query},
            {'$group': {'_id': None, 'total': {'$sum': '$grand_total'}}}
        ]
        result = await self.aggregate(pipeline)
        return result[0]['total'] if result else 0


class SampleRepository(BaseRepository):
    """Repository for Sample operations"""
    collection_name = "samples"
    
    async def get_by_account(self, account_id: str) -> List[Dict[str, Any]]:
        """Get samples for an account"""
        return await self.get_all({'account_id': account_id})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get samples by status"""
        return await self.get_all({'status': status})
    
    async def generate_sample_number(self) -> str:
        """Generate unique sample number"""
        count = await self.count()
        return f"SMP-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    async def get_pending_feedback(self) -> List[Dict[str, Any]]:
        """Get samples pending feedback"""
        return await self.get_all({
            'status': 'feedback_pending',
            'feedback_due_date': {'$lte': datetime.now().isoformat()}
        })


# Repository instances
lead_repository = LeadRepository()
account_repository = AccountRepository()
quotation_repository = QuotationRepository()
sample_repository = SampleRepository()
