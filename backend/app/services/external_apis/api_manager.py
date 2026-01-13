"""
API Manager - Centralized management for all external API services
Handles API status monitoring, fallback mechanisms, and service orchestration
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from .weather_api import WeatherAPIService
from .satellite_api import SatelliteAPIService
from .carbon_api import CarbonAPIService
from .esg_rating_api import ESGRatingAPIService

logger = logging.getLogger(__name__)


class APIManager:
    """Central manager for all external API services"""
    
    def __init__(self):
        """Initialize all API services"""
        self.weather_api = WeatherAPIService()
        self.satellite_api = SatelliteAPIService()
        self.carbon_api = CarbonAPIService()
        self.esg_rating_api = ESGRatingAPIService()
        
        self.services = {
            "weather": self.weather_api,
            "satellite": self.satellite_api,
            "carbon": self.carbon_api,
            "esg_rating": self.esg_rating_api
        }
        
    def get_all_statuses(self) -> Dict[str, Any]:
        """Get status of all API services"""
        statuses = {}
        for name, service in self.services.items():
            statuses[name] = service.get_status()
        
        available_count = sum(1 for s in statuses.values() if s["available"])
        total_count = len(statuses)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_services": total_count,
            "available_services": available_count,
            "availability_rate": round((available_count / total_count) * 100, 2),
            "services": statuses
        }
    
    def verify_environmental_claim(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify environmental claim using multiple API sources
        
        Args:
            claim_data: Dictionary containing:
                - claim_type: Type of claim (climate, deforestation, carbon, etc.)
                - location: {latitude, longitude}
                - reported_value: Value reported by borrower
                - additional data specific to claim type
                
        Returns:
            Comprehensive verification result
        """
        claim_type = claim_data.get("claim_type")
        location = claim_data.get("location", {})
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "claim_type": claim_type,
            "location": location,
            "sources_used": [],
            "verifications": []
        }
        
        try:
            # Weather/Climate verification
            if claim_type in ["temperature", "humidity", "climate"]:
                weather_result = self.weather_api.verify_climate_claim(
                    latitude=location.get("latitude", 51.5074),
                    longitude=location.get("longitude", -0.1278),
                    claim_type=claim_data.get("metric", "temperature"),
                    reported_value=claim_data.get("reported_value", 0)
                )
                results["sources_used"].append("OpenWeatherMap")
                results["verifications"].append(weather_result)
            
            # Deforestation/Land use verification
            if claim_type in ["deforestation", "land_use", "reforestation"]:
                satellite_result = self.satellite_api.verify_deforestation_claim(
                    latitude=location.get("latitude", 51.5074),
                    longitude=location.get("longitude", -0.1278),
                    claim="no_deforestation",
                    reported_status=claim_data.get("reported_status", "compliant")
                )
                results["sources_used"].append("NASA FIRMS")
                results["verifications"].append(satellite_result)
            
            # Carbon intensity verification
            if claim_type in ["carbon", "emissions", "grid_intensity"]:
                carbon_result = self.carbon_api.verify_carbon_claim(
                    reported_intensity=claim_data.get("reported_value", 200),
                    reported_period=claim_data.get("period", "current"),
                    postcode=location.get("postcode")
                )
                results["sources_used"].append("UK Carbon Intensity API")
                results["verifications"].append(carbon_result)
            
            # Calculate overall confidence
            if results["verifications"]:
                avg_confidence = sum(v.get("confidence_score", 0) for v in results["verifications"]) / len(results["verifications"])
                all_verified = all(v.get("verified", False) for v in results["verifications"])
                
                results["summary"] = {
                    "verified": all_verified,
                    "confidence_score": round(avg_confidence, 2),
                    "sources_count": len(results["sources_used"]),
                    "status": "verified" if all_verified else "discrepancy_detected"
                }
            else:
                results["summary"] = {
                    "verified": False,
                    "confidence_score": 0,
                    "status": "no_verification_performed",
                    "message": f"No verification available for claim type: {claim_type}"
                }
            
        except Exception as e:
            logger.error(f"Error in multi-source verification: {str(e)}")
            results["error"] = str(e)
            results["summary"] = {
                "verified": False,
                "confidence_score": 0,
                "status": "verification_error"
            }
        
        return results
    
    def run_comprehensive_verification(self, loan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run comprehensive ESG verification using all available APIs
        
        Args:
            loan_data: Loan and ESG KPI data
            
        Returns:
            Complete verification report
        """
        loan_id = loan_data.get("loan_id")
        borrower_name = loan_data.get("borrower_name", "Unknown")
        location = loan_data.get("location", {})
        esg_kpis = loan_data.get("esg_kpis", [])
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "loan_id": loan_id,
            "borrower": borrower_name,
            "location": location,
            "verification_results": [],
            "data_sources": []
        }
        
        # Verify each ESG KPI
        for kpi in esg_kpis:
            kpi_name = kpi.get("name")
            kpi_category = kpi.get("category", "").lower()
            
            verification = {
                "kpi_name": kpi_name,
                "category": kpi_category,
                "target_value": kpi.get("target_value"),
                "reported_value": kpi.get("current_value"),
                "unit": kpi.get("unit"),
                "verifications": []
            }
            
            # Environmental KPIs
            if "carbon" in kpi_category or "emission" in kpi_category:
                try:
                    carbon_result = self.carbon_api.calculate_emissions(
                        energy_kwh=kpi.get("current_value", 1000),
                        postcode=location.get("postcode")
                    )
                    verification["verifications"].append(carbon_result)
                    report["data_sources"].append("UK Carbon Intensity API")
                except Exception as e:
                    logger.error(f"Carbon verification failed: {str(e)}")
            
            if "temperature" in kpi_category or "climate" in kpi_category:
                try:
                    weather_result = self.weather_api.get_current_weather(
                        latitude=location.get("latitude", 51.5074),
                        longitude=location.get("longitude", -0.1278)
                    )
                    verification["verifications"].append(weather_result)
                    report["data_sources"].append("OpenWeatherMap")
                except Exception as e:
                    logger.error(f"Weather verification failed: {str(e)}")
            
            if "deforestation" in kpi_category or "land" in kpi_category:
                try:
                    satellite_result = self.satellite_api.check_fire_activity(
                        latitude=location.get("latitude", 51.5074),
                        longitude=location.get("longitude", -0.1278),
                        radius_km=50,
                        days=30
                    )
                    verification["verifications"].append(satellite_result)
                    report["data_sources"].append("NASA FIRMS")
                except Exception as e:
                    logger.error(f"Satellite verification failed: {str(e)}")
            
            report["verification_results"].append(verification)
        
        # Add ESG benchmark if company symbol available
        if loan_data.get("company_symbol"):
            try:
                benchmark = self.esg_rating_api.benchmark_esg_performance(
                    symbol=loan_data["company_symbol"],
                    borrower_score=loan_data.get("esg_score", 70)
                )
                report["benchmark"] = benchmark
                report["data_sources"].append("Alpha Vantage")
            except Exception as e:
                logger.error(f"ESG benchmark failed: {str(e)}")
        
        # Calculate overall verification score
        report["summary"] = self._calculate_verification_summary(report)
        report["data_sources"] = list(set(report["data_sources"]))  # Remove duplicates
        
        return report
    
    def _calculate_verification_summary(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall verification summary"""
        total_kpis = len(report["verification_results"])
        verified_kpis = sum(
            1 for kpi in report["verification_results"] 
            if any(v.get("verified", False) for v in kpi.get("verifications", []))
        )
        
        total_verifications = sum(
            len(kpi.get("verifications", [])) 
            for kpi in report["verification_results"]
        )
        
        if total_kpis > 0:
            compliance_rate = (verified_kpis / total_kpis) * 100
        else:
            compliance_rate = 0
        
        # Determine risk level
        if compliance_rate >= 90:
            risk_level = "low"
        elif compliance_rate >= 70:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "total_kpis": total_kpis,
            "verified_kpis": verified_kpis,
            "compliance_rate": round(compliance_rate, 2),
            "risk_level": risk_level,
            "data_sources_used": len(report["data_sources"]),
            "total_verifications": total_verifications,
            "recommendation": self._get_overall_recommendation(compliance_rate, risk_level)
        }
    
    def _get_overall_recommendation(self, compliance_rate: float, risk_level: str) -> str:
        """Get overall recommendation"""
        if compliance_rate >= 90:
            return "ESG performance verified successfully. All claims supported by independent data."
        elif compliance_rate >= 70:
            return "Majority of ESG claims verified. Minor discrepancies require attention."
        elif compliance_rate >= 50:
            return "Significant discrepancies detected. Recommend borrower engagement and corrective action."
        else:
            return "Critical ESG compliance issues identified. Immediate investigation required."
    
    def clear_all_caches(self):
        """Clear cache for all API services"""
        for service in self.services.values():
            service.clear_cache()
        logger.info("All API caches cleared")


# Global API manager instance
api_manager = APIManager()
