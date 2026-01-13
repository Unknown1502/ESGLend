"""
Database Reset Script - Recreates database with updated schema
Run this after stopping the backend server
"""
import sys
import os
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.base import Base
from app.database.session import engine
from app.models.models import (
    User, Borrower, Loan, ESGKpi, Covenant, 
    Verification, DataSource, SFDRReport, CollaborationWorkflow
)

def reset_database():
    """Drop all tables and recreate with new schema"""
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables with updated schema...")
    Base.metadata.create_all(bind=engine)
    
    print("✓ Database reset complete!")
    print("\nNew columns added to Loan model:")
    print("  - esg_performance_score")
    print("  - pricing_tier")
    print("  - margin_adjustment")
    print("  - last_pricing_update")
    print("  - risk_score")
    print("  - risk_category")
    print("\nNew tables created:")
    print("  - sfdr_reports")
    print("  - collaboration_workflows")
    print("\nNext step: Run the seed script to add demo data")
    print("  python scripts/seed_data.py")

if __name__ == "__main__":
    reset_database()
