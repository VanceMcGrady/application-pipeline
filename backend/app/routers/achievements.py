from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..deps import get_current_user_id, get_user_supabase_client
from ..schemas import AchievementCreate, AchievementOut, AchievementUpdate

router = APIRouter(prefix="/achievements", tags=["achievements"])


def _load_skill_ids(client: Client, achievement_id: str) -> list[str]:
    response = (
        client.table("achievement_skills")
        .select("skill_id")
        .eq("achievement_id", achievement_id)
        .execute()
    )
    return [row["skill_id"] for row in response.data]


def _attach_skill_ids(achievement: dict, client: Client) -> dict:
    achievement["skill_ids"] = _load_skill_ids(client, achievement["id"])
    return achievement


@router.get("", response_model=list[AchievementOut])
def list_achievements(client: Client = Depends(get_user_supabase_client)) -> list[dict]:
    response = (
        client.table("achievements")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return [_attach_skill_ids(a, client) for a in response.data]


@router.post("", response_model=AchievementOut, status_code=status.HTTP_201_CREATED)
def create_achievement(
    achievement: AchievementCreate,
    client: Client = Depends(get_user_supabase_client),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    data = achievement.model_dump(mode="json", exclude={"skill_ids"})
    data["user_id"] = user_id
    response = client.table("achievements").insert(data).execute()
    created = response.data[0]

    if achievement.skill_ids:
        links = [
            {
                "user_id": user_id,
                "achievement_id": created["id"],
                "skill_id": str(skill_id),
            }
            for skill_id in achievement.skill_ids
        ]
        client.table("achievement_skills").insert(links).execute()

    return _attach_skill_ids(created, client)


@router.get("/{achievement_id}", response_model=AchievementOut)
def get_achievement(
    achievement_id: UUID, client: Client = Depends(get_user_supabase_client)
) -> dict:
    response = (
        client.table("achievements").select("*").eq("id", str(achievement_id)).execute()
    )
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Achievement not found")
    return _attach_skill_ids(response.data[0], client)


@router.patch("/{achievement_id}", response_model=AchievementOut)
def update_achievement(
    achievement_id: UUID,
    achievement: AchievementUpdate,
    client: Client = Depends(get_user_supabase_client),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    payload = achievement.model_dump(
        mode="json", exclude_unset=True, exclude={"skill_ids"}
    )
    if payload:
        response = (
            client.table("achievements")
            .update(payload)
            .eq("id", str(achievement_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Achievement not found")

    if achievement.skill_ids is not None:
        client.table("achievement_skills").delete().eq(
            "achievement_id", str(achievement_id)
        ).execute()
        if achievement.skill_ids:
            links = [
                {
                    "user_id": user_id,
                    "achievement_id": str(achievement_id),
                    "skill_id": str(skill_id),
                }
                for skill_id in achievement.skill_ids
            ]
            client.table("achievement_skills").insert(links).execute()

    return get_achievement(achievement_id, client)


@router.delete("/{achievement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_achievement(
    achievement_id: UUID, client: Client = Depends(get_user_supabase_client)
) -> None:
    client.table("achievements").delete().eq("id", str(achievement_id)).execute()
