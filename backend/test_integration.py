"""
Quick API Integration Test Script
Tests all critical endpoints and external API connectivity
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
USERNAME = "demo@esglend.com"
PASSWORD = "demo123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

# Test authentication
def test_auth():
    print_info("Testing Authentication...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            data={"username": USERNAME, "password": PASSWORD}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            print_success(f"Authentication successful - Token: {token[:20]}...")
            return token
        else:
            print_error(f"Authentication failed: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Authentication error: {str(e)}")
        return None

# Test loans endpoint
def test_loans(token):
    print_info("Testing Loans API...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/v1/loans", headers=headers)
        if response.status_code == 200:
            loans = response.json()
            print_success(f"Loans API working - Found {len(loans)} loans")
            return loans[0] if loans else None
        else:
            print_error(f"Loans API failed: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Loans API error: {str(e)}")
        return None

# Test SFDR compliance history (NEW ENDPOINT)
def test_sfdr_compliance_history(token, loan_id):
    print_info(f"Testing SFDR Compliance History API (loan {loan_id})...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/v1/sfdr/compliance-history/{loan_id}",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            history = data.get("history", [])
            print_success(f"SFDR Compliance History working - {data['total_records']} records")
            if history:
                print_info(f"  Latest: {history[-1]['period']} - Score: {history[-1]['compliance_score']:.1f}")
            return True
        else:
            print_error(f"SFDR Compliance History failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"SFDR Compliance History error: {str(e)}")
        return False

# Test pricing API
def test_pricing(token, loan_id):
    print_info(f"Testing Pricing API (loan {loan_id})...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/api/v1/pricing/calculate",
            headers=headers,
            json={"loan_id": loan_id}
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Pricing API working - Margin: {data.get('total_margin', 'N/A')}")
            return True
        else:
            print_warning(f"Pricing API returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Pricing API error: {str(e)}")
        return False

# Test risk assessment
def test_risk(token, loan_id):
    print_info(f"Testing Risk Assessment API (loan {loan_id})...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/api/v1/risk/assess/{loan_id}",  # FIXED: Added /{loan_id}
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Risk API working - Score: {data.get('risk_score', 'N/A')}")
            return True
        else:
            print_warning(f"Risk API returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Risk API error: {str(e)}")
        return False

# Test external APIs status
def test_external_apis(token):
    print_info("Testing External APIs Status...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/v1/api-status/status",  # FIXED: Correct path
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            sources = data.get("data_sources", [])
            print_success(f"External APIs Status working - {len(sources)} sources")
            for source in sources:
                status_icon = "✓" if source["status"] == "available" else "✗"
                print(f"  {status_icon} {source['name']}: {source['status']}")
            return True
        else:
            print_warning(f"External APIs Status returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"External APIs error: {str(e)}")
        return False

# Test SFDR PAI indicators
def test_sfdr_pai(token, loan_id):
    print_info(f"Testing SFDR PAI Indicators (loan {loan_id})...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/v1/sfdr/pai-indicators/{loan_id}",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            indicators = data.get("pai_indicators", [])
            print_success(f"SFDR PAI working - {len(indicators)} indicators")
            return True
        else:
            print_warning(f"SFDR PAI returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"SFDR PAI error: {str(e)}")
        return False

# Run all tests
def main():
    print("\n" + "="*60)
    print("🧪 ESGLend API Integration Test Suite")
    print("="*60 + "\n")
    
    results = {
        "passed": 0,
        "failed": 0,
        "total": 0
    }
    
    # Test 1: Authentication
    results["total"] += 1
    token = test_auth()
    if token:
        results["passed"] += 1
    else:
        results["failed"] += 1
        print_error("\nCannot continue without authentication. Exiting.")
        return
    
    print()
    
    # Test 2: Loans
    results["total"] += 1
    loan = test_loans(token)
    if loan:
        results["passed"] += 1
        loan_id = loan["id"]
        print()
    else:
        results["failed"] += 1
        print_warning("No loans found. Some tests will be skipped.\n")
        loan_id = None
    
    if loan_id:
        # Test 3: SFDR Compliance History (NEW!)
        results["total"] += 1
        if test_sfdr_compliance_history(token, loan_id):
            results["passed"] += 1
        else:
            results["failed"] += 1
        print()
        
        # Test 4: Pricing
        results["total"] += 1
        if test_pricing(token, loan_id):
            results["passed"] += 1
        else:
            results["failed"] += 1
        print()
        
        # Test 5: Risk
        results["total"] += 1
        if test_risk(token, loan_id):
            results["passed"] += 1
        else:
            results["failed"] += 1
        print()
        
        # Test 6: SFDR PAI
        results["total"] += 1
        if test_sfdr_pai(token, loan_id):
            results["passed"] += 1
        else:
            results["failed"] += 1
        print()
    
    # Test 7: External APIs
    results["total"] += 1
    if test_external_apis(token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    print(f"Total Tests: {results['total']}")
    print(f"{Colors.GREEN}Passed: {results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {results['failed']}{Colors.RESET}")
    pass_rate = (results['passed'] / results['total'] * 100) if results['total'] > 0 else 0
    print(f"Pass Rate: {pass_rate:.1f}%")
    
    if pass_rate == 100:
        print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED! System ready for demo.{Colors.RESET}")
    elif pass_rate >= 80:
        print(f"\n{Colors.YELLOW}⚠️ Most tests passed. Review failed tests.{Colors.RESET}")
    else:
        print(f"\n{Colors.RED}❌ Multiple tests failed. System needs attention.{Colors.RESET}")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
