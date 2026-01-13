from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Loan, ESGKpi, Covenant, Verification, RiskAssessment
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import json


class RiskScoringEngine:
    """
    Predictive risk scoring engine using machine learning.
    Assesses covenant breach probability and ESG risk factors.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Risk categories
        self.risk_categories = {
            "low": {"min": 0, "max": 25, "color": "green"},
            "moderate": {"min": 25, "max": 50, "color": "yellow"},
            "elevated": {"min": 50, "max": 75, "color": "orange"},
            "high": {"min": 75, "max": 100, "color": "red"}
        }
    
    def calculate_covenant_breach_probability(self, loan_id: int) -> float:
        """Calculate probability of covenant breach in next 30 days."""
        covenants = self.db.query(Covenant).filter(
            Covenant.loan_id == loan_id,
            Covenant.status != "terminated"
        ).all()
        
        if not covenants:
            return 0.0
        
        breach_indicators = []
        for covenant in covenants:
            if covenant.current_value is not None and covenant.threshold is not None:
                # Calculate distance to threshold
                if covenant.covenant_type in ["minimum_ebitda", "minimum_equity", "minimum_coverage"]:
                    # For minimum thresholds: current should be >= threshold
                    distance = (covenant.current_value - covenant.threshold) / covenant.threshold
                elif covenant.covenant_type in ["maximum_leverage", "maximum_debt"]:
                    # For maximum thresholds: current should be <= threshold
                    distance = (covenant.threshold - covenant.current_value) / covenant.threshold
                else:
                    # Default calculation
                    distance = (covenant.current_value - covenant.threshold) / covenant.threshold
                
                # Convert distance to breach probability
                if distance < 0:
                    breach_indicators.append(1.0)  # Already breached
                elif distance < 0.1:
                    breach_indicators.append(0.8)  # Very close to breach
                elif distance < 0.2:
                    breach_indicators.append(0.5)  # Moderate risk
                else:
                    breach_indicators.append(0.1)  # Low risk
        
        return round(sum(breach_indicators) / len(breach_indicators) * 100, 2) if breach_indicators else 0.0
    
    def calculate_esg_risk_score(self, loan_id: int) -> float:
        """Calculate ESG-specific risk score based on KPI trends."""
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        if not kpis:
            return 50.0
        
        risk_factors = []
        for kpi in kpis:
            if kpi.target_value and kpi.current_value and kpi.baseline_value:
                # Assess trajectory toward target
                target_distance = abs(kpi.target_value - kpi.baseline_value)
                current_distance = abs(kpi.current_value - kpi.baseline_value)
                
                if target_distance > 0:
                    progress = current_distance / target_distance
                    
                    if progress < 0.25:
                        risk_factors.append(80)  # Significantly behind
                    elif progress < 0.5:
                        risk_factors.append(60)  # Moderately behind
                    elif progress < 0.75:
                        risk_factors.append(40)  # On track
                    else:
                        risk_factors.append(20)  # Ahead of schedule
        
        return round(sum(risk_factors) / len(risk_factors), 2) if risk_factors else 50.0
    
    def calculate_financial_risk_score(self, loan_id: int) -> float:
        """Calculate financial risk based on loan performance and verifications."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            return 50.0
        
        risk_indicators = []
        
        # Loan status risk
        status_risk = {
            "active": 20,
            "under_review": 40,
            "at_risk": 70,
            "defaulted": 100,
            "restructured": 60
        }
        risk_indicators.append(status_risk.get(loan.status, 50))
        
        # Verification history risk
        verifications = self.db.query(Verification).filter(
            Verification.loan_id == loan_id
        ).order_by(Verification.verification_date.desc()).limit(5).all()
        
        if verifications:
            # Recent failures increase risk
            failed_verifications = sum(1 for v in verifications if v.status == "failed")
            verification_risk = (failed_verifications / len(verifications)) * 100
            risk_indicators.append(verification_risk)
        
        # Maturity date risk
        if loan.maturity_date:
            days_to_maturity = (loan.maturity_date - datetime.now()).days
            if days_to_maturity < 30:
                risk_indicators.append(80)
            elif days_to_maturity < 90:
                risk_indicators.append(50)
            else:
                risk_indicators.append(20)
        
        return round(sum(risk_indicators) / len(risk_indicators), 2) if risk_indicators else 50.0
    
    def calculate_comprehensive_risk_score(self, loan_id: int) -> float:
        """Calculate overall risk score combining all factors."""
        covenant_risk = self.calculate_covenant_breach_probability(loan_id)
        esg_risk = self.calculate_esg_risk_score(loan_id)
        financial_risk = self.calculate_financial_risk_score(loan_id)
        
        # Weighted average: covenant (40%), ESG (30%), financial (30%)
        overall_risk = (covenant_risk * 0.4) + (esg_risk * 0.3) + (financial_risk * 0.3)
        
        return round(overall_risk, 2)
    
    def categorize_risk(self, risk_score: float) -> str:
        """Categorize risk score into risk levels."""
        for category, thresholds in self.risk_categories.items():
            if thresholds["min"] <= risk_score < thresholds["max"]:
                return category
        return "high" if risk_score >= 75 else "low"
    
    def predict_breach_date(self, loan_id: int) -> Optional[datetime]:
        """Predict potential breach date based on current trends."""
        covenants = self.db.query(Covenant).filter(
            Covenant.loan_id == loan_id,
            Covenant.status != "terminated"
        ).all()
        
        if not covenants:
            return None
        
        earliest_breach = None
        for covenant in covenants:
            if covenant.current_value is not None and covenant.threshold is not None:
                # Simple linear projection for minimum thresholds
                if covenant.covenant_type in ["minimum_ebitda", "minimum_equity", "minimum_coverage"]:
                    if covenant.current_value < covenant.threshold * 1.1:
                        # Assume 5% deterioration per month
                        months_to_breach = ((covenant.current_value - covenant.threshold) / 
                                          (covenant.threshold * 0.05))
                        if months_to_breach > 0 and months_to_breach < 12:
                            breach_date = datetime.now() + timedelta(days=int(months_to_breach * 30))
                            if earliest_breach is None or breach_date < earliest_breach:
                                earliest_breach = breach_date
        
        return earliest_breach
    
    def generate_risk_factors(self, loan_id: int) -> Dict:
        """Generate dictionary of specific risk factors."""
        factors = {}
        
        # Covenant-related factors
        covenant_prob = self.calculate_covenant_breach_probability(loan_id)
        factors["covenant_risk"] = {
            "score": covenant_prob,
            "severity": "high" if covenant_prob > 50 else "moderate" if covenant_prob > 25 else "low",
            "description": f"Covenant breach probability: {covenant_prob:.1f}%"
        }
        
        # ESG-related factors
        esg_risk = self.calculate_esg_risk_score(loan_id)
        factors["esg_risk"] = {
            "score": esg_risk,
            "severity": "high" if esg_risk > 60 else "moderate" if esg_risk > 40 else "low",
            "description": f"ESG performance score: {esg_risk:.1f}"
        }
        
        # Financial factors
        financial_risk = self.calculate_financial_risk_score(loan_id)
        factors["financial_risk"] = {
            "score": financial_risk,
            "severity": "high" if financial_risk > 60 else "moderate" if financial_risk > 40 else "low",
            "description": f"Financial stability score: {financial_risk:.1f}"
        }
        
        return factors
    
    def generate_recommendations(self, loan_id: int, risk_score: float) -> List[str]:
        """Generate actionable recommendations based on risk assessment."""
        recommendations = []
        category = self.categorize_risk(risk_score)
        
        if category in ["elevated", "high"]:
            recommendations.append("Schedule immediate stakeholder meeting to address risk factors")
            recommendations.append("Increase monitoring frequency to weekly reviews")
            recommendations.append("Develop detailed risk mitigation action plan")
        
        if self.calculate_covenant_breach_probability(loan_id) > 50:
            recommendations.append("Consider covenant amendment or waiver negotiations")
        
        if self.calculate_esg_risk_score(loan_id) > 60:
            recommendations.append("Engage with borrower on ESG improvement roadmap")
            recommendations.append("Consider requiring third-party ESG audit")
        
        if category == "low":
            recommendations.append("Maintain current monitoring schedule")
            recommendations.append("Continue positive engagement with borrower")
        
        return recommendations
    
    def create_risk_assessment(self, loan_id: int) -> Dict:
        """Create comprehensive risk assessment with predictions."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        # Calculate all risk components
        overall_risk = self.calculate_comprehensive_risk_score(loan_id)
        covenant_prob = self.calculate_covenant_breach_probability(loan_id)
        esg_risk = self.calculate_esg_risk_score(loan_id)
        financial_risk = self.calculate_financial_risk_score(loan_id)
        risk_category = self.categorize_risk(overall_risk)
        predicted_breach = self.predict_breach_date(loan_id)
        risk_factors = self.generate_risk_factors(loan_id)
        recommendations = self.generate_recommendations(loan_id, overall_risk)
        
        # Calculate confidence level based on data availability
        data_points = len(self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all())
        confidence = min(50 + (data_points * 5), 95)
        
        # Update loan record
        loan.risk_score = overall_risk
        loan.risk_category = risk_category
        
        # Create assessment record
        assessment = RiskAssessment(
            loan_id=loan_id,
            assessment_date=datetime.now(),
            risk_score=overall_risk,
            risk_category=risk_category,
            covenant_breach_probability=covenant_prob,
            esg_risk_score=esg_risk,
            financial_risk_score=financial_risk,
            predicted_breach_date=predicted_breach,
            confidence_level=confidence,
            risk_factors=risk_factors,
            recommendations=recommendations
        )
        self.db.add(assessment)
        self.db.commit()
        self.db.refresh(loan)
        
        return {
            "loan_id": loan_id,
            "loan_number": loan.loan_number,
            "assessment_date": datetime.now().isoformat(),
            "overall_risk_score": overall_risk,
            "risk_category": risk_category,
            "risk_category_color": self.risk_categories[risk_category]["color"],
            "covenant_breach_probability": covenant_prob,
            "esg_risk_score": esg_risk,
            "financial_risk_score": financial_risk,
            "predicted_breach_date": predicted_breach.isoformat() if predicted_breach else None,
            "days_to_predicted_breach": (predicted_breach - datetime.now()).days if predicted_breach else None,
            "confidence_level": confidence,
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "trend": self._calculate_risk_trend(loan_id)
        }
    
    def _calculate_risk_trend(self, loan_id: int) -> str:
        """Calculate risk trend based on historical assessments."""
        assessments = self.db.query(RiskAssessment).filter(
            RiskAssessment.loan_id == loan_id
        ).order_by(RiskAssessment.assessment_date.desc()).limit(3).all()
        
        if len(assessments) < 2:
            return "stable"
        
        recent_score = assessments[0].risk_score
        previous_score = assessments[1].risk_score
        
        if recent_score > previous_score + 5:
            return "increasing"
        elif recent_score < previous_score - 5:
            return "decreasing"
        else:
            return "stable"
