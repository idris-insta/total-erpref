"""
HRMS Repositories - Data Access Layer for HRMS module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class EmployeeRepository(BaseRepository):
    """Repository for Employee operations"""
    collection_name = "employees"
    
    async def get_by_department(self, department: str) -> List[Dict[str, Any]]:
        """Get employees by department"""
        return await self.get_all({'department': department})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get employees by status (active, inactive, terminated)"""
        return await self.get_all({'status': status})
    
    async def get_by_code(self, employee_code: str) -> Optional[Dict[str, Any]]:
        """Get employee by code"""
        return await self.get_one({'employee_code': employee_code})
    
    async def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search employees by name, code, or email"""
        return await self.get_all({
            '$or': [
                {'name': {'$regex': query, '$options': 'i'}},
                {'employee_code': {'$regex': query, '$options': 'i'}},
                {'email': {'$regex': query, '$options': 'i'}}
            ]
        }, limit=limit)


class AttendanceRepository(BaseRepository):
    """Repository for Attendance operations"""
    collection_name = "attendance"
    
    async def get_by_employee(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get attendance records for an employee"""
        return await self.get_all({'employee_id': employee_id})
    
    async def get_by_date(self, date: str) -> List[Dict[str, Any]]:
        """Get all attendance records for a date"""
        return await self.get_all({'date': date})
    
    async def get_by_employee_and_date(self, employee_id: str, date: str) -> Optional[Dict[str, Any]]:
        """Get attendance record for an employee on a specific date"""
        return await self.get_one({'employee_id': employee_id, 'date': date})
    
    async def get_monthly_summary(self, employee_id: str, year: int, month: int) -> Dict[str, Any]:
        """Get monthly attendance summary for an employee"""
        month_str = f"{year}-{month:02d}"
        records = await self.get_all({
            'employee_id': employee_id,
            'date': {'$regex': f'^{month_str}'}
        })
        
        present = len([r for r in records if r.get('status') == 'present'])
        absent = len([r for r in records if r.get('status') == 'absent'])
        half_day = len([r for r in records if r.get('status') == 'half_day'])
        total_hours = sum(r.get('hours_worked', 0) for r in records)
        
        return {
            'employee_id': employee_id,
            'year': year,
            'month': month,
            'present': present,
            'absent': absent,
            'half_day': half_day,
            'total_days': present + absent + half_day,
            'total_hours': total_hours
        }


class LeaveRequestRepository(BaseRepository):
    """Repository for Leave Request operations"""
    collection_name = "leave_requests"
    
    async def get_by_employee(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get leave requests for an employee"""
        return await self.get_all({'employee_id': employee_id})
    
    async def get_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get leave requests by status"""
        return await self.get_all({'status': status})
    
    async def get_pending(self) -> List[Dict[str, Any]]:
        """Get pending leave requests"""
        return await self.get_by_status('pending')


class PayrollRepository(BaseRepository):
    """Repository for Payroll operations"""
    collection_name = "payroll"
    
    async def get_by_employee(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get payroll records for an employee"""
        return await self.get_all({'employee_id': employee_id})
    
    async def get_by_month(self, year: int, month: int) -> List[Dict[str, Any]]:
        """Get payroll records for a specific month"""
        return await self.get_all({'year': year, 'month': month})
    
    async def get_by_employee_and_month(self, employee_id: str, year: int, month: int) -> Optional[Dict[str, Any]]:
        """Get payroll record for an employee for a specific month"""
        return await self.get_one({'employee_id': employee_id, 'year': year, 'month': month})


# Repository instances
employee_repository = EmployeeRepository()
attendance_repository = AttendanceRepository()
leave_request_repository = LeaveRequestRepository()
payroll_repository = PayrollRepository()
