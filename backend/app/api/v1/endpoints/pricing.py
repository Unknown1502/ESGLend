from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.core.authorization import get_current_user
from app.models.models import User
from app.services.pricing_engine import LoanPricingEngine


router = APIRouter()


class PricingCalculationRequest(BaseModel):
    """Request model for pricing calculation."""
    loan_id: int = Field(..., description="Loan ID")
    environmental_score: Optional[float] = Field(None, ge=0, le=100, description="Environmental performance score")
    social_score: Optional[float] = Field(None, ge=0, le=100, description="Social performance score")
    governance_score: Optional[float] = Field(None, ge=0, le=100, description="Governance performance score")


class PricingScenarioRequest(BaseModel):
    """Request model for pricing scenario simulation."""
    loan_id: int = Field(..., description="Loan ID")
    scenarios: List[Dict[str, float]] = Field(
        ..., 
        description="List of scenarios with environmental_score, social_score, governance_score"
    )


class PricingResponse(BaseModel):
    """Response model for pricing calculation."""
    loan_id: int
    loan_number: str
    esg_performance_score: float
    pricing_tier: str
    margin_adjustment_bps: float
    current_rate: float
    new_rate: float
    annual_impact: float
    last_update: str


class PricingHistoryResponse(BaseModel):
    """Response model for pricing history."""
    loan_id: int
    loan_number: str
    history: List[Dict]


class PricingScenarioResponse(BaseModel):
    """Response model for pricing scenarios."""
    loan_id: int
    loan_number: str
    scenarios: Dict[str, Dict]  # Changed from List[Dict] to Dict[str, Dict]


