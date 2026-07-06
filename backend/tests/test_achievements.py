import uuid

import pytest
from fastapi.testclient import TestClient
from supabase import create_client

from app.config import settings
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers() -> dict[str, str]:
    admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
    anon = create_client(settings.supabase_url, settings.supabase_anon_key)

    email = f"{uuid.uuid4()}@example.com"
    password = "correct horse battery staple"
    admin.auth.admin.create_user(
        {"email": email, "password": password, "email_confirm": True}
    )
    result = anon.auth.sign_in_with_password({"email": email, "password": password})
    return {"Authorization": f"Bearer {result.session.access_token}"}


def test_achievement_links_and_unlinks_skills(auth_headers: dict[str, str]) -> None:
    role = client.post(
        "/roles",
        json={"company": "Initech", "title": "Developer", "start_date": "2019-01-01"},
        headers=auth_headers,
    ).json()

    skill_a = client.post(
        "/skills", json={"name": "Python"}, headers=auth_headers
    ).json()
    skill_b = client.post(
        "/skills", json={"name": "Terraform"}, headers=auth_headers
    ).json()

    achievement = client.post(
        "/achievements",
        json={
            "role_id": role["id"],
            "title": "Migrated infra to Terraform",
            "description": "Rewrote provisioning scripts as Terraform modules.",
            "metrics": [
                {
                    "value": 40,
                    "unit": "%",
                    "label": "reduced provisioning time",
                    "confidence": "approximate",
                }
            ],
            "skill_ids": [skill_a["id"], skill_b["id"]],
        },
        headers=auth_headers,
    )
    assert achievement.status_code == 201
    body = achievement.json()
    assert set(body["skill_ids"]) == {skill_a["id"], skill_b["id"]}
    assert body["metrics"][0]["confidence"] == "approximate"

    # Drop one linked skill via PATCH.
    updated = client.patch(
        f"/achievements/{body['id']}",
        json={"skill_ids": [skill_a["id"]]},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["skill_ids"] == [skill_a["id"]]

    fetched = client.get(f"/achievements/{body['id']}", headers=auth_headers)
    assert fetched.json()["skill_ids"] == [skill_a["id"]]
