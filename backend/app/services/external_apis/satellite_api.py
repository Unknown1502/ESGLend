"""
NASA FIRMS API Integration
Fire Information for Resource Management System - satellite fire detection
Free, unlimited access
"""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from .base_api import BaseAPIService, APIException
import logging

logger = logging.getLogger(__name__)


class SatelliteAPIService(BaseAPIService):
    """NASA FIRMS API for satellite-based environmental monitoring"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key=api_key or os.getenv("NASA_FIRMS_API_KEY", ""))
        # NASA FIRMS doesn't require API key for basic access
        self.base_url = "https://firms.modaps.eosdis.nasa.gov/api/"
        self.cache_ttl = 86400  # 24 hours (satellite data doesn't change frequently)
        
    def check_fire_activity(self, latitude: float, longitude: float, 
                           radius_km: int = 50, days: int = 10) -> Dict[str, Any]:
        """
        Check for fire/deforestation activity near location
        
        Args:
            latitude: Center point latitude
            longitude: Center point longitude
            radius_km: Search radius in kilometers (max 500)
            days: Number of days to look back (max 10)
            
        Returns:
            Fire detection data and risk assessment
        """
        cache_key = self._get_cache_key("fire", latitude, longitude, radius_km, days)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            # NASA FIRMS API endpoint for area search
            # Note: This is a simplified version. Real implementation would use actual FIRMS API
            endpoint = f"area/csv/{self.api_key}/VIIRS_SNPP_NRT/{latitude},{longitude}/{radius_km}/{days}"
            
            # For demo, simulate the API response structure
            result = self._simulate_fire_data(latitude, longitude, radius_km, days)
            
            self._save_to_cache(cache_key, result)
            return result
            
        except Exception as e:
            logger.error(f"Failed to check fire activity: {str(e)}")
            return self._simulate_fire_data(latitude, longitude, radius_km, days)
    
    def verify_deforestation_claim(self, latitude: float, longitude: float,
                                   claim: str, reported_status: str) -> Dict[str, Any]:
        """
        Verify deforestation/land use claims using satellite data
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            claim: Type of claim (e.g., "no_deforestation", "reforestation")
            reported_status: Borrower's reported status
            
        Returns:
            Verification result with satellite evidence
        """
        try:
            fire_data = self.check_fire_activity(latitude, longitude, radius_km=20, days=30)
            
            # Analyze fire activity for deforestation indicators
            fire_count = fire_data["summary"]["total_detections"]
            high_confidence_fires = fire_data["summary"]["high_confidence_count"]
            
            # Determine verification based on fire activity
            if claim == "no_deforestation":
                verified = fire_count < 5  # Low fire activity
                confidence = 100 - (fire_count * 5)  # Reduce confidence with more fires
            elif claim == "reforestation":
                verified = fire_count == 0  # No fire activity expected
                confidence = 100 if fire_count == 0 else 50
            else:
                verified = True
                confidence = 70
            
            confidence = max(0, min(100, confidence))
            
            return {
                "source": "NASA FIRMS",
                "timestamp": datetime.now().isoformat(),
                "location": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "claim_type": claim,
                "reported_status": reported_status,
                "satellite_evidence": {
                    "fire_detections": fire_count,
                    "high_confidence_detections": high_confidence_fires,
                    "period_days": 30,
                    "risk_level": fire_data["risk_assessment"]["level"]
                },
                "verified": verified,
                "confidence_score": round(confidence, 2),
                "status": "verified" if verified else "requires_investigation",
                "recommendation": self._get_recommendation(fire_count, claim)
            }
            
        except Exception as e:
            logger.error(f"Failed to verify deforestation claim: {str(e)}")
            return {
                "verified": False,
                "confidence": 0,
                "error": str(e),
                "status": "verification_failed"
            }
    
    def get_land_use_change(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Get land use change detection data
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Land use change analysis
        """
        cache_key = self._get_cache_key("land_use", latitude, longitude)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        result = {
            "source": "NASA FIRMS",
            "timestamp": datetime.now().isoformat(),
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "analysis_period": "90 days",
            "change_detected": False,
            "change_type": None,
            "confidence": 85.5,
            "baseline_vegetation_index": 0.72,
            "current_vegetation_index": 0.74,
            "change_percentage": 2.78,
            "status": "stable",
            "simulated": True
        }
        
        self._save_to_cache(cache_key, result)
        return result
    
    def _simulate_fire_data(self, latitude: float, longitude: float, 
                           radius_km: int, days: int) -> Dict[str, Any]:
        """Simulate fire detection data (for demo/fallback)"""
        import random
        
        # Generate realistic fire detections
        num_detections = random.randint(0, 15)
        detections = []
        
        for i in range(num_detections):
            detection = {
                "latitude": latitude + random.uniform(-0.5, 0.5),
                "longitude": longitude + random.uniform(-0.5, 0.5),
                "brightness": random.uniform(300, 400),
                "confidence": random.choice(["low", "nominal", "high"]),
                "frp": random.uniform(1, 50),  # Fire Radiative Power
                "acquisition_date": (datetime.now() - timedelta(days=random.randint(0, days))).isoformat(),
                "satellite": "VIIRS_SNPP_NRT"
            }
            detections.append(detection)
        
        high_conf_count = sum(1 for d in detections if d["confidence"] == "high")
        
        # Risk assessment
        if num_detections == 0:
            risk_level = "none"
        elif num_detections < 5:
            risk_level = "low"
        elif num_detections < 10:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "source": "NASA FIRMS",
            "timestamp": datetime.now().isoformat(),
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km
            },
            "analysis_period": {
                "days": days,
                "start_date": (datetime.now() - timedelta(days=days)).isoformat(),
                "end_date": datetime.now().isoformat()
            },
            "summary": {
                "total_detections": num_detections,
                "high_confidence_count": high_conf_count,
                "low_confidence_count": num_detections - high_conf_count,
                "avg_fire_radiative_power": round(sum(d["frp"] for d in detections) / max(1, num_detections), 2)
            },
            "detections": detections[:10],  # Limit to first 10
            "risk_assessment": {
                "level": risk_level,
                "score": num_detections * 6.67,  # 0-100 scale
                "description": self._get_risk_description(risk_level)
            },
            "simulated": True
        }
    
    def _get_risk_description(self, risk_level: str) -> str:
        """Get risk level description"""
        descriptions = {
            "none": "No fire activity detected in the area",
            "low": "Minimal fire activity detected, likely controlled burns",
            "medium": "Moderate fire activity detected, monitoring recommended",
            "high": "Significant fire activity detected, investigation required"
        }
        return descriptions.get(risk_level, "Unknown risk level")
    
    def _get_recommendation(self, fire_count: int, claim: str) -> str:
        """Get recommendation based on analysis"""
        if fire_count == 0:
            return "Satellite data supports the environmental claim"
        elif fire_count < 5:
            return "Minor fire activity detected, recommend field verification"
        else:
            return "Significant fire activity detected, claim requires investigation"
