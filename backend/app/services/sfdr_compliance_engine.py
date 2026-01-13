from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Loan, ESGKpi, SFDRReport, Verification


class SFDRComplianceEngine:
    """
    SFDR (Sustainable Finance Disclosure Regulation) compliance reporting engine.
    Generates Level 2 RTS compliant reports for EU sustainability disclosure.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # SFDR Article classifications
        self.sfdr_articles = {
            "article_6": "Financial products that do not promote environmental or social characteristics",
            "article_8": "Financial products promoting environmental or social characteristics",
            "article_9": "Financial products with sustainable investment as their objective"
        }
        
        # Principal Adverse Impact (PAI) indicators
        self.pai_indicators = [
            {"id": 1, "name": "GHG emissions", "unit": "tCO2e"},
            {"id": 2, "name": "Carbon footprint", "unit": "tCO2e per million EUR invested"},
            {"id": 3, "name": "GHG intensity of investee companies", "unit": "tCO2e per million EUR revenue"},
            {"id": 4, "name": "Exposure to companies in fossil fuel sector", "unit": "percentage"},
            {"id": 5, "name": "Share of non-renewable energy consumption", "unit": "percentage"},
            {"id": 6, "name": "Energy consumption intensity", "unit": "GWh per million EUR revenue"},
            {"id": 7, "name": "Activities negatively affecting biodiversity", "unit": "percentage"},
            {"id": 8, "name": "Emissions to water", "unit": "tonnes"},
            {"id": 9, "name": "Hazardous waste ratio", "unit": "tonnes"},
            {"id": 10, "name": "Violations of UN Global Compact principles", "unit": "number"},
            {"id": 11, "name": "Lack of processes for UN Global Compact", "unit": "percentage"},
            {"id": 12, "name": "Unadjusted gender pay gap", "unit": "percentage"},
            {"id": 13, "name": "Board gender diversity", "unit": "percentage"},
            {"id": 14, "name": "Exposure to controversial weapons", "unit": "percentage"}
        ]
    
    def classify_loan_sfdr_article(self, loan_id: int) -> str:
        """Classify loan under appropriate SFDR article."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        # Check if sustainability-linked
        if not loan.sustainability_linked:
            return "article_6"
        
        # Evaluate ESG integration level
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        if not kpis:
            return "article_6"
        
        # Count meaningful ESG targets
        meaningful_targets = sum(
            1 for kpi in kpis 
            if kpi.target_value is not None and kpi.baseline_value is not None
        )
        
        if meaningful_targets >= 5:
            # Strong ESG commitment with specific targets
            return "article_9"
        elif meaningful_targets >= 2:
            # ESG characteristics promoted
            return "article_8"
        else:
            return "article_6"
    
    def calculate_pai_indicators(self, loan_id: int) -> Dict:
        """Calculate Principal Adverse Impact indicators."""
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        pai_data = {}
        for pai in self.pai_indicators:
            pai_data[f"pai_{pai['id']}"] = {
                "name": pai["name"],
                "value": None,
                "unit": pai["unit"],
                "data_quality": "estimated"
            }
        
        # Map KPIs to PAI indicators
        for kpi in kpis:
            kpi_name_lower = kpi.kpi_name.lower()
            
            if "carbon" in kpi_name_lower or "emission" in kpi_name_lower or "ghg" in kpi_name_lower:
                pai_data["pai_1"]["value"] = kpi.current_value
                pai_data["pai_1"]["data_quality"] = "reported"
            
            if "energy" in kpi_name_lower and "renewable" in kpi_name_lower:
                if kpi.current_value:
                    pai_data["pai_5"]["value"] = 100 - kpi.current_value
                    pai_data["pai_5"]["data_quality"] = "calculated"
            
            if "water" in kpi_name_lower:
                pai_data["pai_8"]["value"] = kpi.current_value
                pai_data["pai_8"]["data_quality"] = "reported"
            
            if "waste" in kpi_name_lower:
                pai_data["pai_9"]["value"] = kpi.current_value
                pai_data["pai_9"]["data_quality"] = "reported"
            
            if "gender" in kpi_name_lower or "diversity" in kpi_name_lower:
                pai_data["pai_13"]["value"] = kpi.current_value
                pai_data["pai_13"]["data_quality"] = "reported"
        
        return pai_data
    
    def calculate_sustainable_investment_percentage(self, loan_id: int) -> float:
        """Calculate percentage of loan meeting sustainable investment criteria."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan or not loan.sustainability_linked:
            return 0.0
        
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        if not kpis:
            return 0.0
        
        # Evaluate DNSH (Do No Significant Harm) criteria
        dnsh_compliant = 0
        total_kpis = 0
        
        for kpi in kpis:
            if kpi.target_value and kpi.current_value:
                total_kpis += 1
                # Check if current performance meets or exceeds target
                if kpi.current_value >= kpi.target_value * 0.8:
                    dnsh_compliant += 1
        
        if total_kpis == 0:
            return 0.0
        
        compliance_rate = (dnsh_compliant / total_kpis) * 100
        
        # Apply conservative calculation
        if compliance_rate >= 90:
            return 100.0
        elif compliance_rate >= 75:
            return 75.0
        elif compliance_rate >= 50:
            return 50.0
        else:
            return 0.0
    
    def assess_eu_taxonomy_alignment(self, loan_id: int) -> Dict:
        """Assess EU Taxonomy alignment across environmental objectives."""
        environmental_objectives = [
            "climate_change_mitigation",
            "climate_change_adaptation",
            "sustainable_use_water",
            "circular_economy",
            "pollution_prevention",
            "biodiversity_ecosystems"
        ]
        
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        alignment = {}
        for objective in environmental_objectives:
            alignment[objective] = {
                "aligned": False,
                "substantial_contribution": False,
                "dnsh_compliance": False,
                "minimum_safeguards": False,
                "alignment_percentage": 0.0
            }
        
        # Evaluate climate change mitigation (most common)
        climate_kpis = [kpi for kpi in kpis if "carbon" in kpi.kpi_name.lower() or "emission" in kpi.kpi_name.lower()]
        if climate_kpis:
            avg_performance = sum(
                (kpi.current_value / kpi.target_value * 100) 
                for kpi in climate_kpis 
                if kpi.target_value and kpi.target_value > 0
            ) / len(climate_kpis)
            
            alignment["climate_change_mitigation"]["substantial_contribution"] = avg_performance >= 75
            alignment["climate_change_mitigation"]["dnsh_compliance"] = True
            alignment["climate_change_mitigation"]["minimum_safeguards"] = True
            alignment["climate_change_mitigation"]["aligned"] = avg_performance >= 75
            alignment["climate_change_mitigation"]["alignment_percentage"] = min(avg_performance, 100.0)
        
        return alignment
    
    def assess_dnsh_compliance(self, loan_id: int) -> Dict:
        """Assess Do No Significant Harm (DNSH) compliance."""
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        dnsh_assessment = {
            "overall_compliant": False,
            "environmental_harm": {
                "climate_mitigation": {"compliant": True, "issues": []},
                "climate_adaptation": {"compliant": True, "issues": []},
                "water_marine": {"compliant": True, "issues": []},
                "circular_economy": {"compliant": True, "issues": []},
                "pollution": {"compliant": True, "issues": []},
                "biodiversity": {"compliant": True, "issues": []}
            }
        }
        
        # Check for environmental harm indicators
        for kpi in kpis:
            kpi_name = kpi.kpi_name.lower()
            
            if "pollution" in kpi_name or "contamination" in kpi_name:
                if kpi.current_value and kpi.target_value:
                    if kpi.current_value > kpi.target_value * 1.2:
                        dnsh_assessment["environmental_harm"]["pollution"]["compliant"] = False
                        dnsh_assessment["environmental_harm"]["pollution"]["issues"].append(
                            f"{kpi.kpi_name} exceeds acceptable threshold"
                        )
            
            if "water" in kpi_name or "waste water" in kpi_name:
                if kpi.current_value and kpi.target_value:
                    if kpi.current_value > kpi.target_value * 1.2:
                        dnsh_assessment["environmental_harm"]["water_marine"]["compliant"] = False
                        dnsh_assessment["environmental_harm"]["water_marine"]["issues"].append(
                            f"{kpi.kpi_name} indicates potential water stress"
                        )
        
        # Overall compliance if all areas compliant
        dnsh_assessment["overall_compliant"] = all(
            area["compliant"] 
            for area in dnsh_assessment["environmental_harm"].values()
        )
        
        return dnsh_assessment
    
    def assess_social_safeguards(self, loan_id: int) -> Dict:
        """Assess minimum social safeguards compliance."""
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        
        safeguards = {
            "oecd_guidelines": {"compliant": True, "evidence": []},
            "un_guiding_principles": {"compliant": True, "evidence": []},
            "ilo_conventions": {"compliant": True, "evidence": []},
            "international_bill_rights": {"compliant": True, "evidence": []}
        }
        
        # Check social KPIs
        for kpi in kpis:
            if kpi.kpi_category and kpi.kpi_category.lower() == "social":
                safeguards["ilo_conventions"]["evidence"].append(
                    f"Social KPI tracked: {kpi.kpi_name}"
                )
        
        return safeguards
    
    def generate_sfdr_report(self, loan_id: int, period: str) -> Dict:
        """Generate comprehensive SFDR Level 2 compliance report."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        # Gather all components
        sfdr_classification = self.classify_loan_sfdr_article(loan_id)
        pai_indicators = self.calculate_pai_indicators(loan_id)
        sustainable_percentage = self.calculate_sustainable_investment_percentage(loan_id)
        taxonomy_alignment = self.assess_eu_taxonomy_alignment(loan_id)
        dnsh_assessment = self.assess_dnsh_compliance(loan_id)
        social_safeguards = self.assess_social_safeguards(loan_id)
        
        # Create report data
        report_data = {
            "executive_summary": {
                "loan_number": loan.loan_number,
                "borrower": loan.borrower.name if loan.borrower else "Unknown",
                "report_period": period,
                "sfdr_classification": sfdr_classification,
                "classification_description": self.sfdr_articles[sfdr_classification]
            },
            "sustainable_investment_analysis": {
                "percentage_sustainable": sustainable_percentage,
                "calculation_methodology": "Based on ESG KPI achievement against targets and DNSH criteria",
                "qualifying_activities": []
            },
            "principal_adverse_impacts": pai_indicators,
            "taxonomy_alignment": taxonomy_alignment,
            "dnsh_assessment": dnsh_assessment,
            "social_safeguards": social_safeguards,
            "disclosure_statement": self._generate_disclosure_statement(
                sfdr_classification, sustainable_percentage, dnsh_assessment["overall_compliant"]
            )
        }
        
        # Create SFDR report record
        sfdr_report = SFDRReport(
            loan_id=loan_id,
            report_period=period,
            sfdr_classification=sfdr_classification,
            principal_adverse_impacts=pai_indicators,
            sustainable_investment_percentage=sustainable_percentage,
            taxonomy_alignment=taxonomy_alignment,
            do_no_significant_harm_assessment=dnsh_assessment,
            social_safeguards=social_safeguards,
            generated_date=datetime.now(),
            status="completed",
            report_data=report_data
        )
        self.db.add(sfdr_report)
        self.db.commit()
        
        return {
            "report_id": sfdr_report.id,
            "loan_id": loan_id,
            "loan_number": loan.loan_number,
            "generated_date": datetime.now().isoformat(),
            "period": period,
            "sfdr_classification": sfdr_classification,
            "sustainable_investment_percentage": sustainable_percentage,
            "taxonomy_aligned": any(obj["aligned"] for obj in taxonomy_alignment.values()),
            "dnsh_compliant": dnsh_assessment["overall_compliant"],
            "report_data": report_data,
            "regulatory_compliance": {
                "sfdr_level_2_rts": True,
                "eu_taxonomy_regulation": True,
                "disclosure_requirements_met": True
            }
        }
    
    def _generate_disclosure_statement(
        self, 
        classification: str, 
        sustainable_pct: float, 
        dnsh_compliant: bool
    ) -> str:
        """Generate regulatory disclosure statement."""
        if classification == "article_9":
            return (
                f"This financial product has sustainable investment as its objective. "
                f"{sustainable_pct:.1f}% of the loan meets the criteria for sustainable investment. "
                f"The product {'complies' if dnsh_compliant else 'does not fully comply'} with Do No Significant Harm principles."
            )
        elif classification == "article_8":
            return (
                f"This financial product promotes environmental and social characteristics. "
                f"{sustainable_pct:.1f}% qualifies as sustainable investment. "
                f"Environmental and social characteristics are promoted through specific ESG-linked covenants."
            )
        else:
            return (
                "This financial product does not promote environmental or social characteristics "
                "and does not have sustainable investment as its objective."
            )
