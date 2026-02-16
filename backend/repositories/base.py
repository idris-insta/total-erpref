"""
Base Repository Pattern
Generic repository for MongoDB operations
"""
from typing import TypeVar, Generic, List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from motor.motor_asyncio import AsyncIOMotorCollection

from ..core.database import db
from ..core.exceptions import NotFoundError, DuplicateError

T = TypeVar('T')


class BaseRepository(Generic[T]):
    """
    Base repository class providing common CRUD operations
    All repositories should inherit from this class
    """
    
    collection_name: str = ""
    
    def __init__(self):
        if not self.collection_name:
            raise ValueError("collection_name must be defined")
        self._collection: AsyncIOMotorCollection = db[self.collection_name]
    
    @property
    def collection(self) -> AsyncIOMotorCollection:
        """Get the MongoDB collection"""
        return self._collection
    
    # ==================== CREATE ====================
    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new document"""
        doc = {
            **data,
            'id': data.get('id') or str(uuid.uuid4()),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        if user_id:
            doc['created_by'] = user_id
            doc['updated_by'] = user_id
        
        await self._collection.insert_one(doc)
        return await self.get_by_id(doc['id'])
    
    async def create_many(self, documents: List[Dict[str, Any]], user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Create multiple documents"""
        now = datetime.now(timezone.utc).isoformat()
        docs = []
        for data in documents:
            doc = {
                **data,
                'id': data.get('id') or str(uuid.uuid4()),
                'created_at': now,
                'updated_at': now,
            }
            if user_id:
                doc['created_by'] = user_id
            docs.append(doc)
        
        if docs:
            await self._collection.insert_many(docs)
        return docs
    
    # ==================== READ ====================
    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        doc = await self._collection.find_one({'id': id}, {'_id': 0})
        return doc
    
    async def get_by_id_or_raise(self, id: str, resource_name: str = "Resource") -> Dict[str, Any]:
        """Get a document by ID or raise NotFoundError"""
        doc = await self.get_by_id(id)
        if not doc:
            raise NotFoundError(resource_name, id)
        return doc
    
    async def get_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get a single document matching the query"""
        return await self._collection.find_one(query, {'_id': 0})
    
    async def get_all(
        self,
        query: Optional[Dict[str, Any]] = None,
        sort_by: str = 'created_at',
        sort_order: int = -1,
        limit: int = 1000,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Get all documents matching the query"""
        cursor = self._collection.find(query or {}, {'_id': 0})
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        return await cursor.to_list(limit)
    
    async def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        """Count documents matching the query"""
        return await self._collection.count_documents(query or {})
    
    async def exists(self, query: Dict[str, Any]) -> bool:
        """Check if a document exists"""
        return await self._collection.count_documents(query, limit=1) > 0
    
    # ==================== UPDATE ====================
    async def update(
        self,
        id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a document by ID"""
        update_data = {
            **data,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        if user_id:
            update_data['updated_by'] = user_id
        
        # Remove None values and id from update
        update_data = {k: v for k, v in update_data.items() if v is not None and k != 'id'}
        
        result = await self._collection.update_one(
            {'id': id},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return None
        return await self.get_by_id(id)
    
    async def update_or_raise(
        self,
        id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        resource_name: str = "Resource"
    ) -> Dict[str, Any]:
        """Update a document or raise NotFoundError"""
        result = await self.update(id, data, user_id)
        if not result:
            raise NotFoundError(resource_name, id)
        return result
    
    async def update_many(self, query: Dict[str, Any], data: Dict[str, Any]) -> int:
        """Update multiple documents"""
        data['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = await self._collection.update_many(query, {'$set': data})
        return result.modified_count
    
    async def upsert(self, query: Dict[str, Any], data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Update or insert a document"""
        existing = await self.get_one(query)
        if existing:
            return await self.update(existing['id'], data, user_id)
        else:
            return await self.create({**query, **data}, user_id)
    
    # ==================== DELETE ====================
    async def delete(self, id: str) -> bool:
        """Delete a document by ID"""
        result = await self._collection.delete_one({'id': id})
        return result.deleted_count > 0
    
    async def delete_or_raise(self, id: str, resource_name: str = "Resource") -> bool:
        """Delete a document or raise NotFoundError"""
        if not await self.delete(id):
            raise NotFoundError(resource_name, id)
        return True
    
    async def delete_many(self, query: Dict[str, Any]) -> int:
        """Delete multiple documents"""
        result = await self._collection.delete_many(query)
        return result.deleted_count
    
    # ==================== AGGREGATION ====================
    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run an aggregation pipeline"""
        cursor = self._collection.aggregate(pipeline)
        return await cursor.to_list(None)
    
    async def distinct(self, field: str, query: Optional[Dict[str, Any]] = None) -> List[Any]:
        """Get distinct values for a field"""
        return await self._collection.distinct(field, query or {})
