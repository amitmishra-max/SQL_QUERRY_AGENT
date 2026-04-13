#!/usr/bin/env python3
"""
Seed the e2e app database with test user.
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
from app.core.database import Base
from app.models.user import User
from app.models.query_history import QueryHistory

def seed_e2e():
    # Use the same DB URL as e2e-backend.sh, but sync
    db_url = os.getenv("APP_DATABASE_URL", "sqlite+aiosqlite:///./e2e_app.db")
    # Convert to sync if async
    if "+aiosqlite" in db_url:
        sync_url = db_url.replace("+aiosqlite", "")
    elif "+aiomysql" in db_url:
        sync_url = db_url.replace("+aiomysql", "+pymysql")
    else:
        sync_url = db_url
    
    engine = create_engine(sync_url, echo=False)
    
    # Create tables
    Base.metadata.create_all(engine)
    
    # Create session
    Session = sessionmaker(bind=engine)
    
    with Session() as session:
        # Check if user exists
        user = session.query(User).filter(User.email == "testuser@example.com").first()
        
        if not user:
            # Create test user
            hashed_password = get_password_hash("TestPass123")
            test_user = User(
                email="testuser@example.com",
                hashed_password=hashed_password,
                full_name="Test User",
                role="user"
            )
            session.add(test_user)
            session.commit()
            print("Created test user: testuser@example.com")
        else:
            print("Test user already exists")

if __name__ == "__main__":
    seed_e2e()