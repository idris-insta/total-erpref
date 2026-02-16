"""
Database Connection Module
Centralized MongoDB connection management
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

from core.config import settings

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    
    @classmethod
    def connect(cls) -> AsyncIOMotorDatabase:
        """Connect to MongoDB and return database instance"""
        if cls.client is None:
            cls.client = AsyncIOMotorClient(settings.MONGO_URL)
            cls.db = cls.client[settings.DB_NAME]
            logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
        return cls.db
    
    @classmethod
    def disconnect(cls):
        """Disconnect from MongoDB"""
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("Disconnected from MongoDB")
    
    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get database instance, connecting if necessary"""
        if cls.db is None:
            return cls.connect()
        return cls.db


# Convenience function to get database
def get_db() -> AsyncIOMotorDatabase:
    """Get the database instance"""
    return Database.get_db()


# Initialize connection on module import
db = Database.connect()
