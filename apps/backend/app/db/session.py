from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

if settings.DATABASE_URL:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
else:
    engine = create_engine("sqlite:///:memory:")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Add it to apps/backend/.env or system environment.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()