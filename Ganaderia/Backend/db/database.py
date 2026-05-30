from sqlalchemy import create_engine, text 
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.config import settings
DATABASE_URL = (
    f"postgresql://"
    f"{settings.DB_USER}:{settings.DB_PASSWORD}@"
    f"{settings.DB_HOST}:{settings.DB_PORT}/"
    f"{settings.DB_NAME}"
)

print(f"🔌 Conectando a: postgresql://{settings.DB_USER}:***@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def test_connection():
    """Prueba la conexión a la base de datos"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        print("✅ Conexión exitosa a PostgreSQL")
        db.close()
        return True
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False