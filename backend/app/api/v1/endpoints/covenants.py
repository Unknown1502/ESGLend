from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import Covenant, Loan
from app.schemas.schemas import CovenantCreate, CovenantResponse

router = APIRouter()


@router.post("/", response_model=CovenantResponse, status_code=status.HTTP_201_CREATED)
def create_covenant(covenant: CovenantCreate, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == covenant.loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    db_covenant = Covenant(**covenant.dict())
    db.add(db_covenant)
    db.commit()
    db.refresh(db_covenant)
    return db_covenant


@router.get("/", response_model=List[CovenantResponse])
def get_covenants(loan_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Covenant)
    if loan_id:
        query = query.filter(Covenant.loan_id == loan_id)
    covenants = query.offset(skip).limit(limit).all()
    return covenants


@router.get("/{covenant_id}", response_model=CovenantResponse)
def get_covenant(covenant_id: int, db: Session = Depends(get_db)):
    covenant = db.query(Covenant).filter(Covenant.id == covenant_id).first()
    if not covenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Covenant not found"
        )
    return covenant


@router.put("/{covenant_id}", response_model=CovenantResponse)
def update_covenant(covenant_id: int, covenant: CovenantCreate, db: Session = Depends(get_db)):
    db_covenant = db.query(Covenant).filter(Covenant.id == covenant_id).first()
    if not db_covenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Covenant not found"
        )
    
    for key, value in covenant.dict(exclude_unset=True).items():
        setattr(db_covenant, key, value)
    
    if db_covenant.threshold and db_covenant.current_value:
        if db_covenant.current_value < db_covenant.threshold:
            db_covenant.status = "breached"
        elif db_covenant.current_value < db_covenant.threshold * 1.1:
            db_covenant.status = "at_risk"
        else:
            db_covenant.status = "compliant"
    
    db.commit()
    db.refresh(db_covenant)
    return db_covenant
