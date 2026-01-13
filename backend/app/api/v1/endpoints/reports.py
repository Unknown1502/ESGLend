from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.database.session import get_db
from app.models.models import Report, Loan
from app.schemas.schemas import ReportCreate, ReportResponse

router = APIRouter()


@router.post("/generate", response_model=dict)
async def generate_report(
    request: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == request.loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    valid_types = ["sfdr_level2", "eu_taxonomy", "esg_performance", "covenant_compliance", "verification_summary"]
    if request.report_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid report type. Must be one of: {', '.join(valid_types)}"
        )
    
    report = Report(
        loan_id=request.loan_id,
        report_type=request.report_type,
        report_period_start=datetime.fromisoformat(request.report_period_start),
        report_period_end=datetime.fromisoformat(request.report_period_end),
        status="completed",
        file_url=f"/reports/{request.report_type}_{request.loan_id}_{datetime.utcnow().strftime('%Y%m%d')}.pdf",
        report_metadata={"generated_by": "system"}
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return {
        "report_id": report.id,
        "status": "completed",
        "message": "Report generated successfully"
    }


@router.get("/", response_model=List[ReportResponse])
def get_reports(loan_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Report)
    if loan_id:
        query = query.filter(Report.loan_id == loan_id)
    reports = query.order_by(Report.generated_date.desc()).offset(skip).limit(limit).all()
    return reports


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    return report
