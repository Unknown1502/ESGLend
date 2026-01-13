from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import ESGKpi, ESGMeasurement, Loan
from app.schemas.schemas import ESGKpiCreate, ESGKpiResponse, ESGMeasurementCreate, ESGMeasurementResponse

router = APIRouter()


@router.post("/", response_model=ESGKpiResponse, status_code=status.HTTP_201_CREATED)
def create_esg_kpi(kpi: ESGKpiCreate, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == kpi.loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    db_kpi = ESGKpi(**kpi.dict())
    db.add(db_kpi)
    db.commit()
    db.refresh(db_kpi)
    return db_kpi


@router.get("/", response_model=List[ESGKpiResponse])
def get_esg_kpis(loan_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(ESGKpi)
    if loan_id:
        query = query.filter(ESGKpi.loan_id == loan_id)
    kpis = query.offset(skip).limit(limit).all()
    return kpis


@router.get("/{kpi_id}", response_model=ESGKpiResponse)
def get_esg_kpi(kpi_id: int, db: Session = Depends(get_db)):
    kpi = db.query(ESGKpi).filter(ESGKpi.id == kpi_id).first()
    if not kpi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ESG KPI not found"
        )
    return kpi


@router.post("/{kpi_id}/measurements", response_model=ESGMeasurementResponse, status_code=status.HTTP_201_CREATED)
def create_measurement(kpi_id: int, measurement: ESGMeasurementCreate, db: Session = Depends(get_db)):
    kpi = db.query(ESGKpi).filter(ESGKpi.id == kpi_id).first()
    if not kpi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ESG KPI not found"
        )
    
    db_measurement = ESGMeasurement(**measurement.dict())
    db.add(db_measurement)
    db.commit()
    db.refresh(db_measurement)
    
    kpi.current_value = db_measurement.verified_value or db_measurement.measured_value
    
    target_achievement = (kpi.current_value / kpi.target_value * 100) if kpi.target_value > 0 else 0
    if target_achievement >= 100:
        kpi.status = "achieved"
    elif target_achievement >= 80:
        kpi.status = "on_track"
    else:
        kpi.status = "at_risk"
    
    db.commit()
    
    return db_measurement


@router.get("/{kpi_id}/measurements", response_model=List[ESGMeasurementResponse])
def get_measurements(kpi_id: int, db: Session = Depends(get_db)):
    measurements = db.query(ESGMeasurement).filter(
        ESGMeasurement.kpi_id == kpi_id
    ).order_by(ESGMeasurement.measurement_date.desc()).all()
    return measurements
