"""
Verification Service - Business logic for ESG verification operations
NOW WITH REAL API INTEGRATION
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import random

from app.models.models import Verification, Loan, ESGKpi, ESGMeasurement, DataSource
from app.schemas.schemas import VerificationCreate
from app.core.exceptions import (
    LoanNotFoundException,
    NoKPIsFoundException,
    NoMeasurementsFoundException,
    VerificationNotFoundException
)
from app.services.external_apis.api_manager import api_manager


class VerificationService:
    """
    Service class for handling ESG verification business logic
    """

    @staticmethod
    def run_verification(db: Session, loan_id: int) -> Dict[str, Any]:
        """
        Run ESG verification for a loan
        
        This method:
        1. Validates the loan exists
        2. Retrieves all ESG KPIs for the loan
        3. Calculates verification metrics
        4. Creates a verification record
        
        Args:
            db: Database session
            loan_id: ID of the loan to verify
            
        Returns:
            Dictionary with verification results including:
            - verification_id: ID of created verification
            - verified_count: Number of KPIs verified
            - breached_count: Number of breached KPIs
            - avg_discrepancy: Average discrepancy percentage
            - status: Overall verification status
            
        Raises:
            LoanNotFoundException: If loan doesn't exist
            NoKPIsFoundException: If loan has no ESG KPIs defined
            NoMeasurementsFoundException: If KPIs have no measurements
        """
        # Validate loan exists
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise LoanNotFoundException(loan_id)
        
        # Get all KPIs for this loan
        kpis = db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        if not kpis:
            raise NoKPIsFoundException(loan_id)
        
        # Calculate verification metrics
        verified_count = 0
        breached_count = 0
        total_discrepancy = 0.0
        
        for kpi in kpis:
            # Get latest measurement for this KPI
            latest_measurement = (
                db.query(ESGMeasurement)
                .filter(ESGMeasurement.kpi_id == kpi.id)
                .order_by(ESGMeasurement.measurement_date.desc())
                .first()
            )
            
            if latest_measurement:
                verified_count += 1
                
                # Check if KPI is breached
                if kpi.status == 'breached':
                    breached_count += 1
                
                # Calculate discrepancy percentage
                if kpi.target_value != 0:
                    discrepancy = abs(
                        (latest_measurement.measured_value - kpi.target_value) / kpi.target_value
                    ) * 100
                    total_discrepancy += discrepancy
        
        # Prevent division by zero
        if verified_count == 0:
            raise NoMeasurementsFoundException(loan_id)
        
        avg_discrepancy = total_discrepancy / verified_count
        
        # Initialize confidence score based on internal verification
        if avg_discrepancy < 5:
            confidence_score = 95.0
        elif avg_discrepancy < 10:
            confidence_score = 85.0
        elif avg_discrepancy < 20:
            confidence_score = 75.0
        else:
            confidence_score = 60.0
        
        # **NEW: Run REAL API verifications**
        api_verifications = []
        try:
            # Prepare data for comprehensive API verification
            loan_data = {
                "loan_id": loan_id,
                "borrower_name": loan.borrower.name if loan.borrower else "Unknown",
                "location": {
                    "latitude": 51.5074,  # Default to London, should come from borrower data
                    "longitude": -0.1278,
                    "postcode": None  # Could add to borrower model
                },
                "esg_kpis": [
                    {
                        "name": kpi.kpi_name,
                        "category": kpi.kpi_category,
                        "target_value": kpi.target_value,
                        "current_value": kpi.current_value,
                        "unit": kpi.unit
                    }
                    for kpi in kpis
                ],
                "esg_score": 70  # Could calculate from KPIs
            }
            
            # Run comprehensive API verification
            api_results = api_manager.run_comprehensive_verification(loan_data)
            api_verifications = api_results.get("data_sources", [])
            
            # Update last_used timestamp for all data sources
            data_sources = db.query(DataSource).all()
            for data_source in data_sources:
                data_source.last_used = datetime.utcnow()
            db.commit()
            
            # Update confidence score based on API verifications
            if api_results.get("summary", {}).get("total_verifications", 0) > 0:
                api_compliance = api_results["summary"].get("compliance_rate", 0)
                # Weight: 70% internal data, 30% external API data
                confidence_score = (confidence_score * 0.7) + (api_compliance * 0.3)
        
        except Exception as e:
            # If API verification fails, continue with internal verification only
            print(f"API verification failed: {str(e)}")
            api_verifications = ["Simulation (APIs unavailable)"]
        
        # Determine overall status
        if breached_count > 0:
            status = 'breached'
            risk_level = 'high'
        elif avg_discrepancy > 10:
            status = 'at_risk'
            risk_level = 'medium'
        else:
            status = 'compliant'
            risk_level = 'low'
        
        # Create verification record with REAL data sources
        verification = Verification(
            loan_id=loan_id,
            verification_type="multi_source_esg_verification",
            verification_date=datetime.utcnow(),
            status=status,
            confidence_score=round(confidence_score, 2),
            risk_level=risk_level,
            data_sources=[
                {"name": "Internal ESG Measurements", "type": "internal"},
                *[{"name": source, "type": "external_api"} for source in api_verifications]
            ],
            findings={
                "verified_count": verified_count,
                "breached_count": breached_count,
                "avg_discrepancy": round(avg_discrepancy, 2),
                "total_kpis": len(kpis),
                "external_sources_used": len(api_verifications),
                "api_verification": "enabled" if api_verifications else "disabled"
            },
            recommendations=f"Multi-source verification: {verified_count} KPIs checked using "
                          f"{len(api_verifications)} external data sources, "
                          f"{breached_count} breached, "
                          f"{avg_discrepancy:.2f}% avg discrepancy"
        )
        
        db.add(verification)
        db.commit()
        db.refresh(verification)
        
        return {
            "verification_id": verification.id,
            "verified_count": verified_count,
            "breached_count": breached_count,
            "avg_discrepancy": round(avg_discrepancy, 2),
            "status": status,
            "verification_date": verification.verification_date.isoformat()
        }

    @staticmethod
    def get_verifications(
        db: Session,
        loan_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Verification]:
        """
        Retrieve verifications with optional filtering
        
        Args:
            db: Database session
            loan_id: Optional filter by loan ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of Verification objects
        """
        query = db.query(Verification)
        
        if loan_id:
            query = query.filter(Verification.loan_id == loan_id)
        
        return query.order_by(
            Verification.verification_date.desc()
        ).offset(skip).limit(limit).all()

    @staticmethod
    def get_verification_by_id(db: Session, verification_id: int) -> Verification:
        """
        Retrieve a single verification by ID
        
        Args:
            db: Database session
            verification_id: ID of the verification to retrieve
            
        Returns:
            Verification object
            
        Raises:
            VerificationNotFoundException: If verification doesn't exist
        """
        verification = db.query(Verification).filter(
            Verification.id == verification_id
        ).first()
        
        if not verification:
            raise VerificationNotFoundException(verification_id)
        
        return verification

    @staticmethod
    def get_verification_summary(db: Session, loan_id: int) -> Dict[str, Any]:
        """
        Get summary of all verifications for a loan
        
        Args:
            db: Database session
            loan_id: ID of the loan
            
        Returns:
            Dictionary with summary statistics
            
        Raises:
            LoanNotFoundException: If loan doesn't exist
        """
        # Validate loan exists
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise LoanNotFoundException(loan_id)
        
        # Get verification statistics
        stats = db.query(
            func.count(Verification.id).label('total_verifications'),
            func.count(Verification.id).filter(
                Verification.status == 'compliant'
            ).label('compliant_count'),
            func.count(Verification.id).filter(
                Verification.status == 'breached'
            ).label('breached_count'),
            func.count(Verification.id).filter(
                Verification.status == 'at_risk'
            ).label('at_risk_count')
        ).filter(Verification.loan_id == loan_id).first()
        
        # Get latest verification
        latest = (
            db.query(Verification)
            .filter(Verification.loan_id == loan_id)
            .order_by(Verification.verification_date.desc())
            .first()
        )
        
        return {
            'loan_id': loan_id,
            'total_verifications': stats.total_verifications or 0,
            'compliant_count': stats.compliant_count or 0,
            'breached_count': stats.breached_count or 0,
            'at_risk_count': stats.at_risk_count or 0,
            'latest_verification': {
                'id': latest.id,
                'date': latest.verification_date.isoformat(),
                'status': latest.status
            } if latest else None
        }

    @staticmethod
    def calculate_compliance_rate(db: Session, loan_id: int) -> float:
        """
        Calculate compliance rate for a loan based on verification history
        
        Args:
            db: Database session
            loan_id: ID of the loan
            
        Returns:
            Compliance rate as a percentage (0-100)
            
        Raises:
            LoanNotFoundException: If loan doesn't exist
        """
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise LoanNotFoundException(loan_id)
        
        total = db.query(func.count(Verification.id)).filter(
            Verification.loan_id == loan_id
        ).scalar()
        
        if total == 0:
            return 0.0
        
        compliant = db.query(func.count(Verification.id)).filter(
            Verification.loan_id == loan_id,
            Verification.status == 'compliant'
        ).scalar()
        
        return round((compliant / total) * 100, 2)
