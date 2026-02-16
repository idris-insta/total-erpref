"""
Sales Incentives Repositories - Data Access Layer for Sales Incentives module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class SalesTargetRepository(BaseRepository):
    """Repository for Sales Target operations"""
    collection_name = "sales_targets"
    
    async def get_by_employee(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get targets for an employee"""
        return await self.get_all({'employee_id': employee_id})
    
    async def get_by_period(self, period: str) -> List[Dict[str, Any]]:
        """Get targets for a period"""
        return await self.get_all({'period': period})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get targets by status"""
        return await self.get_all({'status': status})
    
    async def get_active_targets(self) -> List[Dict[str, Any]]:
        """Get all active targets"""
        return await self.get_all({'status': 'active'})
    
    async def get_employee_current_target(self, employee_id: str, target_type: str, period: str) -> Optional[Dict[str, Any]]:
        """Get current target for an employee"""
        return await self.get_one({
            'employee_id': employee_id,
            'target_type': target_type,
            'period': period
        })


class IncentiveSlabRepository(BaseRepository):
    """Repository for Incentive Slab operations"""
    collection_name = "incentive_slabs"
    
    async def get_active_slabs(self) -> List[Dict[str, Any]]:
        """Get active slabs"""
        return await self.get_all({'is_active': True})
    
    async def get_slab_for_achievement(self, achievement_percent: float) -> Optional[Dict[str, Any]]:
        """Get the applicable slab for a given achievement percentage"""
        slabs = await self.get_active_slabs()
        for slab in sorted(slabs, key=lambda x: x.get('min_achievement', 0)):
            if slab.get('min_achievement', 0) <= achievement_percent <= slab.get('max_achievement', 100):
                return slab
        return None


class IncentivePayoutRepository(BaseRepository):
    """Repository for Incentive Payout operations"""
    collection_name = "incentive_payouts"
    
    async def get_by_employee(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get payouts for an employee"""
        return await self.get_all({'employee_id': employee_id})
    
    async def get_by_period(self, period: str) -> List[Dict[str, Any]]:
        """Get payouts for a period"""
        return await self.get_all({'period': period})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get payouts by status"""
        return await self.get_all({'status': status})
    
    async def get_pending_approval(self) -> List[Dict[str, Any]]:
        """Get payouts pending approval"""
        return await self.get_all({'status': 'calculated'})
    
    async def get_approved_unpaid(self) -> List[Dict[str, Any]]:
        """Get approved but unpaid payouts"""
        return await self.get_all({'status': 'approved'})


class SalesAchievementRepository(BaseRepository):
    """Repository for Sales Achievement tracking"""
    collection_name = "sales_achievements"
    
    async def get_by_employee_and_period(self, employee_id: str, period: str) -> Optional[Dict[str, Any]]:
        """Get achievement for employee in period"""
        return await self.get_one({'employee_id': employee_id, 'period': period})
    
    async def get_leaderboard(self, period: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top achievers for a period"""
        achievements = await self.get_all({'period': period})
        return sorted(achievements, key=lambda x: x.get('achievement_percent', 0), reverse=True)[:limit]


# Repository instances
sales_target_repository = SalesTargetRepository()
incentive_slab_repository = IncentiveSlabRepository()
incentive_payout_repository = IncentivePayoutRepository()
sales_achievement_repository = SalesAchievementRepository()