@router.post("/calculate", response_model=PricingResponse, status_code=status.HTTP_200_OK)
async def calculate_loan_pricing(
    request: PricingCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate dynamic loan pricing based on ESG performance.
    
    This endpoint calculates the ESG-adjusted interest rate for a loan based on
    environmental, social, and governance performance scores.
    
    - **loan_id**: The ID of the loan to calculate pricing for
    - **environmental_score**: Optional environmental performance score (0-100)
    - **social_score**: Optional social performance score (0-100)
    - **governance_score**: Optional governance performance score (0-100)
    
    If scores are not provided, they will be calculated from loan KPIs.
    """
    try:
        pricing_engine = LoanPricingEngine(db)
        
        # Calculate pricing
        result = pricing_engine.update_loan_pricing(
            loan_id=request.loan_id,
            user_id=current_user.id,
            reason="Dynamic pricing calculation via API"
        )
        
        return PricingResponse(
            loan_id=result["loan_id"],
            loan_number=result["loan_number"],
            esg_performance_score=result["esg_performance_score"],
            pricing_tier=result["pricing_tier"],
            margin_adjustment_bps=result["margin_adjustment"] * 100,  # Convert to basis points
            current_rate=result["previous_total_rate"],
            new_rate=result["new_total_rate"],
            annual_impact=result["annual_savings"] - result["annual_cost"],
            last_update=result["effective_date"]
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating pricing: {str(e)}"
        )


@router.get("/history/{loan_id}", response_model=PricingHistoryResponse, status_code=status.HTTP_200_OK)
async def get_pricing_history(
    loan_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get pricing adjustment history for a loan.
    
    Returns historical pricing adjustments showing how the loan rate has changed
    over time based on ESG performance.
    
    - **loan_id**: The ID of the loan
    - **limit**: Maximum number of history records to return (default: 10)
    """
    try:
        pricing_engine = LoanPricingEngine(db)
        history = pricing_engine.get_pricing_history(loan_id, limit=limit)
        
        return PricingHistoryResponse(
            loan_id=history["loan_id"],
            loan_number=history["loan_number"],
            history=history["history"]
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving pricing history: {str(e)}"
        )


@router.get("/scenarios/{loan_id}", response_model=PricingScenarioResponse, status_code=status.HTTP_200_OK)
async def simulate_pricing_scenarios(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simulate pricing under different ESG performance scenarios.
    
    This endpoint generates automatic scenarios showing how different ESG performance
    tiers would affect loan pricing.
    
    - **loan_id**: The ID of the loan
    
    Returns scenarios for all pricing tiers: excellent, good, fair, poor, critical
    """
    try:
        pricing_engine = LoanPricingEngine(db)
        result = pricing_engine.simulate_pricing_scenarios(loan_id)
        
        return PricingScenarioResponse(
            loan_id=result["loan_id"],
            loan_number=result["loan_number"],
            scenarios=result["scenarios"]
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error simulating scenarios: {str(e)}"
        )


@router.get("/tiers", status_code=status.HTTP_200_OK)
async def get_pricing_tiers(
    current_user: User = Depends(get_current_user)
):
    """
    Get information about pricing tiers and adjustment structure.
    
    Returns the complete pricing tier structure showing how ESG performance
    translates to interest rate adjustments.
    """
    return {
        "pricing_tiers": [
            {
                "tier": "excellent",
                "score_range": {"min": 85, "max": 100},
                "margin_adjustment_bps": -50,
                "description": "Outstanding ESG performance with significant improvements"
            },
            {
                "tier": "good",
                "score_range": {"min": 70, "max": 84},
                "margin_adjustment_bps": -25,
                "description": "Strong ESG performance meeting or exceeding targets"
            },
            {
                "tier": "fair",
                "score_range": {"min": 50, "max": 69},
                "margin_adjustment_bps": 0,
                "description": "Adequate ESG performance with moderate progress"
            },
            {
                "tier": "poor",
                "score_range": {"min": 30, "max": 49},
                "margin_adjustment_bps": 25,
                "description": "Below target ESG performance requiring improvement"
            },
            {
                "tier": "critical",
                "score_range": {"min": 0, "max": 29},
                "margin_adjustment_bps": 50,
                "description": "Significantly below target with material ESG concerns"
            }
        ],
        "esg_weighting": {
            "environmental": 40,
            "social": 30,
            "governance": 30,
            "description": "Weighted scoring reflecting materiality of each pillar"
        },
        "adjustment_mechanism": {
            "basis_points_range": {"min": -50, "max": 50},
            "percentage_range": {"min": -0.50, "max": 0.50},
            "frequency": "Annual review with quarterly monitoring",
            "effective_date": "30 days after performance assessment"
        }
    }


@router.get("/summary/{loan_id}", status_code=status.HTTP_200_OK)
async def get_loan_pricing_summary(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive pricing summary for a loan.
    
    Returns current pricing status, recent history, and financial impact summary.
    
    - **loan_id**: The ID of the loan
    """
    try:
        pricing_engine = LoanPricingEngine(db)
        
        # Get current pricing info
        from app.models.models import Loan
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        # Get recent history
        history = pricing_engine.get_pricing_history(loan_id, limit=5)
        
        # Calculate total savings/cost
        total_impact = sum(h.get("annual_impact", 0) for h in history["history"])
        
        return {
            "loan_id": loan_id,
            "loan_number": loan.loan_number,
            "current_status": {
                "esg_performance_score": loan.esg_performance_score,
                "pricing_tier": loan.pricing_tier,
                "margin_adjustment_bps": loan.margin_adjustment,
                "current_rate": loan.interest_rate,
                "last_update": loan.last_pricing_update.isoformat() if loan.last_pricing_update else None
            },
            "financial_impact": {
                "total_impact": total_impact,
                "currency": "USD",
                "period": "Cumulative from pricing adjustments"
            },
            "recent_history": history["history"][:3],
            "performance_trend": "stable" if len(history["history"]) < 2 else (
                "improving" if history["history"][0].get("esg_performance_score", 0) > history["history"][-1].get("esg_performance_score", 0) else
                "declining" if history["history"][0].get("esg_performance_score", 0) < history["history"][-1].get("esg_performance_score", 0) else
                "stable"
            )
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving pricing summary: {str(e)}"
        )


def _calculate_trend(history: List[Dict]) -> str:
    """Calculate performance trend from history."""
    if len(history) < 2:
        return "insufficient_data"
    
    recent_scores = [h.get("esg_performance_score", 0) for h in history[:3]]
    if len(recent_scores) < 2:
        return "insufficient_data"
    
    avg_change = (recent_scores[0] - recent_scores[-1]) / len(recent_scores)
    
    if avg_change > 5:
        return "improving"
    elif avg_change < -5:
        return "declining"
    else:
        return "stable"
