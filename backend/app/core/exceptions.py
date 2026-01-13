"""
Custom exception classes for ESGLend API
Provides specific error handling for different business scenarios
"""
from fastapi import HTTPException, status


class ESGLendException(HTTPException):
    """Base exception for ESGLend application"""
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class ResourceNotFoundException(ESGLendException):
    """Raised when a requested resource is not found"""
    def __init__(self, resource: str, resource_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with ID {resource_id} not found"
        )


class LoanNotFoundException(ResourceNotFoundException):
    """Raised when a loan is not found"""
    def __init__(self, loan_id: int):
        super().__init__("Loan", loan_id)


class BorrowerNotFoundException(ResourceNotFoundException):
    """Raised when a borrower is not found"""
    def __init__(self, borrower_id: int):
        super().__init__("Borrower", borrower_id)


class VerificationNotFoundException(ResourceNotFoundException):
    """Raised when a verification is not found"""
    def __init__(self, verification_id: int):
        super().__init__("Verification", verification_id)


class KPINotFoundException(ResourceNotFoundException):
    """Raised when an ESG KPI is not found"""
    def __init__(self, kpi_id: int):
        super().__init__("ESG KPI", kpi_id)


class AuthenticationException(ESGLendException):
    """Raised when authentication fails"""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class AuthorizationException(ESGLendException):
    """Raised when user lacks required permissions"""
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class ValidationException(ESGLendException):
    """Raised when input validation fails"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class DuplicateResourceException(ESGLendException):
    """Raised when attempting to create a duplicate resource"""
    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{resource} with {field} '{value}' already exists"
        )


class NoKPIsFoundException(ESGLendException):
    """Raised when a loan has no KPIs to verify"""
    def __init__(self, loan_id: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loan {loan_id} has no ESG KPIs to verify. Add KPIs before running verification."
        )


class NoMeasurementsFoundException(ESGLendException):
    """Raised when KPIs have no measurements"""
    def __init__(self, loan_id: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loan {loan_id} KPIs have no measurements. Add measurements before verification."
        )
