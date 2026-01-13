"""
Loan Service - Business logic for loan operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.models import Loan, Borrower
from app.schemas.schemas import LoanCreate, LoanUpdate
from app.core.exceptions import LoanNotFoundException, BorrowerNotFoundException


class LoanService:
    """
    Service class for handling loan business logic
    """

    @staticmethod
    def get_loans(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Loan]:
        """
        Retrieve loans with optional filtering and pagination
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional filter by loan status
            
        Returns:
            List of Loan objects with eagerly loaded relationships
        """
        query = db.query(Loan).options(joinedload(Loan.borrower))
        
        if status:
            query = query.filter(Loan.status == status)
        
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_loan_by_id(db: Session, loan_id: int) -> Loan:
        """
        Retrieve a single loan by ID
        
        Args:
            db: Database session
            loan_id: ID of the loan to retrieve
            
        Returns:
            Loan object with eagerly loaded relationships
            
        Raises:
            LoanNotFoundException: If loan with given ID doesn't exist
        """
        loan = (
            db.query(Loan)
            .options(joinedload(Loan.borrower))
            .filter(Loan.id == loan_id)
            .first()
        )
        
        if not loan:
            raise LoanNotFoundException(loan_id)
        
        return loan

    @staticmethod
    def create_loan(db: Session, loan_data: LoanCreate) -> Loan:
        """
        Create a new loan
        
        Args:
            db: Database session
            loan_data: Loan creation data
            
        Returns:
            Newly created Loan object
            
        Raises:
            BorrowerNotFoundException: If borrower doesn't exist
        """
        # Validate borrower exists
        borrower = db.query(Borrower).filter(
            Borrower.id == loan_data.borrower_id
        ).first()
        
        if not borrower:
            raise BorrowerNotFoundException(loan_data.borrower_id)
        
        # Create loan
        loan = Loan(**loan_data.model_dump())
        db.add(loan)
        db.commit()
        db.refresh(loan)
        
        return loan

    @staticmethod
    def update_loan(
        db: Session,
        loan_id: int,
        loan_data: LoanUpdate
    ) -> Loan:
        """
        Update an existing loan
        
        Args:
            db: Database session
            loan_id: ID of the loan to update
            loan_data: Updated loan data
            
        Returns:
            Updated Loan object
            
        Raises:
            LoanNotFoundException: If loan doesn't exist
            BorrowerNotFoundException: If new borrower_id doesn't exist
        """
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        
        if not loan:
            raise LoanNotFoundException(loan_id)
        
        # If borrower_id is being updated, validate it exists
        if loan_data.borrower_id and loan_data.borrower_id != loan.borrower_id:
            borrower = db.query(Borrower).filter(
                Borrower.id == loan_data.borrower_id
            ).first()
            
            if not borrower:
                raise BorrowerNotFoundException(loan_data.borrower_id)
        
        # Update loan attributes
        for field, value in loan_data.model_dump(exclude_unset=True).items():
            setattr(loan, field, value)
        
        db.commit()
        db.refresh(loan)
        
        return loan

    @staticmethod
    def delete_loan(db: Session, loan_id: int) -> None:
        """
        Delete a loan
        
        Args:
            db: Database session
            loan_id: ID of the loan to delete
            
        Raises:
            LoanNotFoundException: If loan doesn't exist
        """
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        
        if not loan:
            raise LoanNotFoundException(loan_id)
        
        db.delete(loan)
        db.commit()

    @staticmethod
    def get_loan_statistics(db: Session) -> dict:
        """
        Calculate loan portfolio statistics
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with statistics (total_loans, total_amount, avg_interest_rate, etc.)
        """
        stats = db.query(
            func.count(Loan.id).label('total_loans'),
            func.sum(Loan.amount).label('total_amount'),
            func.avg(Loan.interest_rate).label('avg_interest_rate'),
            func.count(Loan.id).filter(Loan.status == 'active').label('active_loans')
        ).first()
        
        return {
            'total_loans': stats.total_loans or 0,
            'total_amount': float(stats.total_amount or 0),
            'avg_interest_rate': float(stats.avg_interest_rate or 0),
            'active_loans': stats.active_loans or 0
        }

    @staticmethod
    def get_loans_by_borrower(db: Session, borrower_id: int) -> List[Loan]:
        """
        Get all loans for a specific borrower
        
        Args:
            db: Database session
            borrower_id: ID of the borrower
            
        Returns:
            List of Loan objects
            
        Raises:
            BorrowerNotFoundException: If borrower doesn't exist
        """
        borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
        
        if not borrower:
            raise BorrowerNotFoundException(borrower_id)
        
        return db.query(Loan).filter(Loan.borrower_id == borrower_id).all()
