"""
External API Status Endpoint
Monitor health and availability of all integrated third-party APIs
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database.session import get_db
from app.services.external_apis.api_manager import api_manager

router = APIRouter()


@router.get("/status")
def get_api_status() -> Dict[str, Any]:
    """
    Get status of all external API integrations
    
    Returns:
        Status for each API service including availability and errors
    """
    return api_manager.get_all_statuses()


@router.post("/clear-cache")
def clear_api_cache() -> Dict[str, str]:
    """
    Clear cached data from all API services
    
    Returns:
        Success message
    """
    api_manager.clear_all_caches()
    return {"message": "All API caches cleared successfully"}


@router.get("/test/weather")
def test_weather_api(latitude: float = 51.5074, longitude: float = -0.1278):
    """Test OpenWeatherMap API"""
    return api_manager.weather_api.get_current_weather(latitude, longitude)


@router.get("/test/satellite")
def test_satellite_api(latitude: float = -3.4653, longitude: float = -62.2159):
    """Test NASA FIRMS Satellite API (Amazon rainforest coordinates)"""
    return api_manager.satellite_api.check_fire_activity(latitude, longitude, radius_km=100, days=10)


@router.get("/test/carbon")
def test_carbon_api(postcode: str = None):
    """Test UK Carbon Intensity API"""
    return api_manager.carbon_api.get_current_intensity(postcode)


@router.get("/test/esg-rating")
def test_esg_rating_api(symbol: str = "AAPL"):
    """Test Alpha Vantage ESG Rating API"""
    return api_manager.esg_rating_api.get_esg_rating(symbol)
