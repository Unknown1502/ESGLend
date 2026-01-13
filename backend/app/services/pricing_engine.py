from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Loan, ESGKpi, PricingHistory, User
import math


class LoanPricingEngine:
    """
    Dynamic loan pricing engine that adjusts interest rates based on ESG performance.
    Implements sustainability-linked loan pricing mechanics.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Pricing tiers configuration
        self.pricing_tiers = {
            "excellent": {"threshold": 90, "adjustment": -0.50},  # 50 basis points reduction
            "good": {"threshold": 75, "adjustment": -0.25},       # 25 basis points reduction
            "fair": {"threshold": 60, "adjustment": 0.0},         # No adjustment
            "poor": {"threshold": 40, "adjustment": 0.25},        # 25 basis points increase
            "critical": {"threshold": 0, "adjustment": 0.50}      # 50 basis points increase
        }
    
    def calculate_esg_performance_score(self, loan_id: int) -> float:
        """
        Calculate comprehensive ESG performance score for a loan.
        Weighted scoring: Environmental (40%), Social (30%), Governance (30%)
        """
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        if not kpis:
            return 50.0  # Default neutral score
        
        category_scores = {"environmental": [], "social": [], "governance": []}
        
        for kpi in kpis:
            if kpi.target_value and kpi.current_value and kpi.baseline_value:
                # Calculate achievement percentage
                target_progress = abs(kpi.target_value - kpi.baseline_value)
                current_progress = abs(kpi.current_value - kpi.baseline_value)
                
                if target_progress > 0:
                    achievement = min((current_progress / target_progress) * 100, 100)
                    
                    # Categorize and store score
                    category = kpi.kpi_category.lower() if kpi.kpi_category else "environmental"
                    if category in category_scores:
                        category_scores[category].append(achievement)
        
        # Calculate weighted average
        weights = {"environmental": 0.40, "social": 0.30, "governance": 0.30}
        total_score = 0
        total_weight = 0
        
        for category, weight in weights.items():
            if category_scores[category]:
                avg_score = sum(category_scores[category]) / len(category_scores[category])
                total_score += avg_score * weight
                total_weight += weight
        
        return round(total_score / total_weight if total_weight > 0 else 50.0, 2)
    
    def determine_pricing_tier(self, esg_score: float) -> str:
        """Determine pricing tier based on ESG performance score."""
        for tier, config in self.pricing_tiers.items():
            if esg_score >= config["threshold"]:
                return tier
        return "critical"
    
    def calculate_margin_adjustment(self, esg_score: float) -> float:
        """Calculate margin adjustment in basis points based on ESG score."""
        tier = self.determine_pricing_tier(esg_score)
        return self.pricing_tiers[tier]["adjustment"]
    
    def update_loan_pricing(
        self, 
        loan_id: int, 
        user_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> Dict:
        """
        Update loan pricing based on current ESG performance.
        Returns new pricing details and creates pricing history record.
        """
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        # Calculate ESG performance score
        esg_score = self.calculate_esg_performance_score(loan_id)
        
        # Determine pricing tier and adjustment
        pricing_tier = self.determine_pricing_tier(esg_score)
        margin_adjustment = self.calculate_margin_adjustment(esg_score)
        
        # Calculate new margin and total rate
        base_margin = loan.base_margin or 2.0
        new_margin = base_margin + margin_adjustment
        base_rate = loan.interest_rate or 4.0
        new_total_rate = base_rate + new_margin
        
        # Calculate financial impact
        annual_savings = (loan.amount * abs(margin_adjustment) / 100) if margin_adjustment < 0 else 0
        annual_cost = (loan.amount * margin_adjustment / 100) if margin_adjustment > 0 else 0
        
        # Update loan record
        loan.esg_performance_score = esg_score
        loan.pricing_tier = pricing_tier
        loan.current_margin = new_margin
        loan.margin_adjustment = margin_adjustment
        loan.last_pricing_update = datetime.now()
        
        # Create pricing history record
        pricing_history = PricingHistory(
            loan_id=loan_id,
            effective_date=datetime.now(),
            base_rate=base_rate,
            margin=new_margin,
            total_rate=new_total_rate,
            esg_performance_score=esg_score,
            adjustment_reason=reason or f"ESG performance tier: {pricing_tier}",
            adjustment_amount=margin_adjustment,
            created_by=user_id
        )
        self.db.add(pricing_history)
        self.db.commit()
        self.db.refresh(loan)
        
        return {
            "loan_id": loan_id,
            "loan_number": loan.loan_number,
            "esg_performance_score": esg_score,
            "pricing_tier": pricing_tier,
            "base_rate": base_rate,
            "base_margin": base_margin,
            "margin_adjustment": margin_adjustment,
            "new_margin": new_margin,
            "new_total_rate": round(new_total_rate, 4),
            "previous_total_rate": round(base_rate + base_margin, 4),
            "rate_change": round(margin_adjustment, 4),
            "annual_savings": round(annual_savings, 2) if annual_savings > 0 else 0,
            "annual_cost": round(annual_cost, 2) if annual_cost > 0 else 0,
            "currency": loan.currency,
            "effective_date": datetime.now().isoformat(),
            "impact_description": self._generate_impact_description(
                margin_adjustment, annual_savings, annual_cost, loan.currency
            )
        }
    
    def get_pricing_history(self, loan_id: int, limit: int = 10) -> Dict:
        """Retrieve pricing history for a loan."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        history = self.db.query(PricingHistory)\
            .filter(PricingHistory.loan_id == loan_id)\
            .order_by(PricingHistory.effective_date.desc())\
            .limit(limit)\
            .all()
        
        return {
            "loan_id": loan_id,
            "loan_number": loan.loan_number,
            "history": [
                {
                    "id": record.id,
                    "effective_date": record.effective_date.isoformat(),
                    "base_rate": record.base_rate,
                    "margin": record.margin,
                    "total_rate": record.total_rate,
                    "esg_performance_score": record.esg_performance_score,
                    "adjustment_reason": record.adjustment_reason,
                    "adjustment_amount": record.adjustment_amount
                }
                for record in history
            ]
        }
    
    def simulate_pricing_scenarios(self, loan_id: int) -> Dict:
        """Generate pricing scenarios for different ESG performance levels."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        base_rate = loan.interest_rate or 4.0
        base_margin = loan.base_margin or 2.0
        
        scenarios = {}
        for tier, config in self.pricing_tiers.items():
            adjustment = config["adjustment"]
            new_margin = base_margin + adjustment
            new_rate = base_rate + new_margin
            annual_impact = loan.amount * adjustment / 100
            
            scenarios[tier] = {
                "threshold": config["threshold"],
                "margin_adjustment": adjustment,
                "new_margin": new_margin,
                "new_total_rate": round(new_rate, 4),
                "annual_impact": round(annual_impact, 2),
                "impact_type": "savings" if annual_impact < 0 else "cost" if annual_impact > 0 else "neutral"
            }
        
        return {
            "loan_id": loan_id,
            "loan_number": loan.loan_number,
            "loan_amount": loan.amount,
            "currency": loan.currency,
            "current_esg_score": loan.esg_performance_score,
            "current_tier": loan.pricing_tier,
            "scenarios": scenarios
        }
    
    def _generate_impact_description(
        self, 
        adjustment: float, 
        savings: float, 
        cost: float, 
        currency: str
    ) -> str:
        """Generate human-readable impact description."""
        if adjustment < 0:
            return f"Rate reduced by {abs(adjustment):.2f}% due to excellent ESG performance. Annual savings: {currency} {savings:,.2f}"
        elif adjustment > 0:
            return f"Rate increased by {adjustment:.2f}% due to underperformance. Annual additional cost: {currency} {cost:,.2f}"
        else:
            return "Rate unchanged. ESG performance meets expectations."
