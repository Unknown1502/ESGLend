from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Loan, Borrower, ESGKpi, Covenant, Verification, Report
import json


class LMAStandardizationService:
    """
    LMA (Loan Market Association) data standardization and export service.
    Provides standard format exports compliant with LMA documentation requirements.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # LMA Standard Field Mappings
        self.lma_field_mappings = {
            "loan_facility": [
                "facility_id", "facility_name", "facility_type", "facility_amount",
                "currency", "purpose", "tenor", "commitment_period", "availability_period"
            ],
            "pricing": [
                "base_rate", "margin", "all_in_rate", "upfront_fee", "commitment_fee",
                "utilization_fee", "agency_fee", "pricing_grid", "ratchet_mechanism"
            ],
            "sustainability_linked": [
                "sl_designation", "kpi_framework", "sustainability_coordinator",
                "target_observation_date", "target_assessment_date", "pricing_adjustment_mechanism"
            ],
            "parties": [
                "borrower", "guarantor", "lender", "facility_agent", "security_agent",
                "esg_coordinator", "independent_verifier"
            ],
            "compliance": [
                "representations_warranties", "undertakings", "events_of_default",
                "financial_covenants", "information_covenants", "esg_covenants"
            ]
        }
    
    def export_loan_to_lma_format(self, loan_id: int) -> Dict:
        """Export loan data in LMA standard format."""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError(f"Loan with ID {loan_id} not found")
        
        borrower = loan.borrower
        kpis = self.db.query(ESGKpi).filter(ESGKpi.loan_id == loan_id).all()
        covenants = self.db.query(Covenant).filter(Covenant.loan_id == loan_id).all()
        verifications = self.db.query(Verification).filter(Verification.loan_id == loan_id).all()
        
        lma_document = {
            "document_info": {
                "document_type": "LMA_SUSTAINABILITY_LINKED_LOAN",
                "document_version": "1.0",
                "generated_date": datetime.now().isoformat(),
                "format_version": "LMA_SLL_2023",
                "export_system": "ESGLend Platform"
            },
            "facility_information": self._format_facility_info(loan),
            "parties": self._format_parties_info(loan, borrower),
            "pricing_and_fees": self._format_pricing_info(loan),
            "sustainability_linked_structure": self._format_sl_structure(loan, kpis),
            "covenants": self._format_covenants(covenants),
            "verification_framework": self._format_verification_framework(verifications),
            "reporting_requirements": self._format_reporting_requirements(loan),
            "conditions_precedent": self._format_conditions_precedent(),
            "representations_and_warranties": self._format_representations(),
            "events_of_default": self._format_events_of_default()
        }
        
        return lma_document
    
    def _format_facility_info(self, loan: Loan) -> Dict:
        """Format facility information in LMA standard."""
        return {
            "facility_details": {
                "facility_id": loan.loan_number,
                "facility_name": f"{loan.borrower.name if loan.borrower else 'Unknown'} Sustainability-Linked Loan",
                "facility_type": "Term Loan" if loan.loan_type == "term" else "Revolving Credit Facility",
                "facility_amount": {
                    "value": float(loan.principal_amount),
                    "currency": "USD"
                },
                "purpose": loan.purpose or "General Corporate Purposes",
                "tenor": {
                    "start_date": loan.start_date.isoformat() if loan.start_date else None,
                    "maturity_date": loan.maturity_date.isoformat() if loan.maturity_date else None,
                    "term_months": None
                },
                "sustainability_linked": loan.sustainability_linked,
                "green_loan": False,
                "social_loan": False
            },
            "utilization": {
                "outstanding_principal": float(loan.outstanding_principal) if loan.outstanding_principal else 0.0,
                "available_amount": float(loan.principal_amount - (loan.outstanding_principal or 0)),
                "utilization_percentage": float((loan.outstanding_principal or 0) / loan.principal_amount * 100) if loan.principal_amount > 0 else 0.0
            }
        }
    
    def _format_parties_info(self, loan: Loan, borrower: Borrower) -> Dict:
        """Format parties information in LMA standard."""
        return {
            "borrower": {
                "name": borrower.name if borrower else "Unknown",
                "entity_type": borrower.entity_type if borrower else None,
                "jurisdiction": borrower.jurisdiction if borrower else None,
                "industry_sector": borrower.industry if borrower else None,
                "credit_rating": borrower.credit_rating if borrower else None,
                "contact_email": borrower.contact_email if borrower else None
            },
            "lender_group": [
                {
                    "lender_name": "ESGLend Consortium",
                    "commitment_amount": float(loan.principal_amount),
                    "role": "Facility Agent and Lender"
                }
            ],
            "agents": {
                "facility_agent": "ESGLend Facility Agent",
                "security_agent": "ESGLend Security Trustee",
                "esg_coordinator": "ESGLend ESG Coordination Team"
            },
            "advisors": {
                "independent_verifier": "To be appointed in accordance with verification framework",
                "sustainability_coordinator": "ESGLend Sustainability Team"
            }
        }
    
    def _format_pricing_info(self, loan: Loan) -> Dict:
        """Format pricing and fees in LMA standard."""
        base_rate = loan.interest_rate if loan.interest_rate else 5.0
        
        return {
            "interest_rate": {
                "base_rate": {
                    "type": "SOFR",
                    "rate_percentage": float(base_rate),
                    "floor": 0.0
                },
                "margin": {
                    "initial_margin": float(loan.margin_adjustment if loan.margin_adjustment else 2.5),
                    "currency": "USD",
                    "ratchet": loan.sustainability_linked
                },
                "all_in_rate": float(base_rate + (loan.margin_adjustment if loan.margin_adjustment else 2.5))
            },
            "fees": {
                "upfront_fee": {
                    "percentage": 0.5,
                    "amount": float(loan.principal_amount * 0.005)
                },
                "commitment_fee": {
                    "percentage": 0.25,
                    "applicable_to": "Undrawn Amount"
                },
                "agency_fee": {
                    "amount": 25000.0,
                    "currency": "USD",
                    "frequency": "Annual"
                }
            },
            "sustainability_pricing_adjustment": {
                "enabled": loan.sustainability_linked,
                "current_pricing_tier": loan.pricing_tier if loan.pricing_tier else None,
                "margin_adjustment_range": {
                    "improvement_discount": -0.50,
                    "deterioration_premium": 0.50
                },
                "last_adjustment_date": loan.last_pricing_update.isoformat() if loan.last_pricing_update else None
            }
        }
    
    def _format_sl_structure(self, loan: Loan, kpis: List[ESGKpi]) -> Dict:
        """Format sustainability-linked structure in LMA standard."""
        if not loan.sustainability_linked:
            return {"applicable": False}
        
        kpi_targets = []
        for kpi in kpis:
            kpi_targets.append({
                "kpi_id": kpi.id,
                "kpi_name": kpi.kpi_name,
                "kpi_category": kpi.kpi_category,
                "measurement_unit": kpi.unit,
                "baseline": {
                    "value": float(kpi.baseline_value) if kpi.baseline_value else None,
                    "date": kpi.baseline_date.isoformat() if kpi.baseline_date else None,
                    "methodology": "Historical Average"
                },
                "target": {
                    "value": float(kpi.target_value) if kpi.target_value else None,
                    "date": kpi.target_date.isoformat() if kpi.target_date else None,
                    "ambition_level": self._assess_ambition_level(kpi)
                },
                "current_performance": {
                    "value": float(kpi.current_value) if kpi.current_value else None,
                    "last_updated": kpi.last_updated.isoformat() if kpi.last_updated else None,
                    "achievement_rate": float((kpi.current_value / kpi.target_value * 100) if kpi.target_value and kpi.target_value > 0 else 0)
                },
                "materiality": {
                    "material_to_borrower": True,
                    "material_to_industry": True,
                    "rationale": f"{kpi.kpi_name} is a key performance indicator for sustainability performance"
                }
            })
        
        return {
            "applicable": True,
            "framework_compliance": {
                "sustainability_linked_loan_principles": True,
                "green_loan_principles": False,
                "social_loan_principles": False
            },
            "kpi_framework": {
                "number_of_kpis": len(kpis),
                "kpis": kpi_targets,
                "selection_rationale": "KPIs selected based on materiality assessment and alignment with borrower's sustainability strategy"
            },
            "spTs": {
                "methodology": "Science-based targets where applicable, industry benchmarks for others",
                "calibration": "Ambitious targets exceeding business-as-usual trajectory",
                "verification_protocol": "Annual third-party verification by independent ESG auditor"
            },
            "pricing_adjustment_mechanism": {
                "adjustment_frequency": "Annual",
                "observation_dates": "Each anniversary of the facility effective date",
                "adjustment_calculation": "Based on KPI achievement against SPTs",
                "adjustment_range": {
                    "maximum_discount_bps": 50,
                    "maximum_premium_bps": 50
                },
                "step_up_step_down_grid": [
                    {"achievement_rate": ">=100%", "margin_adjustment_bps": -50},
                    {"achievement_rate": ">=90%", "margin_adjustment_bps": -25},
                    {"achievement_rate": ">=75%", "margin_adjustment_bps": 0},
                    {"achievement_rate": ">=50%", "margin_adjustment_bps": 25},
                    {"achievement_rate": "<50%", "margin_adjustment_bps": 50}
                ]
            }
        }
    
    def _format_covenants(self, covenants: List[Covenant]) -> Dict:
        """Format covenants in LMA standard."""
        financial_covenants = []
        esg_covenants = []
        
        for cov in covenants:
            covenant_data = {
                "covenant_id": cov.id,
                "covenant_name": cov.covenant_type,
                "description": cov.description or f"{cov.covenant_type} covenant",
                "threshold": float(cov.threshold_value) if cov.threshold_value else None,
                "frequency": cov.frequency,
                "status": cov.status,
                "last_tested": cov.last_tested.isoformat() if cov.last_tested else None
            }
            
            if cov.covenant_type.lower() in ["debt_to_ebitda", "interest_coverage", "leverage"]:
                financial_covenants.append(covenant_data)
            elif "esg" in cov.covenant_type.lower() or "sustainability" in cov.covenant_type.lower():
                esg_covenants.append(covenant_data)
        
        return {
            "financial_covenants": {
                "covenants": financial_covenants,
                "testing_frequency": "Quarterly",
                "cure_rights": "Standard equity cure provisions"
            },
            "esg_covenants": {
                "covenants": esg_covenants,
                "verification_requirement": "Annual third-party verification",
                "breach_consequences": "Potential pricing adjustment and event of default"
            },
            "information_covenants": {
                "financial_statements": "Quarterly unaudited, Annual audited",
                "compliance_certificates": "Quarterly",
                "esg_reporting": "Annual ESG report with third-party verification"
            }
        }
    
    def _format_verification_framework(self, verifications: List[Verification]) -> Dict:
        """Format verification framework in LMA standard."""
        return {
            "external_review": {
                "type": "Third-party verification",
                "provider": "Independent ESG auditor",
                "frequency": "Annual",
                "scope": "KPI performance against SPTs"
            },
            "verification_requirements": {
                "pre_disbursement": "Framework review by ESG coordinator",
                "annual": "Third-party verification of KPI performance",
                "ad_hoc": "Upon material change to KPIs or SPTs"
            },
            "verification_history": [
                {
                    "verification_id": ver.id,
                    "verification_type": ver.verification_type,
                    "verifier": ver.verifier_name if ver.verifier_name else "Independent Auditor",
                    "verification_date": ver.verification_date.isoformat() if ver.verification_date else None,
                    "status": ver.status,
                    "findings": ver.findings or "No findings",
                    "opinion": ver.opinion if hasattr(ver, 'opinion') else "Reasonable assurance"
                }
                for ver in verifications
            ],
            "reporting_and_transparency": {
                "annual_esg_report": "Published within 120 days of fiscal year end",
                "allocation_reporting": "N/A for SLL",
                "impact_reporting": "Annual impact metrics related to KPIs"
            }
        }
    
    def _format_reporting_requirements(self, loan: Loan) -> Dict:
        """Format reporting requirements in LMA standard."""
        return {
            "financial_reporting": {
                "annual_financial_statements": {
                    "deadline": "120 days after fiscal year end",
                    "standard": "US GAAP or IFRS",
                    "audit_requirement": "Big 4 or equivalent auditor"
                },
                "quarterly_financial_statements": {
                    "deadline": "45 days after quarter end",
                    "standard": "US GAAP or IFRS",
                    "audit_requirement": "Management prepared, reviewed"
                },
                "compliance_certificates": {
                    "deadline": "With financial statements",
                    "content": "Covenant compliance calculations and representations"
                }
            },
            "esg_reporting": {
                "annual_sustainability_report": {
                    "deadline": "120 days after fiscal year end",
                    "content": "KPI performance, sustainability strategy, impact metrics",
                    "verification": "Third-party verified"
                },
                "kpi_performance_updates": {
                    "frequency": "Annual or upon observation date",
                    "content": "Current KPI values, progress against SPTs"
                },
                "material_esg_events": {
                    "deadline": "Promptly upon occurrence",
                    "content": "Any material ESG-related event affecting KPIs"
                }
            },
            "ad_hoc_reporting": {
                "events_of_default": "Immediate notification",
                "material_adverse_change": "Immediate notification",
                "litigation": "Material litigation or regulatory actions"
            }
        }
    
    def _format_conditions_precedent(self) -> Dict:
        """Format conditions precedent in LMA standard."""
        return {
            "initial_conditions": [
                "Executed loan agreement",
                "Corporate authorizations",
                "Legal opinions",
                "Financial statements",
                "Insurance certificates",
                "Security documentation (if applicable)",
                "ESG framework documentation",
                "KPI baseline verification"
            ],
            "conditions_to_utilization": [
                "No default or event of default",
                "Representations and warranties true and correct",
                "Compliance with covenants",
                "Delivery of utilization request"
            ]
        }
    
    def _format_representations(self) -> List[str]:
        """Format representations and warranties in LMA standard."""
        return [
            "Status and capacity",
            "Binding obligations",
            "Non-conflict with other obligations",
            "Power and authority",
            "Legal and beneficial ownership",
            "No default",
            "No misleading information",
            "Financial statements accuracy",
            "No material adverse change",
            "Litigation disclosure",
            "Environmental compliance",
            "ESG data accuracy"
        ]
    
    def _format_events_of_default(self) -> List[str]:
        """Format events of default in LMA standard."""
        return [
            "Non-payment of principal or interest",
            "Breach of financial covenants",
            "Breach of other obligations (subject to grace periods)",
            "Misrepresentation",
            "Cross-default to other indebtedness",
            "Insolvency and insolvency proceedings",
            "Creditors process",
            "Material adverse change",
            "Unlawfulness",
            "Cessation of business",
            "Change of control",
            "Material breach of ESG covenants"
        ]
    
    def _assess_ambition_level(self, kpi: ESGKpi) -> str:
        """Assess ambition level of KPI target."""
        if not kpi.target_value or not kpi.baseline_value or kpi.baseline_value == 0:
            return "Not assessed"
        
        improvement_rate = ((kpi.target_value - kpi.baseline_value) / abs(kpi.baseline_value)) * 100
        
        if improvement_rate >= 30:
            return "Highly ambitious"
        elif improvement_rate >= 20:
            return "Ambitious"
        elif improvement_rate >= 10:
            return "Moderate"
        else:
            return "Conservative"
    
    def export_to_json(self, loan_id: int, include_metadata: bool = True) -> str:
        """Export loan data to JSON format."""
        lma_data = self.export_loan_to_lma_format(loan_id)
        return json.dumps(lma_data, indent=2, default=str)
    
    def export_to_xml(self, loan_id: int) -> str:
        """Export loan data to XML format."""
        lma_data = self.export_loan_to_lma_format(loan_id)
        
        def dict_to_xml(data: Dict, root_name: str = "LMADocument") -> str:
            xml_lines = [f"<?xml version='1.0' encoding='UTF-8'?>", f"<{root_name}>"]
            
            def add_element(key: str, value, indent: int = 1):
                indent_str = "  " * indent
                if isinstance(value, dict):
                    xml_lines.append(f"{indent_str}<{key}>")
                    for k, v in value.items():
                        add_element(k, v, indent + 1)
                    xml_lines.append(f"{indent_str}</{key}>")
                elif isinstance(value, list):
                    xml_lines.append(f"{indent_str}<{key}>")
                    for item in value:
                        if isinstance(item, dict):
                            xml_lines.append(f"{indent_str}  <item>")
                            for k, v in item.items():
                                add_element(k, v, indent + 2)
                            xml_lines.append(f"{indent_str}  </item>")
                        else:
                            xml_lines.append(f"{indent_str}  <item>{item}</item>")
                    xml_lines.append(f"{indent_str}</{key}>")
                else:
                    xml_lines.append(f"{indent_str}<{key}>{value}</{key}>")
            
            for key, value in data.items():
                add_element(key, value)
            
            xml_lines.append(f"</{root_name}>")
            return "\n".join(xml_lines)
        
        return dict_to_xml(lma_data)
