"""Test login functionality directly"""
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User
from app.core.security import verify_password, create_access_token
from datetime import timedelta

# Connect to database
DATABASE_URL = "sqlite:///./esglend.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Get user
    user = db.query(User).filter(User.email == "demo@esglend.com").first()
    if not user:
        print("❌ User not found!")
        sys.exit(1)
    
    print(f"✓ User found: {user.email}")
    print(f"  Full name: {user.full_name}")
    print(f"  Role: {user.role}")
    print(f"  Hash: {user.hashed_password[:20]}...")
    
    # Test password verification
    password = "demo123"
    try:
        result = verify_password(password, user.hashed_password)
        print(f"\n✓ Password verification: {result}")
        
        if not result:
            print("❌ Password does not match!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Password verification error: {e}")
        sys.exit(1)
    
    # Test token creation
    try:
        access_token = create_access_token(
            data={"sub": user.email}, 
            expires_delta=timedelta(minutes=30)
        )
        print(f"\n✓ Token created: {access_token[:50]}...")
        print("\n✅ All tests passed! Login should work.")
    except Exception as e:
        print(f"❌ Token creation error: {e}")
        sys.exit(1)
        
finally:
    db.close()
