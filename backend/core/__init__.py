"""
Core Module Exports
"""
from .config import settings, get_settings
from .database import db, get_db, Database
from .security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    get_current_user,
    require_admin,
    require_manager,
    security
)
from .exceptions import (
    AppException,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    DuplicateError,
    BusinessRuleError,
    ExternalServiceError
)

__all__ = [
    # Config
    "settings",
    "get_settings",
    # Database
    "db",
    "get_db",
    "Database",
    # Security
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_token",
    "get_current_user",
    "require_admin",
    "require_manager",
    "security",
    # Exceptions
    "AppException",
    "NotFoundError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "DuplicateError",
    "BusinessRuleError",
    "ExternalServiceError",
]
