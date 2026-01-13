import sqlite3
import bcrypt

# Create demo user
conn = sqlite3.connect('esglend.db')
c = conn.cursor()

# Hash password
hashed = bcrypt.hashpw(b'demo123', bcrypt.gensalt()).decode('utf-8')

# Insert user
try:
    c.execute("""
        INSERT INTO users (email, hashed_password, full_name, organization, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    """, ('demo@esglend.com', hashed, 'Demo User', 'LMA Demo', 'admin', 1))
    
    conn.commit()
    print("✓ Demo user created successfully!")
    print("  Email: demo@esglend.com")
    print("  Password: demo123")
except sqlite3.IntegrityError:
    print("✓ Demo user already exists")
    print("  Email: demo@esglend.com")
    print("  Password: demo123")
finally:
    conn.close()
