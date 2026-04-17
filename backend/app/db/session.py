from threading import Lock

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, future=True, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
_db_ready = False
_db_ready_lock = Lock()


def initialize_database() -> None:
    global _db_ready
    if _db_ready:
        return

    with _db_ready_lock:
        if _db_ready:
            return

        import app.models  # noqa: F401
        from app.services.data_seed import seed_demo_data

        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            if settings.seed_demo_data:
                seed_demo_data(db)
        _db_ready = True


def get_db():
    initialize_database()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
