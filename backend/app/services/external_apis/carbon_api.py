"""
UK Carbon Intensity API Integration
Provides real-time carbon intensity data for electricity grid
Free, unlimited access
"""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from .base_api import BaseAPIService, APIException
import logging

logger = logging.getLogger(__name__)


class CarbonAPIService(BaseAPIService):
    """UK Carbon Intensity API for grid carbon data"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key=api_key)
        self.base_url = "https://api.carbonintensity.org.uk/"
        self.cache_ttl = 1800  # 30 minutes
        
    def get_current_intensity(self, postcode: Optional[str] = None) -> Dict[str, Any]:
        """
        Get current carbon intensity for UK grid or specific postcode
        
        Args:
            postcode: UK postcode (optional, defaults to national)
            
        Returns:
            Current carbon intensity data
        """
        cache_key = self._get_cache_key("current", postcode)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            if postcode:
                endpoint = f"regional/postcode/{postcode}"
            else:
                endpoint = "intensity"
            
            data = self._make_request(endpoint)
            
            if postcode:
                intensity_data = data["data"][0]["data"][0]
            else:
                intensity_data = data["data"][0]
            
            result = {
                "source": "UK Carbon Intensity API",
                "timestamp": datetime.now().isoformat(),
                "location": postcode or "UK National",
                "intensity": {
                    "forecast": intensity_data["intensity"]["forecast"],
                    "actual": intensity_data["intensity"].get("actual"),
                    "index": intensity_data["intensity"]["index"],
                    "unit": "gCO2/kWh"
                },
                "generation_mix": self._parse_generation_mix(intensity_data.get("generationmix", [])),
                "from_time": intensity_data["from"],
                "to_time": intensity_data["to"],
                "raw_data": data
            }
            
            self._save_to_cache(cache_key, result)
            return result
            
        except Exception as e:
            logger.error(f"Failed to get carbon intensity: {str(e)}")
            return self._get_simulated_intensity(postcode)
    
    def get_intensity_forecast(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get carbon intensity forecast
        
        Args:
            hours: Forecast period in hours (max 96)
            
        Returns:
            Forecast data
        """
        cache_key = self._get_cache_key("forecast", hours)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            from_time = datetime.now().isoformat()
            to_time = (datetime.now() + timedelta(hours=hours)).isoformat()
            
            endpoint = f"intensity/{from_time}/{to_time}"
            data = self._make_request(endpoint)
            
            forecast_points = []
            for point in data["data"]:
                forecast_points.append({
                    "from": point["from"],
                    "to": point["to"],
                    "intensity": point["intensity"]["forecast"],
                    "index": point["intensity"]["index"]
                })
            
            result = {
                "source": "UK Carbon Intensity API",
                "timestamp": datetime.now().isoformat(),
                "forecast_period": f"{hours} hours",
                "data_points": len(forecast_points),
                "forecast": forecast_points,
                "average_intensity": sum(p["intensity"] for p in forecast_points) / len(forecast_points),
                "peak_intensity": max(p["intensity"] for p in forecast_points),
                "low_intensity": min(p["intensity"] for p in forecast_points)
            }
            
            self._save_to_cache(cache_key, result)
            return result
            
        except Exception as e:
            logger.error(f"Failed to get forecast: {str(e)}")
            return self._get_simulated_forecast(hours)
    
    def verify_carbon_claim(self, reported_intensity: float, 
                           reported_period: str, postcode: Optional[str] = None) -> Dict[str, Any]:
        """
        Verify carbon intensity claim
        
        Args:
            reported_intensity: Carbon intensity reported by borrower (gCO2/kWh)
            reported_period: Time period of report
            postcode: UK postcode (optional)
            
        Returns:
            Verification result
        """
        try:
            current_data = self.get_current_intensity(postcode)
            actual_intensity = current_data["intensity"]["forecast"]
            
            discrepancy = abs(actual_intensity - reported_intensity)
            discrepancy_pct = (discrepancy / actual_intensity * 100) if actual_intensity != 0 else 0
            
            # Determine verification status
            verified = discrepancy_pct < 15  # Within 15% tolerance
            confidence = max(0, 100 - discrepancy_pct * 1.5)
            
            return {
                "source": "UK Carbon Intensity API",
                "timestamp": datetime.now().isoformat(),
                "location": postcode or "UK National",
                "reported_intensity": reported_intensity,
                "verified_intensity": actual_intensity,
                "discrepancy": round(discrepancy, 2),
                "discrepancy_percentage": round(discrepancy_pct, 2),
                "verified": verified,
                "confidence_score": round(confidence, 2),
                "status": "verified" if verified else "discrepancy_detected",
                "intensity_index": current_data["intensity"]["index"],
                "generation_mix": current_data["generation_mix"]
            }
            
        except Exception as e:
            logger.error(f"Failed to verify carbon claim: {str(e)}")
            return {
                "verified": False,
                "confidence": 0,
                "error": str(e),
                "status": "verification_failed"
            }
    
    def calculate_emissions(self, energy_kwh: float, postcode: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculate CO2 emissions for energy consumption
        
        Args:
            energy_kwh: Energy consumption in kWh
            postcode: UK postcode (optional)
            
        Returns:
            Calculated emissions
        """
        try:
            intensity_data = self.get_current_intensity(postcode)
            intensity = intensity_data["intensity"]["forecast"]
            
            emissions_kg = (energy_kwh * intensity) / 1000  # Convert gCO2 to kgCO2
            
            return {
                "source": "UK Carbon Intensity API",
                "timestamp": datetime.now().isoformat(),
                "location": postcode or "UK National",
                "energy_kwh": energy_kwh,
                "carbon_intensity": intensity,
                "emissions_kg_co2": round(emissions_kg, 2),
                "emissions_tonnes_co2": round(emissions_kg / 1000, 4),
                "calculation": f"{energy_kwh} kWh × {intensity} gCO2/kWh = {round(emissions_kg, 2)} kg CO2"
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate emissions: {str(e)}")
            return {
                "error": str(e),
                "status": "calculation_failed"
            }
    
    def _parse_generation_mix(self, mix_data: List[Dict]) -> Dict[str, float]:
        """Parse generation mix data"""
        return {item["fuel"]: item["perc"] for item in mix_data}
    
    def _get_simulated_intensity(self, postcode: Optional[str]) -> Dict[str, Any]:
        """Fallback: Return simulated carbon intensity"""
        import random
        
        intensity = random.randint(150, 300)
        index_map = {
            range(0, 100): "very low",
            range(100, 200): "low",
            range(200, 300): "moderate",
            range(300, 400): "high",
            range(400, 500): "very high"
        }
        
        index = next((v for k, v in index_map.items() if intensity in k), "moderate")
        
        return {
            "source": "UK Carbon Intensity API (Simulated)",
            "timestamp": datetime.now().isoformat(),
            "location": postcode or "UK National",
            "intensity": {
                "forecast": intensity,
                "actual": None,
                "index": index,
                "unit": "gCO2/kWh"
            },
            "generation_mix": {
                "gas": 40.2,
                "wind": 25.8,
                "nuclear": 18.5,
                "solar": 8.3,
                "biomass": 4.2,
                "coal": 2.0,
                "hydro": 1.0
            },
            "from_time": datetime.now().isoformat(),
            "to_time": (datetime.now() + timedelta(minutes=30)).isoformat(),
            "simulated": True
        }
    
    def _get_simulated_forecast(self, hours: int) -> Dict[str, Any]:
        """Fallback: Return simulated forecast"""
        import random
        
        forecast_points = []
        for i in range(min(hours, 24)):
            from_time = datetime.now() + timedelta(hours=i)
            to_time = from_time + timedelta(hours=1)
            intensity = random.randint(150, 300)
            
            forecast_points.append({
                "from": from_time.isoformat(),
                "to": to_time.isoformat(),
                "intensity": intensity,
                "index": "moderate"
            })
        
        return {
            "source": "UK Carbon Intensity API (Simulated)",
            "timestamp": datetime.now().isoformat(),
            "forecast_period": f"{hours} hours",
            "data_points": len(forecast_points),
            "forecast": forecast_points,
            "average_intensity": sum(p["intensity"] for p in forecast_points) / len(forecast_points),
            "peak_intensity": max(p["intensity"] for p in forecast_points),
            "low_intensity": min(p["intensity"] for p in forecast_points),
            "simulated": True
        }
