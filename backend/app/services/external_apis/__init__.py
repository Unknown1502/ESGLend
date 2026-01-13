"""
External API Integration Services
Provides real-time data verification from multiple third-party sources
"""

from .weather_api import WeatherAPIService
from .satellite_api import SatelliteAPIService
from .carbon_api import CarbonAPIService
from .esg_rating_api import ESGRatingAPIService
from .api_manager import APIManager

__all__ = [
    'WeatherAPIService',
    'SatelliteAPIService', 
    'CarbonAPIService',
    'ESGRatingAPIService',
    'APIManager'
]
