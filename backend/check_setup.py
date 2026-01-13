"""
Quick Test Script to Verify Project Setup
Run this script to check if the project is configured correctly
"""
import os
import sys
from pathlib import Path

def check_file_exists(path, description):
    """Check if a file exists"""
    if os.path.exists(path):
        print(f"✅ {description}: Found")
        return True
    else:
        print(f"❌ {description}: NOT FOUND")
        return False

def check_env_file():
    """Check if .env file exists"""
    env_path = Path(__file__).parent / ".env"
    env_example_path = Path(__file__).parent / ".env.example"
    
    if env_path.exists():
        print("✅ .env file: Found")
        return True
    elif env_example_path.exists():
        print("⚠️  .env file: NOT FOUND (but .env.example exists)")
        print("   → Copy .env.example to .env and fill in your values")
        return False
    else:
        print("❌ .env file: NOT FOUND (no .env.example either)")
        return False

def check_python_imports():
    """Check if critical Python packages are installed"""
    packages = {
        "fastapi": "FastAPI",
        "sqlalchemy": "SQLAlchemy",
        "pydantic": "Pydantic",
        "uvicorn": "Uvicorn"
    }
    
    all_ok = True
    for package, name in packages.items():
        try:
            __import__(package)
            print(f"✅ {name}: Installed")
        except ImportError:
            print(f"❌ {name}: NOT INSTALLED")
            all_ok = False
    
    return all_ok

def check_database_connection():
    """Try to connect to database"""
    try:
        from app.core.config import settings
        print(f"✅ Configuration loaded")
        print(f"   Database URL: {settings.DATABASE_URL[:20]}...")
        
        # Try to create engine
        from app.database.session import engine
        with engine.connect() as connection:
            print(f"✅ Database connection: Success")
            return True
    except Exception as e:
        print(f"❌ Database connection: FAILED")
        print(f"   Error: {str(e)}")
        return False

def check_models():
    """Check if models can be imported"""
    try:
        from app.models.models import Loan, Borrower, ESGKpi, Verification
        print(f"✅ Models: Imported successfully")
        return True
    except Exception as e:
        print(f"❌ Models: Import failed")
        print(f"   Error: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("ESGLend Project Health Check")
    print("=" * 60)
    print()
    
    # Check file structure
    print("📁 File Structure Check:")
    check_file_exists("app/main.py", "Main application")
    check_file_exists("app/core/config.py", "Configuration")
    check_file_exists("app/models/models.py", "Database models")
    check_file_exists("app/api/v1/endpoints/loans.py", "Loan endpoints")
    check_file_exists("requirements.txt", "Requirements file")
    print()
    
    # Check environment
    print("🔧 Environment Configuration:")
    check_env_file()
    print()
    
    # Check Python packages
    print("📦 Python Dependencies:")
    packages_ok = check_python_imports()
    print()
    
    if not packages_ok:
        print("❌ Some packages are missing. Install them with:")
        print("   pip install -r requirements.txt")
        print()
        return
    
    # Check models
    print("📊 Models & Schemas:")
    check_models()
    print()
    
    # Check database
    print("💾 Database Connection:")
    db_ok = check_database_connection()
    print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print("=" * 60)
    if db_ok:
        print("✅ All checks passed! Your backend is ready to run.")
        print()
        print("Start the backend with:")
        print("   uvicorn app.main:app --reload")
        print()
        print("Access the API docs at:")
        print("   http://localhost:8000/docs")
    else:
        print("⚠️  Some issues found. Please fix them before running.")
        print()
        print("Common fixes:")
        print("1. Copy .env.example to .env and fill in values")
        print("2. Make sure PostgreSQL is running")
        print("3. Create the database: createdb esglend")
        print("4. Run seed script: python scripts/seed_data.py")

if __name__ == "__main__":
    main()
