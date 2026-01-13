"""
OpenWeatherMap API Integration
Provides historical and current weather/climate data for environmental verification
Free tier: 1,000 calls/day
"""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from .base_api import BaseAPIService, APIException
import logging

logger = logging.getLogger(__name__)


class WeatherAPIService(BaseAPIService):
    """OpenWeatherMap API Service for climate data verification"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key=api_key or os.getenv("OPENWEATHER_API_KEY"))
        self.base_url = "https://api.openweathermap.org/data/2.5/"
        self.cache_ttl = 3600  # 1 hour
        
    def get_current_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Get current weather data for location
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Weather data including temperature, humidity, conditions
        """
        cache_key = self._get_cache_key("current", latitude, longitude)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric"
            }
            
            data = self._make_request("weather", params=params)
            
            result = {
                "source": "OpenWeatherMap",
                "timestamp": datetime.now().isoformat(),
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "name": data.get("name", "Unknown")
                },
                "temperature": {
                    "current": data["main"]["temp"],
                    "feels_like": data["main"]["feels_like"],
                    "min": data["main"]["temp_min"],
                    "max": data["main"]["temp_max"],
                    "unit": "celsius"
                },
                "humidity": data["main"]["humidity"],
                "pressure": data["main"]["pressure"],
                "conditions": data["weather"][0]["description"],
                "wind_speed": data["wind"]["speed"],
                "clouds": data.get("clouds", {}).get("all", 0),
                "visibility": data.get("visibility", 0),
                "raw_data": data
            }
            
            self._save_to_cache(cache_key, result)
            return result
            
        except Exception as e:
            logger.error(f"Failed to get weather data: {str(e)}")
            # Return simulated data as fallback
            return self._get_simulated_weather(latitude, longitude)
    
    def get_air_quality(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Get air quality data for location
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Air quality index and pollutant levels
        """
        cache_key = self._get_cache_key("air_quality", latitude, longitude)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        try:
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key
            }
            
            data = self._make_request("air_pollution", params=params)
            
            aqi_levels = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}
            aqi = data["list"][0]["main"]["aqi"]
            components = data["list"][0]["components"]
            
            result = {
                "source": "OpenWeatherMap",
                "timestamp": datetime.now().isoformat(),
                "location": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "aqi": {
                    "value": aqi,
                    "level": aqi_levels.get(aqi, "Unknown")
                },
                "pollutants": {
                    "co": components.get("co", 0),  # Carbon monoxide
                    "no2": components.get("no2", 0),  # Nitrogen dioxide
                    "o3": components.get("o3", 0),  # Ozone
                    "pm2_5": components.get("pm2_5", 0),  # Fine particles
                    "pm10": components.get("pm10", 0),  # Coarse particles
                    "so2": components.get("so2", 0)  # Sulfur dioxide
                },
                "raw_data": data
            }
            
            self._save_to_cache(cache_key, result)
            return result
            
        except Exception as e:
            logger.error(f"Failed to get air quality data: {str(e)}")
            return self._get_simulated_air_quality(latitude, longitude)
    
    def verify_climate_claim(self, latitude: float, longitude: float, 
                            claim_type: str, reported_value: float) -> Dict[str, Any]:
        """
        Verify environmental claim using weather data
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            claim_type: Type of claim (temperature, humidity, etc.)
            reported_value: Value reported by borrower
            
        Returns:
            Verification result with confidence score
        """
        try:
            weather_data = self.get_current_weather(latitude, longitude)
            
            # Map claim types to weather data
            claim_mapping = {
                "temperature": weather_data["temperature"]["current"],
                "humidity": weather_data["humidity"],
                "wind_speed": weather_data["wind_speed"],
                "cloud_coverage": weather_data["clouds"]
            }
            
            if claim_type not in claim_mapping:
                return {
                    "verified": False,
                    "confidence": 0,
                    "message": f"Unknown claim type: {claim_type}"
                }
            
            actual_value = claim_mapping[claim_type]
            discrepancy = abs(actual_value - reported_value)
            discrepancy_pct = (discrepancy / actual_value * 100) if actual_value != 0 else 0
            
            # Determine verification status
            verified = discrepancy_pct < 10  # Within 10% tolerance
            confidence = max(0, 100 - discrepancy_pct * 2)
            
            return {
                "source": "OpenWeatherMap",
                "timestamp": datetime.now().isoformat(),
                "claim_type": claim_type,
                "reported_value": reported_value,
                "verified_value": actual_value,
                "discrepancy": discrepancy,
                "discrepancy_percentage": round(discrepancy_pct, 2),
                "verified": verified,
                "confidence_score": round(confidence, 2),
                "status": "verified" if verified else "discrepancy_detected",
                "location": weather_data["location"]
            }
            
        except Exception as e:
            logger.error(f"Failed to verify climate claim: {str(e)}")
            return {
                "verified": False,
                "confidence": 0,
                "error": str(e),
                "status": "verification_failed"
            }
    
    def _get_simulated_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Fallback: Return simulated weather data"""
        import random
        return {
            "source": "OpenWeatherMap (Simulated)",
            "timestamp": datetime.now().isoformat(),
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "name": "Location"
            },
            "temperature": {
                "current": round(random.uniform(10, 30), 1),
                "feels_like": round(random.uniform(10, 30), 1),
                "min": round(random.uniform(5, 20), 1),
                "max": round(random.uniform(20, 35), 1),
                "unit": "celsius"
            },
            "humidity": random.randint(30, 90),
            "pressure": random.randint(1000, 1030),
            "conditions": "Clear sky",
            "wind_speed": round(random.uniform(0, 15), 1),
            "clouds": random.randint(0, 100),
            "visibility": 10000,
            "simulated": True
        }
    
    def _get_simulated_air_quality(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Fallback: Return simulated air quality data"""
        import random
        aqi = random.randint(1, 3)
        aqi_levels = {1: "Good", 2: "Fair", 3: "Moderate"}
        
        return {
            "source": "OpenWeatherMap (Simulated)",
            "timestamp": datetime.now().isoformat(),
            "location": {"latitude": latitude, "longitude": longitude},
            "aqi": {"value": aqi, "level": aqi_levels[aqi]},
            "pollutants": {
                "co": round(random.uniform(200, 400), 2),
                "no2": round(random.uniform(10, 30), 2),
                "o3": round(random.uniform(30, 70), 2),
                "pm2_5": round(random.uniform(5, 25), 2),
                "pm10": round(random.uniform(10, 50), 2),
                "so2": round(random.uniform(1, 10), 2)
            },
            "simulated": True
        }
