import sys
sys.path.insert(0, 'C:\\Users\\prajw\\OneDrive\\Desktop\\lma\\backend')

from app.database.session import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash

db = SessionLocal()

# Delete existing admin user
existing = db.query(User).filter(User.email == "admin@esglend.com").first()
if existing:
    db.delete(existing)
    db.commit()
    print("Deleted existing admin user")

# Create fresh admin user
admin = User(
    email="admin@esglend.com",
    hashed_password=get_password_hash("Admin123!"),
    full_name="Admin User",
    organization="ESGLend",
    role="admin",
    is_active=True,
    is_superuser=True
)
db.add(admin)
db.commit()
print("✅ Admin SUPERUSER created successfully!")
print("Email: admin@esglend.com")
print("Password: Admin123!")
print("Role: admin (SUPERUSER)")

db.close()
