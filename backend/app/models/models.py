from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    organization = Column(String)
    role = Column(String, default="viewer")
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Borrower(Base):
    __tablename__ = "borrowers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String)
    country = Column(String)
    credit_rating = Column(String)
    description = Column(Text)
    website = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    loans = relationship("Loan", back_populates="borrower")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String, unique=True, index=True, nullable=False)
    borrower_id = Column(Integer, ForeignKey("borrowers.id"))
    loan_type = Column(String)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    interest_rate = Column(Float)
    base_margin = Column(Float)
    current_margin = Column(Float)
    maturity_date = Column(DateTime)
    status = Column(String, default="active")
    sustainability_linked = Column(Boolean, default=True)
    esg_performance_score = Column(Float)
    pricing_tier = Column(String)
    margin_adjustment = Column(Float, default=0.0)
    last_pricing_update = Column(DateTime)
    risk_score = Column(Float)
    risk_category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    borrower = relationship("Borrower", back_populates="loans")
    esg_kpis = relationship("ESGKpi", back_populates="loan")
    covenants = relationship("Covenant", back_populates="loan")
    verifications = relationship("Verification", back_populates="loan")
    pricing_history = relationship("PricingHistory", back_populates="loan")
    risk_assessments = relationship("RiskAssessment", back_populates="loan")


class ESGKpi(Base):
    __tablename__ = "esg_kpis"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    kpi_name = Column(String, nullable=False)
    kpi_category = Column(String)
    target_value = Column(Float)
    current_value = Column(Float)
    unit = Column(String)
    baseline_value = Column(Float)
    target_date = Column(DateTime)
    measurement_frequency = Column(String)
    status = Column(String, default="on_track")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    loan = relationship("Loan", back_populates="esg_kpis")
    measurements = relationship("ESGMeasurement", back_populates="kpi")


class ESGMeasurement(Base):
    __tablename__ = "esg_measurements"

    id = Column(Integer, primary_key=True, index=True)
    kpi_id = Column(Integer, ForeignKey("esg_kpis.id"))
    measured_value = Column(Float, nullable=False)
    verified_value = Column(Float)
    measurement_date = Column(DateTime, nullable=False)
    data_source = Column(String)
    verification_status = Column(String, default="pending")
    discrepancy_percentage = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    kpi = relationship("ESGKpi", back_populates="measurements")


class Covenant(Base):
    __tablename__ = "covenants"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    covenant_type = Column(String, nullable=False)
    description = Column(Text)
    threshold = Column(Float)
    current_value = Column(Float)
    status = Column(String, default="compliant")
    next_test_date = Column(DateTime)
    frequency = Column(String)
    breach_consequence = Column(Text)
    margin_adjustment = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    loan = relationship("Loan", back_populates="covenants")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    verification_type = Column(String, nullable=False)
    verification_date = Column(DateTime, nullable=False)
    status = Column(String, default="completed")
    confidence_score = Column(Float)
    data_sources = Column(JSON)
    findings = Column(JSON)
    risk_level = Column(String)
    recommendations = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    loan = relationship("Loan", back_populates="verifications")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    provider = Column(String)
    category = Column(String)
    api_endpoint = Column(String)
    authentication_type = Column(String)
    is_active = Column(Boolean, default=True)
    cost_per_request = Column(Float)
    reliability_score = Column(Float)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    report_type = Column(String, nullable=False)
    report_period_start = Column(DateTime)
    report_period_end = Column(DateTime)
    generated_date = Column(DateTime, server_default=func.now())
    status = Column(String, default="completed")
    report_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PricingHistory(Base):
    __tablename__ = "pricing_history"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    effective_date = Column(DateTime, nullable=False)
    base_rate = Column(Float, nullable=False)
    margin = Column(Float, nullable=False)
    total_rate = Column(Float, nullable=False)
    esg_performance_score = Column(Float)
    adjustment_reason = Column(String)
    adjustment_amount = Column(Float)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    loan = relationship("Loan", back_populates="pricing_history")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    assessment_date = Column(DateTime, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String)
    covenant_breach_probability = Column(Float)
    esg_risk_score = Column(Float)
    financial_risk_score = Column(Float)
    predicted_breach_date = Column(DateTime)
    confidence_level = Column(Float)
    risk_factors = Column(JSON)
    recommendations = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    loan = relationship("Loan", back_populates="risk_assessments")


class CollaborationWorkflow(Base):
    __tablename__ = "collaboration_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    workflow_type = Column(String, nullable=False)
    status = Column(String, default="pending")
    initiated_by = Column(Integer, ForeignKey("users.id"))
    current_approver = Column(Integer, ForeignKey("users.id"))
    approval_chain = Column(JSON)
    documents = Column(JSON)
    comments = Column(JSON)
    due_date = Column(DateTime)
    completed_date = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SFDRReport(Base):
    __tablename__ = "sfdr_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    report_period = Column(String, nullable=False)
    sfdr_classification = Column(String)
    principal_adverse_impacts = Column(JSON)
    sustainable_investment_percentage = Column(Float)
    taxonomy_alignment = Column(JSON)
    do_no_significant_harm_assessment = Column(JSON)
    social_safeguards = Column(JSON)
    generated_date = Column(DateTime, server_default=func.now())
    status = Column(String, default="draft")
    report_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    file_path = Column(String)
    file_url = Column(String)
    status = Column(String, default="generated")
    report_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    loan = relationship("Loan", backref="reports")
