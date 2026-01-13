"""
Unit tests for ESGLend API endpoints
Tests critical functionality: authentication, loans, verifications
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.base import Base
from app.database.session import get_db
from app.core.security import get_password_hash
from app.models.models import User, Borrower, Loan, ESGKpi, ESGMeasurement
from datetime import datetime, timedelta

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(test_db):
    """Create a test user"""
    user = User(
        email="test@esglend.com",
        hashed_password=get_password_hash("Test123!"),
        full_name="Test User",
        organization="Test Org",
        role="admin",
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_borrower(test_db):
    """Create a test borrower"""
    borrower = Borrower(
        name="Test Company Inc",
        industry="Technology",
        country="US",
        credit_rating="AAA",
        description="Test company for testing"
    )
    test_db.add(borrower)
    test_db.commit()
    test_db.refresh(borrower)
    return borrower


@pytest.fixture
def test_loan(test_db, test_borrower):
    """Create a test loan"""
    loan = Loan(
        loan_number="TEST-001",
        borrower_id=test_borrower.id,
        loan_type="Term Loan",
        amount=1000000.0,
        currency="USD",
        interest_rate=5.5,
        base_margin=2.0,
        current_margin=2.0,
        maturity_date=datetime.now() + timedelta(days=365),
        status="active",
        sustainability_linked=True
    )
    test_db.add(loan)
    test_db.commit()
    test_db.refresh(loan)
    return loan


@pytest.fixture
def auth_token(test_user):
    """Get authentication token for test user"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@esglend.com", "password": "Test123!"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


# Test Health Check
def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


# Test Authentication
class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self, test_user):
        """Test successful login"""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "test@esglend.com", "password": "Test123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, test_user):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "test@esglend.com", "password": "WrongPassword"}
        )
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "nonexistent@test.com", "password": "password"}
        )
        assert response.status_code == 401


# Test Loans Endpoints
class TestLoans:
    """Test loan management endpoints"""
    
    def test_create_loan(self, test_db, test_borrower, auth_headers):
        """Test creating a new loan"""
        loan_data = {
            "loan_number": "TEST-NEW-001",
            "borrower_id": test_borrower.id,
            "loan_type": "Term Loan",
            "amount": 5000000.0,
            "currency": "USD",
            "interest_rate": 4.5,
            "base_margin": 1.5,
            "maturity_date": (datetime.now() + timedelta(days=730)).isoformat(),
            "status": "active",
            "sustainability_linked": True
        }
        response = client.post(
            "/api/v1/loans/",
            json=loan_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["loan_number"] == "TEST-NEW-001"
        assert data["amount"] == 5000000.0
    
    def test_create_loan_invalid_borrower(self, auth_headers):
        """Test creating loan with non-existent borrower"""
        loan_data = {
            "loan_number": "TEST-INVALID-001",
            "borrower_id": 99999,  # Non-existent
            "amount": 1000000.0,
            "currency": "USD",
            "status": "active",
            "sustainability_linked": True
        }
        response = client.post(
            "/api/v1/loans/",
            json=loan_data,
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_loans(self, test_loan, auth_headers):
        """Test retrieving all loans"""
        response = client.get("/api/v1/loans/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_get_loan_by_id(self, test_loan, auth_headers):
        """Test retrieving a specific loan"""
        response = client.get(f"/api/v1/loans/{test_loan.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_loan.id
        assert data["loan_number"] == test_loan.loan_number
    
    def test_get_loan_not_found(self, auth_headers):
        """Test retrieving non-existent loan"""
        response = client.get("/api/v1/loans/99999", headers=auth_headers)
        assert response.status_code == 404
    
    def test_update_loan(self, test_loan, auth_headers):
        """Test updating a loan"""
        update_data = {
            "loan_number": test_loan.loan_number,
            "borrower_id": test_loan.borrower_id,
            "amount": test_loan.amount,
            "currency": test_loan.currency,
            "interest_rate": 6.0,  # Changed
            "status": "active",
            "sustainability_linked": True
        }
        response = client.put(
            f"/api/v1/loans/{test_loan.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["interest_rate"] == 6.0
    
    def test_delete_loan(self, test_loan, auth_headers):
        """Test deleting a loan"""
        response = client.delete(
            f"/api/v1/loans/{test_loan.id}",
            headers=auth_headers
        )
        assert response.status_code == 204


# Test Verifications
class TestVerifications:
    """Test verification endpoints"""
    
    def test_run_verification_no_kpis(self, test_loan, auth_headers):
        """Test running verification on loan with no KPIs"""
        response = client.post(
            f"/api/v1/verifications/{test_loan.id}/run-verification",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "no ESG KPIs" in response.json()["detail"].lower()
    
    def test_run_verification_success(self, test_db, test_loan, auth_headers):
        """Test successful verification"""
        # Create KPI
        kpi = ESGKpi(
            loan_id=test_loan.id,
            kpi_name="CO2 Emissions Reduction",
            kpi_category="environmental",
            target_value=30.0,
            current_value=25.0,
            unit="%",
            baseline_value=100.0,
            status="on_track"
        )
        test_db.add(kpi)
        test_db.commit()
        test_db.refresh(kpi)
        
        # Create measurement
        measurement = ESGMeasurement(
            kpi_id=kpi.id,
            measured_value=25.0,
            measurement_date=datetime.now(),
            data_source="Test Source",
            verification_status="pending"
        )
        test_db.add(measurement)
        test_db.commit()
        
        # Run verification
        response = client.post(
            f"/api/v1/verifications/{test_loan.id}/run-verification",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "verification_id" in data
        assert "confidence_score" in data
        assert "risk_level" in data
        assert data["verified_kpis"] > 0
    
    def test_get_verifications(self, test_db, test_loan, auth_headers):
        """Test retrieving verifications"""
        response = client.get(
            f"/api/v1/verifications/?loan_id={test_loan.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


# Test Borrowers
class TestBorrowers:
    """Test borrower endpoints"""
    
    def test_create_borrower(self, auth_headers):
        """Test creating a new borrower"""
        borrower_data = {
            "name": "New Test Company",
            "industry": "Finance",
            "country": "GB",
            "credit_rating": "AA"
        }
        response = client.post(
            "/api/v1/borrowers/",
            json=borrower_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Test Company"
    
    def test_get_borrowers(self, test_borrower, auth_headers):
        """Test retrieving all borrowers"""
        response = client.get("/api/v1/borrowers/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


# Run tests with: pytest tests/test_api.py -v
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
