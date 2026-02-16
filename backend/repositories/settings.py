"""
Settings Repositories - Data Access Layer for Settings module
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from repositories.base import BaseRepository
from core.database import db


class FieldConfigurationRepository(BaseRepository):
    """Repository for Field Configuration operations (Field Registry)"""
    collection_name = "field_configurations"
    
    async def get_by_module(self, module: str) -> List[Dict[str, Any]]:
        """Get configurations for a module"""
        return await self.get_all({'module': module})
    
    async def get_by_module_and_entity(self, module: str, entity: str) -> Optional[Dict[str, Any]]:
        """Get configuration for specific module and entity"""
        return await self.get_one({'module': module, 'entity': entity})
    
    async def get_all_modules(self) -> List[str]:
        """Get list of all modules"""
        configs = await self.get_all()
        return list(set(c.get('module') for c in configs if c.get('module')))
    
    async def upsert_config(self, module: str, entity: str, config: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create or update a field configuration"""
        existing = await self.get_by_module_and_entity(module, entity)
        if existing:
            return await self.update(existing['id'], config, user_id)
        else:
            config['module'] = module
            config['entity'] = entity
            return await self.create(config, user_id)


class SystemSettingRepository(BaseRepository):
    """Repository for System Settings operations"""
    collection_name = "system_settings"
    
    async def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get settings by category"""
        return await self.get_all({'category': category})
    
    async def get_setting(self, key: str) -> Optional[Dict[str, Any]]:
        """Get a specific setting by key"""
        return await self.get_one({'key': key})
    
    async def set_setting(self, key: str, value: Any, user_id: str, category: str = "general") -> Dict[str, Any]:
        """Set a system setting"""
        existing = await self.get_setting(key)
        if existing:
            return await self.update(existing['id'], {'value': value}, user_id)
        else:
            return await self.create({
                'key': key,
                'value': value,
                'category': category
            }, user_id)


class CompanyProfileRepository(BaseRepository):
    """Repository for Company Profile operations"""
    collection_name = "company_profiles"
    
    async def get_active_profile(self) -> Optional[Dict[str, Any]]:
        """Get the active company profile"""
        return await self.get_one({'is_active': True})
    
    async def get_by_gstin(self, gstin: str) -> Optional[Dict[str, Any]]:
        """Get company by GSTIN"""
        return await self.get_one({'gstin': gstin})


class BranchRepository(BaseRepository):
    """Repository for Branch operations"""
    collection_name = "branches"
    
    async def get_active_branches(self) -> List[Dict[str, Any]]:
        """Get all active branches"""
        return await self.get_all({'is_active': True})
    
    async def get_by_state(self, state: str) -> List[Dict[str, Any]]:
        """Get branches by state"""
        return await self.get_all({'state': state})
    
    async def get_head_office(self) -> Optional[Dict[str, Any]]:
        """Get the head office branch"""
        return await self.get_one({'is_head_office': True})


class UserRepository(BaseRepository):
    """Repository for User operations"""
    collection_name = "users"
    
    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        return await self.get_one({'email': email})
    
    async def get_by_role(self, role: str) -> List[Dict[str, Any]]:
        """Get users by role"""
        return await self.get_all({'role': role})
    
    async def get_active_users(self) -> List[Dict[str, Any]]:
        """Get all active users"""
        return await self.get_all({'is_active': True})


# Repository instances
field_configuration_repository = FieldConfigurationRepository()
system_setting_repository = SystemSettingRepository()
company_profile_repository = CompanyProfileRepository()
branch_repository = BranchRepository()
user_repository = UserRepository()
