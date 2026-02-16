"""
Accounts Repositories - Data Access Layer for Accounts module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class InvoiceRepository(BaseRepository):
    """Repository for Invoice operations"""
    collection_name = "invoices"
    
    async def get_by_type(self, invoice_type: str) -> List[Dict[str, Any]]:
        """Get invoices by type (Sales, Purchase, Credit Note, Debit Note)"""
        return await self.get_all({'invoice_type': invoice_type})
    
    async def get_by_account(self, account_id: str) -> List[Dict[str, Any]]:
        """Get invoices for an account"""
        return await self.get_all({'account_id': account_id})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get invoices by status"""
        return await self.get_all({'status': status})
    
    async def get_overdue(self) -> List[Dict[str, Any]]:
        """Get overdue invoices"""
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        return await self.get_all({
            'status': {'$in': ['sent', 'partial']},
            'due_date': {'$lt': today}
        })
    
    async def generate_invoice_number(self, invoice_type: str = "Sales") -> str:
        """Generate unique invoice number"""
        prefix = "INV" if invoice_type == "Sales" else "PINV" if invoice_type == "Purchase" else "CN" if invoice_type == "Credit Note" else "DN"
        count = await self.count({'invoice_type': invoice_type})
        return f"{prefix}-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    async def get_pending_amount(self, account_id: str) -> float:
        """Get total pending amount for an account"""
        pipeline = [
            {'$match': {'account_id': account_id, 'status': {'$in': ['sent', 'partial', 'overdue']}}},
            {'$group': {'_id': None, 'total': {'$sum': '$balance_amount'}}}
        ]
        result = await self.aggregate(pipeline)
        return result[0]['total'] if result else 0


class PaymentRepository(BaseRepository):
    """Repository for Payment operations"""
    collection_name = "payments"
    
    async def get_by_type(self, payment_type: str) -> List[Dict[str, Any]]:
        """Get payments by type (receipt, payment)"""
        return await self.get_all({'payment_type': payment_type})
    
    async def get_by_account(self, account_id: str) -> List[Dict[str, Any]]:
        """Get payments for an account"""
        return await self.get_all({'account_id': account_id})
    
    async def generate_payment_number(self, payment_type: str = "receipt") -> str:
        """Generate unique payment number"""
        prefix = "REC" if payment_type == "receipt" else "PAY"
        count = await self.count({'payment_type': payment_type})
        return f"{prefix}-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"


class JournalEntryRepository(BaseRepository):
    """Repository for Journal Entry operations"""
    collection_name = "journal_entries"
    
    async def get_by_date_range(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Get journal entries within date range"""
        return await self.get_all({
            'entry_date': {'$gte': start_date, '$lte': end_date}
        })
    
    async def generate_entry_number(self) -> str:
        """Generate unique journal entry number"""
        count = await self.count()
        return f"JE-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"


class ChartOfAccountsRepository(BaseRepository):
    """Repository for Chart of Accounts operations"""
    collection_name = "chart_of_accounts"
    
    async def get_by_type(self, account_type: str) -> List[Dict[str, Any]]:
        """Get accounts by type (Asset, Liability, Equity, Revenue, Expense)"""
        return await self.get_all({'account_type': account_type})
    
    async def get_by_parent(self, parent_id: str) -> List[Dict[str, Any]]:
        """Get child accounts"""
        return await self.get_all({'parent_id': parent_id})


# Repository instances
invoice_repository = InvoiceRepository()
payment_repository = PaymentRepository()
journal_entry_repository = JournalEntryRepository()
coa_repository = ChartOfAccountsRepository()
