from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import DataSource
from app.schemas.schemas import DataSourceCreate, DataSourceResponse

router = APIRouter()


@router.post("/", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
def create_data_source(data_source: DataSourceCreate, db: Session = Depends(get_db)):
    db_data_source = DataSource(**data_source.dict())
    db.add(db_data_source)
    db.commit()
    db.refresh(db_data_source)
    return db_data_source


@router.get("/", response_model=List[DataSourceResponse])
def get_data_sources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    data_sources = db.query(DataSource).offset(skip).limit(limit).all()
    return data_sources


@router.get("/{source_id}", response_model=DataSourceResponse)
def get_data_source(source_id: int, db: Session = Depends(get_db)):
    data_source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )
    return data_source


@router.get("/category/{category}", response_model=List[DataSourceResponse])
def get_data_sources_by_category(category: str, db: Session = Depends(get_db)):
    data_sources = db.query(DataSource).filter(
        DataSource.category == category,
        DataSource.is_active == True
    ).all()
    return data_sources
