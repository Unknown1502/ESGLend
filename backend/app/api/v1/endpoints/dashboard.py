from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from app.database.session import get_db
from app.models.models import Loan, ESGKpi, Covenant, Verification, ESGMeasurement, Borrower
from app.schemas.schemas import DashboardStats, LoanPerformance, ESGTrend

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_loans = db.query(func.count(Loan.id)).filter(Loan.status == "active").scalar()
    total_loan_value = db.query(func.sum(Loan.amount)).filter(Loan.status == "active").scalar() or 0
    
    active_verifications = db.query(func.count(Verification.id)).filter(
        Verification.status == "in_progress"
    ).scalar()
    
    total_covenants = db.query(func.count(Covenant.id)).scalar()
    compliant_covenants = db.query(func.count(Covenant.id)).filter(
        Covenant.status == "compliant"
    ).scalar()
    compliance_rate = (compliant_covenants / total_covenants * 100) if total_covenants > 0 else 0
    
    at_risk_loans = db.query(func.count(Loan.id)).join(Covenant).filter(
        Covenant.status == "at_risk"
    ).distinct().scalar()
    
    avg_kpi_performance = db.query(
        func.avg((ESGKpi.current_value / ESGKpi.target_value) * 100)
    ).filter(ESGKpi.target_value > 0).scalar() or 0
    
    return {
        "total_loans": total_loans,
        "total_loan_value": total_loan_value,
        "active_verifications": active_verifications,
        "compliance_rate": round(compliance_rate, 2),
        "at_risk_loans": at_risk_loans,
        "average_esg_score": round(avg_kpi_performance, 2)
    }


@router.get("/loan-performance", response_model=List[LoanPerformance])
def get_loan_performance(limit: int = 10, db: Session = Depends(get_db)):
    loans = db.query(Loan).filter(Loan.status == "active").limit(limit).all()
    
    performance_data = []
    for loan in loans:
        kpis = db.query(ESGKpi).filter(ESGKpi.loan_id == loan.id).all()
        
        if kpis:
            esg_score = sum(
                (kpi.current_value / kpi.target_value * 100) 
                for kpi in kpis if kpi.target_value > 0
            ) / len(kpis)
        else:
            esg_score = 0
        
        covenant = db.query(Covenant).filter(Covenant.loan_id == loan.id).first()
        compliance_status = covenant.status if covenant else "unknown"
        
        latest_verification = db.query(Verification).filter(
            Verification.loan_id == loan.id
        ).order_by(Verification.verification_date.desc()).first()
        
        risk_level = latest_verification.risk_level if latest_verification else "medium"
        
        next_reporting = covenant.next_test_date if covenant else None
        
        performance_data.append({
            "loan_id": loan.id,
            "loan_number": loan.loan_number,
            "borrower_name": loan.borrower.name,
            "esg_score": round(esg_score, 2),
            "compliance_status": compliance_status,
            "risk_level": risk_level,
            "next_reporting_date": next_reporting
        })
    
    return performance_data


@router.get("/esg-trends", response_model=List[ESGTrend])
def get_esg_trends(days: int = 30, db: Session = Depends(get_db)):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    measurements = db.query(
        ESGMeasurement.measurement_date,
        ESGMeasurement.verified_value,
        ESGKpi.kpi_name,
        ESGKpi.status
    ).join(ESGKpi).filter(
        ESGMeasurement.measurement_date >= start_date,
        ESGMeasurement.verification_status == "verified"
    ).order_by(ESGMeasurement.measurement_date).all()
    
    trends = []
    for measurement in measurements:
        trends.append({
            "date": measurement.measurement_date,
            "value": measurement.verified_value,
            "kpi_name": measurement.kpi_name,
            "status": measurement.status
        })
    
    return trends


@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = []
    
    upcoming_covenants = db.query(Covenant).filter(
        Covenant.next_test_date <= datetime.utcnow() + timedelta(days=7),
        Covenant.next_test_date >= datetime.utcnow()
    ).all()
    
    for covenant in upcoming_covenants:
        loan = db.query(Loan).filter(Loan.id == covenant.loan_id).first()
        alerts.append({
            "type": "covenant_due",
            "severity": "medium",
            "message": f"Covenant test due for loan {loan.loan_number}",
            "date": covenant.next_test_date,
            "loan_id": loan.id
        })
    
    at_risk_covenants = db.query(Covenant).filter(
        Covenant.status == "at_risk"
    ).all()
    
    for covenant in at_risk_covenants:
        loan = db.query(Loan).filter(Loan.id == covenant.loan_id).first()
        alerts.append({
            "type": "covenant_risk",
            "severity": "high",
            "message": f"Covenant at risk for loan {loan.loan_number}: {covenant.covenant_type}",
            "loan_id": loan.id
        })
    
    return {"alerts": alerts, "count": len(alerts)}
