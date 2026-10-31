import sys
from pathlib import Path

from sqlalchemy import create_engine

sys.path.insert(0, str(Path(__file__).parent.parent))

import server


def test_registered_user_can_log_in_against_database(tmp_path, monkeypatch):
    test_engine = create_engine(f"sqlite:///{tmp_path / 'auth.db'}")
    server.metadata.create_all(test_engine)
    monkeypatch.setattr(server, "_engine", test_engine)

    client = server.app.test_client()
    registration = client.post(
        "/api/register",
        json={"name": "Test User", "email": "test@example.com", "password": "secure-test-password"},
    )
    login = client.post(
        "/api/login",
        json={"email": "test@example.com", "password": "secure-test-password"},
    )

    assert registration.status_code == 201
    assert login.status_code == 200
    assert login.get_json()["email"] == "test@example.com"

    test_engine.dispose()
