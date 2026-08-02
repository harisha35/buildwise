import os

os.environ["BUILDWISE_ENVIRONMENT"] = "testing"
os.environ.setdefault(
    "BUILDWISE_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/buildwise_test",
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.enums import UserRole
from app.models.user import User

settings = get_settings()
engine = create_engine(settings.database_url, future=True)
TestSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db() -> Session:
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = TestSessionLocal(bind=connection, join_transaction_mode="create_savepoint")

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture
def app(db):
    application = create_app()
    application.dependency_overrides[get_db] = lambda: db
    return application


@pytest.fixture
def client(app):
    return TestClient(app)


def make_user(db: Session, role: UserRole, email: str, password: str = "password123") -> User:
    user = User(name=email.split("@")[0], email=email, password_hash=hash_password(password), role=role)
    db.add(user)
    db.flush()
    return user


def auth_headers(client: TestClient, email: str, password: str = "password123") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
