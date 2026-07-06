import uuid

import pytest
from fastapi.testclient import TestClient
from supabase import create_client

from app.config import settings
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def two_users() -> list[dict[str, str]]:
    """Creates two confirmed users against the local Supabase stack and
    signs each in, returning a real access token per user.
    """
    admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
    anon = create_client(settings.supabase_url, settings.supabase_anon_key)

    users = []
    for _ in range(2):
        email = f"{uuid.uuid4()}@example.com"
        password = "correct horse battery staple"
        admin.auth.admin.create_user(
            {"email": email, "password": password, "email_confirm": True}
        )
        result = anon.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
        users.append({"email": email, "token": result.session.access_token})
        anon.auth.sign_out()

    return users


def test_user_cannot_see_another_users_role(two_users: list[dict[str, str]]) -> None:
    user_a, user_b = two_users
    headers_a = {"Authorization": f"Bearer {user_a['token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}

    created = client.post(
        "/roles",
        json={"company": "Acme Corp", "title": "Engineer", "start_date": "2020-01-01"},
        headers=headers_a,
    )
    assert created.status_code == 201
    role_id = created.json()["id"]

    a_roles = client.get("/roles", headers=headers_a).json()
    assert any(role["id"] == role_id for role in a_roles)

    b_roles = client.get("/roles", headers=headers_b).json()
    assert all(role["id"] != role_id for role in b_roles)

    # RLS filters the row out entirely for user B, so Postgres never
    # confirms the row exists — the endpoint reports 404, not 403.
    direct = client.get(f"/roles/{role_id}", headers=headers_b)
    assert direct.status_code == 404


def test_user_cannot_update_or_delete_another_users_role(
    two_users: list[dict[str, str]],
) -> None:
    user_a, user_b = two_users
    headers_a = {"Authorization": f"Bearer {user_a['token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}

    created = client.post(
        "/roles",
        json={"company": "Globex", "title": "Analyst", "start_date": "2021-06-01"},
        headers=headers_a,
    )
    role_id = created.json()["id"]

    update_attempt = client.patch(
        f"/roles/{role_id}", json={"title": "Hacked"}, headers=headers_b
    )
    assert update_attempt.status_code == 404

    delete_attempt = client.delete(f"/roles/{role_id}", headers=headers_b)
    assert delete_attempt.status_code == 204  # no-op: RLS means nothing matched

    still_there = client.get(f"/roles/{role_id}", headers=headers_a)
    assert still_there.status_code == 200
    assert still_there.json()["title"] == "Analyst"
