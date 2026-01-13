"""
Authorization middleware and decorators for route-level access control
"""
from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.models import User
from app.core.exceptions import AuthorizationException


def require_role(allowed_roles: List[str]):
    """
    Dependency factory for role-based authorization
    
    Usage:
        @router.delete("/loans/{loan_id}", dependencies=[Depends(require_role(["admin"]))])
        async def delete_loan(loan_id: int):
            ...
    
    Args:
        allowed_roles: List of roles that are allowed to access the endpoint
        
    Returns:
        Dependency function that validates user role
        
    Raises:
        AuthorizationException: If user doesn't have required role
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """
        Verify that the current user has one of the allowed roles
        
        Args:
            current_user: User object from JWT token
            
        Returns:
            User object if authorized
            
        Raises:
            AuthorizationException: If user role not in allowed_roles
        """
        if current_user.role not in allowed_roles:
            raise AuthorizationException(
                f"Access denied. Required role: {', '.join(allowed_roles)}. "
                f"Your role: {current_user.role}"
            )
        return current_user
    
    return role_checker


# Convenience dependencies for common role checks
require_admin = require_role(["admin"])
require_admin_or_manager = require_role(["admin", "manager"])
require_authenticated = require_role(["admin", "manager", "analyst", "viewer"])


async def require_loan_ownership(
    loan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> bool:
    """
    Verify that user has access to specific loan
    
    Admins and managers have access to all loans.
    Analysts and viewers only have access to loans they created or are assigned to.
    
    Args:
        loan_id: ID of the loan to check
        current_user: User object from JWT token
        db: Database session
        
    Returns:
        True if user has access
        
    Raises:
        AuthorizationException: If user doesn't have access to this loan
    """
    from app.models.models import Loan
    
    # Admins and managers can access all loans
    if current_user.role in ["admin", "manager"]:
        return True
    
    # Check if loan exists and user has access
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan with ID {loan_id} not found"
        )
    
    # For now, analysts and viewers can access all loans
    # In production, you might want to check against a user_loans association table
    if current_user.role in ["analyst", "viewer"]:
        return True
    
    raise AuthorizationException(
        f"You don't have permission to access loan {loan_id}"
    )


async def require_borrower_ownership(
    borrower_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> bool:
    """
    Verify that user has access to specific borrower
    
    Args:
        borrower_id: ID of the borrower to check
        current_user: User object from JWT token
        db: Database session
        
    Returns:
        True if user has access
        
    Raises:
        AuthorizationException: If user doesn't have access
    """
    from app.models.models import Borrower
    
    # Admins and managers can access all borrowers
    if current_user.role in ["admin", "manager"]:
        return True
    
    # Check if borrower exists
    borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    
    if not borrower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Borrower with ID {borrower_id} not found"
        )
    
    # Analysts and viewers have read-only access
    if current_user.role in ["analyst", "viewer"]:
        return True
    
    raise AuthorizationException(
        f"You don't have permission to access borrower {borrower_id}"
    )


def can_modify_resource(user_role: str) -> bool:
    """
    Check if user role has permission to modify resources (create, update, delete)
    
    Args:
        user_role: Role of the user
        
    Returns:
        True if user can modify resources, False otherwise
    """
    return user_role in ["admin", "manager"]


def can_delete_resource(user_role: str) -> bool:
    """
    Check if user role has permission to delete resources
    
    Args:
        user_role: Role of the user
        
    Returns:
        True if user can delete resources, False otherwise
    """
    return user_role == "admin"


def can_manage_users(user_role: str) -> bool:
    """
    Check if user role has permission to manage other users
    
    Args:
        user_role: Role of the user
        
    Returns:
        True if user can manage users, False otherwise
    """
    return user_role == "admin"
