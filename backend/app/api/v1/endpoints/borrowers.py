from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import Borrower
from app.schemas.schemas import BorrowerCreate, BorrowerResponse

router = APIRouter()


@router.post("/", response_model=BorrowerResponse, status_code=status.HTTP_201_CREATED)
def create_borrower(borrower: BorrowerCreate, db: Session = Depends(get_db)):
    db_borrower = Borrower(**borrower.dict())
    db.add(db_borrower)
    db.commit()
    db.refresh(db_borrower)
    return db_borrower


@router.get("/", response_model=List[BorrowerResponse])
def get_borrowers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    borrowers = db.query(Borrower).offset(skip).limit(limit).all()
    return borrowers


@router.get("/{borrower_id}", response_model=BorrowerResponse)
def get_borrower(borrower_id: int, db: Session = Depends(get_db)):
    borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not borrower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrower not found"
        )
    return borrower


@router.put("/{borrower_id}", response_model=BorrowerResponse)
def update_borrower(borrower_id: int, borrower: BorrowerCreate, db: Session = Depends(get_db)):
    db_borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not db_borrower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrower not found"
        )
    
    for key, value in borrower.dict(exclude_unset=True).items():
        setattr(db_borrower, key, value)
    
    db.commit()
    db.refresh(db_borrower)
    return db_borrower


@router.delete("/{borrower_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_borrower(borrower_id: int, db: Session = Depends(get_db)):
    db_borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not db_borrower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrower not found"
        )
    
    db.delete(db_borrower)
    db.commit()
    return None
