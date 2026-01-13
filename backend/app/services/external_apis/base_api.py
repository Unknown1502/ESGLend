"""
Base API Service - Template for all external API integrations
Includes error handling, caching, and fallback mechanisms
"""

import requests
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from functools import wraps
import time

logger = logging.getLogger(__name__)


class APIException(Exception):
    """Custom exception for API errors"""
    pass


def with_retry(max_retries=3, delay=1):
    """Decorator to retry failed API calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(f"API call failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    time.sleep(delay * (attempt + 1))
            return None
        return wrapper
    return decorator


class BaseAPIService:
    """Base class for all external API services"""
    
    def __init__(self, api_key: Optional[str] = None, use_cache: bool = True):
        self.api_key = api_key
        self.use_cache = use_cache
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour default
        self.base_url = ""
        self.is_available = True
        self.last_error = None
        
    def _get_cache_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        return f"{self.__class__.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if available and not expired"""
        if not self.use_cache:
            return None
            
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
                logger.info(f"Cache hit: {cache_key}")
                return data
            else:
                # Expired, remove from cache
                del self.cache[cache_key]
        return None
    
    def _save_to_cache(self, cache_key: str, data: Any):
        """Save data to cache"""
        if self.use_cache:
            self.cache[cache_key] = (data, datetime.now())
            logger.info(f"Cached: {cache_key}")
    
    @with_retry(max_retries=3, delay=1)
    def _make_request(self, endpoint: str, params: Optional[Dict] = None, 
                     method: str = "GET") -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, params=params, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=params, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            self.is_available = True
            self.last_error = None
            return response.json()
            
        except requests.exceptions.RequestException as e:
            self.is_available = False
            self.last_error = str(e)
            logger.error(f"API request failed: {url} - {str(e)}")
            raise APIException(f"API request failed: {str(e)}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get API service status"""
        return {
            "service": self.__class__.__name__,
            "available": self.is_available,
            "last_error": self.last_error,
            "cache_size": len(self.cache)
        }
    
    def clear_cache(self):
        """Clear all cached data"""
        self.cache.clear()
        logger.info(f"Cache cleared for {self.__class__.__name__}")
