from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.models import Loan, User, ESGKpi, Verification
from app.schemas.schemas import LoanCreate, LoanUpdate, LoanResponse, ESGKpiResponse, VerificationResponse
from app.services.loan_service import LoanService
from app.core.security import get_current_user
from app.core.authorization import require_admin, require_admin_or_manager
from app.core.exceptions import LoanNotFoundException

router = APIRouter()


@router.post("/", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
def create_loan(
    loan: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new sustainability-linked loan
    
    Requires: authenticated user
    """
    return LoanService.create_loan(db, loan)


@router.get("/")
@router.get("")
def get_loans(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all loans with optional filtering
    
    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        status: Optional filter by loan status
        
    Requires: authenticated user
    """
    loans = LoanService.get_loans(db, skip, limit, status)
    return {"loans": loans, "total": len(loans)}


@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single loan by ID
    
    Requires: authenticated user
    """
    return LoanService.get_loan_by_id(db, loan_id)


@router.put("/{loan_id}", response_model=LoanResponse)
def update_loan(
    loan_id: int,
    loan: LoanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_manager)
):
    """
    Update an existing loan
    
    Requires: admin or manager role
    """
    return LoanService.update_loan(db, loan_id, loan)


@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a loan (admin only)
    
    Requires: admin role
    """
    LoanService.delete_loan(db, loan_id)
    return None


@router.get("/{loan_id}/esg-kpis", response_model=List[ESGKpiResponse])
def get_loan_esg_kpis(
    loan_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all ESG KPIs for a specific loan"""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise LoanNotFoundException(loan_id)
    kpis = db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
    return kpis


@router.get("/{loan_id}/verifications", response_model=List[VerificationResponse])
def get_loan_verifications(
    loan_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all verifications for a specific loan"""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise LoanNotFoundException(loan_id)
    verifications = db.query(Verification).filter(Verification.loan_id == loan_id).all()
    return verifications

