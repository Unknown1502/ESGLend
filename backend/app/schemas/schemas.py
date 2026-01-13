from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Union, Any
from datetime import datetime
import re


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    organization: Optional[str] = Field(None, max_length=200)
    role: str = Field(default="viewer", pattern="^(admin|manager|analyst|viewer)$")


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password has minimum strength requirements"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class UserUpdate(BaseModel):
    role: Optional[str] = Field(None, pattern="^(admin|manager|analyst|viewer)$")
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class BorrowerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    industry: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, min_length=2, max_length=100)
    credit_rating: Optional[str] = Field(None, pattern="^(AAA|AA|A|BBB|BB|B|CCC|CC|C|D)[\+\-]?$")
    description: Optional[str] = Field(None, max_length=2000)
    website: Optional[str] = Field(None, max_length=500)
    
    @field_validator('website')
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        """Validate website URL format"""
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('Website must start with http:// or https://')
        return v


class BorrowerCreate(BorrowerBase):
    pass


class BorrowerResponse(BorrowerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LoanBase(BaseModel):
    loan_number: str = Field(..., min_length=5, max_length=50, pattern="^[A-Z0-9\-]+$")
    borrower_id: int = Field(..., gt=0)
    loan_type: Optional[str] = Field(None, max_length=100)
    amount: float = Field(..., gt=0, description="Loan amount must be positive")
    currency: str = Field(default="USD", min_length=3, max_length=3, pattern="^[A-Z]{3}$")
    interest_rate: Optional[float] = Field(None, ge=0, le=100, description="Interest rate as percentage (0-100)")
    base_margin: Optional[float] = Field(None, ge=-10, le=50, description="Margin in percentage points")
    current_margin: Optional[float] = Field(None, ge=-10, le=50)
    maturity_date: Optional[datetime] = None
    status: str = Field(default="active", pattern="^(active|pending|completed|defaulted|restructured)$")
    sustainability_linked: bool = True
    
    @model_validator(mode='after')
    def validate_dates(self):
        """Ensure maturity date is in the future"""
        if self.maturity_date and self.maturity_date < datetime.now():
            raise ValueError('Maturity date must be in the future')
        return self
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: float) -> float:
        """Validate loan amount is reasonable"""
        if v > 10_000_000_000:  # 10 billion max
            raise ValueError('Loan amount exceeds maximum allowed value')
        return v


class LoanCreate(LoanBase):
    pass


class LoanUpdate(BaseModel):
    """Schema for updating loans - all fields optional"""
    loan_number: Optional[str] = Field(None, min_length=5, max_length=50, pattern="^[A-Z0-9\-]+$")
    borrower_id: Optional[int] = Field(None, gt=0)
    loan_type: Optional[str] = Field(None, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3, pattern="^[A-Z]{3}$")
    interest_rate: Optional[float] = Field(None, ge=0, le=100)
    base_margin: Optional[float] = Field(None, ge=-10, le=50)
    current_margin: Optional[float] = Field(None, ge=-10, le=50)
    maturity_date: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(active|pending|completed|defaulted|restructured)$")
    sustainability_linked: Optional[bool] = None


class LoanResponse(LoanBase):
    id: int
    borrower: Optional['BorrowerResponse'] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ESGKpiBase(BaseModel):
    loan_id: int = Field(..., gt=0)
    kpi_name: str = Field(..., min_length=3, max_length=200)
    kpi_category: Optional[str] = Field(None, pattern="^(environmental|social|governance)$")
    target_value: float
    current_value: Optional[float] = None
    unit: str = Field(..., min_length=1, max_length=50)
    baseline_value: Optional[float] = None
    target_date: Optional[datetime] = None
    measurement_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|quarterly|annually)$")
    status: str = Field(default="on_track", pattern="^(on_track|at_risk|breached)$")
    
    @model_validator(mode='after')
    def validate_values(self):
        """Validate KPI value relationships"""
        if self.baseline_value is not None and self.target_value is not None:
            if self.baseline_value == self.target_value:
                raise ValueError('Target value must be different from baseline value')
        if self.current_value is not None and self.baseline_value is not None:
            # Allow reasonable range
            if abs(self.current_value - self.baseline_value) > abs(self.baseline_value * 10):
                raise ValueError('Current value appears unrealistic compared to baseline')
        return self


class ESGKpiCreate(ESGKpiBase):
    pass


class ESGMeasurementBase(BaseModel):
    kpi_id: int
    measured_value: float
    verified_value: Optional[float] = None
    measurement_date: datetime
    data_source: Optional[str] = None
    verification_status: str = "pending"
    discrepancy_percentage: Optional[float] = None
    notes: Optional[str] = None


class ESGMeasurementCreate(ESGMeasurementBase):
    pass


class ESGMeasurementResponse(ESGMeasurementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ESGKpiResponse(ESGKpiBase):
    id: int
    measurements: Optional[List[ESGMeasurementResponse]] = []
    created_at: datetime

    class Config:
        from_attributes = True


class CovenantBase(BaseModel):
    loan_id: int
    covenant_type: str
    description: Optional[str] = None
    threshold: Optional[float] = None
    current_value: Optional[float] = None
    status: str = "compliant"
    next_test_date: Optional[datetime] = None
    frequency: Optional[str] = None
    breach_consequence: Optional[str] = None
    margin_adjustment: Optional[float] = None


class CovenantCreate(CovenantBase):
    pass


class CovenantResponse(CovenantBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class VerificationBase(BaseModel):
    loan_id: int
    verification_type: str
    verification_date: datetime
    status: str = "completed"
    confidence_score: Optional[float] = None
    data_sources: Optional[Union[dict, list, Any]] = None
    findings: Optional[Union[dict, Any]] = None
    risk_level: Optional[str] = None
    recommendations: Optional[str] = None


class VerificationCreate(VerificationBase):
    pass


class VerificationResponse(VerificationBase):
    id: int
    loan: Optional['LoanResponse'] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    loan_id: int
    report_type: str
    report_period_start: Optional[datetime] = None
    report_period_end: Optional[datetime] = None
    generated_date: Optional[datetime] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    status: str = "generated"
    report_metadata: Optional[dict] = None


class ReportCreate(BaseModel):
    loan_id: int
    report_type: str
    report_period_start: str
    report_period_end: str


class ReportResponse(ReportBase):
    id: int
    loan: Optional['LoanResponse'] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DataSourceBase(BaseModel):
    name: str
    provider: Optional[str] = None
    category: Optional[str] = None
    api_endpoint: Optional[str] = None
    authentication_type: Optional[str] = None
    is_active: bool = True
    cost_per_request: Optional[float] = None
    reliability_score: Optional[float] = None
    description: Optional[str] = None


class DataSourceCreate(DataSourceBase):
    pass


class DataSourceResponse(DataSourceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_loans: int
    total_loan_value: float
    active_verifications: int
    compliance_rate: float
    at_risk_loans: int
    average_esg_score: float


class LoanPerformance(BaseModel):
    loan_id: int
    loan_number: str
    borrower_name: str
    esg_score: float
    compliance_status: str
    risk_level: str
    next_reporting_date: Optional[datetime] = None


class ESGTrend(BaseModel):
    date: datetime
    value: float
    kpi_name: str
    status: str
