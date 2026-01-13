import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from faker import Faker

from app.models.models import (
    User, Borrower, Loan, ESGKpi, ESGMeasurement, 
    Covenant, Verification, DataSource
)
from app.core.security import get_password_hash
from app.database.session import SessionLocal

fake = Faker()


def seed_data():
    db = SessionLocal()
    
    try:
        print("Seeding database with demo data...")
        
        print("Creating admin user...")
        admin_user = User(
            email="admin@esglend.com",
            hashed_password=get_password_hash("Admin123!"),
            full_name="Admin User",
            organization="ESGLend",
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        
        print("Creating data sources...")
        data_sources = [
            DataSource(
                name="Utility Bill API",
                provider="Global Energy Monitor",
                category="energy",
                api_endpoint="https://api.energymonitor.com/v1",
                authentication_type="api_key",
                is_active=True,
                cost_per_request=0.05,
                reliability_score=95.5,
                description="Real-time utility consumption data"
            ),
            DataSource(
                name="Satellite Imagery",
                provider="Planet Labs",
                category="environmental",
                api_endpoint="https://api.planet.com/v1",
                authentication_type="oauth2",
                is_active=True,
                cost_per_request=2.50,
                reliability_score=92.0,
                description="Daily satellite imagery for environmental monitoring"
            ),
            DataSource(
                name="Carbon Footprint Calculator",
                provider="ClimateWatch",
                category="emissions",
                api_endpoint="https://api.climatewatch.org/v1",
                authentication_type="api_key",
                is_active=True,
                cost_per_request=0.10,
                reliability_score=98.0,
                description="Comprehensive carbon emissions calculations"
            ),
            DataSource(
                name="ISO 14001 Certification DB",
                provider="International Standards Org",
                category="certification",
                api_endpoint="https://api.iso.org/certifications",
                authentication_type="basic",
                is_active=True,
                cost_per_request=0.20,
                reliability_score=99.5,
                description="Environmental management certification verification"
            ),
            DataSource(
                name="Water Usage Monitoring",
                provider="Aqua Analytics",
                category="water",
                api_endpoint="https://api.aquaanalytics.com/v2",
                authentication_type="api_key",
                is_active=True,
                cost_per_request=0.08,
                reliability_score=94.0,
                description="Industrial water consumption tracking"
            )
        ]
        db.add_all(data_sources)
        
        print("Creating borrowers...")
        borrowers = []
        industries = ["Manufacturing", "Energy", "Technology", "Retail", "Healthcare"]
        countries = ["United Kingdom", "Germany", "France", "Netherlands", "Sweden"]
        ratings = ["A", "A-", "BBB+", "BBB", "BBB-"]
        
        for i in range(10):
            borrower = Borrower(
                name=f"{fake.company()} {fake.company_suffix()}",
                industry=random.choice(industries),
                country=random.choice(countries),
                credit_rating=random.choice(ratings),
                description=f"Leading {random.choice(industries).lower()} company committed to sustainability",
                website=f"https://www.{fake.domain_name()}"
            )
            borrowers.append(borrower)
            db.add(borrower)
        
        db.commit()
        
        print("Creating loans...")
        loan_types = ["Term Loan", "Revolving Credit", "Sustainability-Linked Loan", "Green Loan"]
        
        for borrower in borrowers:
            num_loans = random.randint(1, 3)
            for _ in range(num_loans):
                amount = random.randint(10, 500) * 1000000
                base_margin = random.uniform(1.5, 4.5)
                
                loan = Loan(
                    loan_number=f"LN-{fake.random_int(min=100000, max=999999)}",
                    borrower_id=borrower.id,
                    loan_type=random.choice(loan_types),
                    amount=amount,
                    currency="USD",
                    interest_rate=random.uniform(3.0, 6.5),
                    base_margin=base_margin,
                    current_margin=base_margin,
                    maturity_date=datetime.utcnow() + timedelta(days=random.randint(365, 2555)),
                    status="active",
                    sustainability_linked=True
                )
                db.add(loan)
                db.commit()
                
                print(f"Creating ESG KPIs for loan {loan.loan_number}...")
                esg_kpis = [
                    {
                        "kpi_name": "Carbon Emissions Reduction",
                        "kpi_category": "environmental",
                        "target_value": 30.0,
                        "baseline_value": 100.0,
                        "unit": "percentage",
                        "measurement_frequency": "quarterly"
                    },
                    {
                        "kpi_name": "Renewable Energy Usage",
                        "kpi_category": "environmental",
                        "target_value": 50.0,
                        "baseline_value": 15.0,
                        "unit": "percentage",
                        "measurement_frequency": "monthly"
                    },
                    {
                        "kpi_name": "Water Consumption Reduction",
                        "kpi_category": "environmental",
                        "target_value": 20.0,
                        "baseline_value": 100.0,
                        "unit": "percentage",
                        "measurement_frequency": "quarterly"
                    },
                    {
                        "kpi_name": "Employee Safety Score",
                        "kpi_category": "social",
                        "target_value": 95.0,
                        "baseline_value": 85.0,
                        "unit": "score",
                        "measurement_frequency": "quarterly"
                    },
                    {
                        "kpi_name": "Waste Recycling Rate",
                        "kpi_category": "environmental",
                        "target_value": 75.0,
                        "baseline_value": 45.0,
                        "unit": "percentage",
                        "measurement_frequency": "monthly"
                    }
                ]
                
                for kpi_data in random.sample(esg_kpis, random.randint(3, 5)):
                    current_value = kpi_data["baseline_value"] + random.uniform(
                        0, 
                        (kpi_data["target_value"] - kpi_data["baseline_value"]) * 0.8
                    )
                    
                    kpi = ESGKpi(
                        loan_id=loan.id,
                        kpi_name=kpi_data["kpi_name"],
                        kpi_category=kpi_data["kpi_category"],
                        target_value=kpi_data["target_value"],
                        current_value=current_value,
                        unit=kpi_data["unit"],
                        baseline_value=kpi_data["baseline_value"],
                        target_date=loan.maturity_date,
                        measurement_frequency=kpi_data["measurement_frequency"],
                        status="on_track" if current_value >= kpi_data["baseline_value"] else "at_risk"
                    )
                    db.add(kpi)
                    db.commit()
                    
                    for month in range(6):
                        measurement_date = datetime.utcnow() - timedelta(days=30 * (5 - month))
                        measured_value = kpi_data["baseline_value"] + (
                            (current_value - kpi_data["baseline_value"]) / 6 * month
                        )
                        verified_value = measured_value + random.uniform(-2, 2)
                        
                        measurement = ESGMeasurement(
                            kpi_id=kpi.id,
                            measured_value=measured_value,
                            verified_value=verified_value,
                            measurement_date=measurement_date,
                            data_source=random.choice([ds.name for ds in data_sources[:3]]),
                            verification_status="verified",
                            discrepancy_percentage=(verified_value - measured_value) / measured_value * 100 if measured_value > 0 else 0,
                            notes="Automated verification completed successfully"
                        )
                        db.add(measurement)
                
                print(f"Creating covenants for loan {loan.loan_number}...")
                covenant = Covenant(
                    loan_id=loan.id,
                    covenant_type="ESG Performance Covenant",
                    description="Borrower must achieve minimum 70% of ESG KPI targets",
                    threshold=70.0,
                    current_value=random.uniform(65, 95),
                    status=random.choice(["compliant", "compliant", "at_risk"]),
                    next_test_date=datetime.utcnow() + timedelta(days=random.randint(15, 90)),
                    frequency="quarterly",
                    breach_consequence="Margin increase of 0.25%",
                    margin_adjustment=0.25
                )
                db.add(covenant)
                
                print(f"Creating verification for loan {loan.loan_number}...")
                verification = Verification(
                    loan_id=loan.id,
                    verification_type="automated_esg_verification",
                    verification_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    status="completed",
                    confidence_score=random.uniform(85, 98),
                    data_sources={
                        "sources": [
                            {"name": ds.name, "status": "verified", "confidence": random.randint(85, 98)}
                            for ds in random.sample(data_sources, 3)
                        ]
                    },
                    findings={
                        "verified_kpis": random.randint(3, 5),
                        "discrepancies_found": random.randint(0, 2),
                        "average_accuracy": random.uniform(92, 98)
                    },
                    risk_level=random.choice(["low", "low", "medium"]),
                    recommendations="All ESG metrics verified successfully. Continue current reporting practices."
                )
                db.add(verification)
        
        db.commit()
        print("Database seeded successfully with demo data!")
        
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
