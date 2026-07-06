from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..deps import get_current_user_id, get_user_supabase_client
from ..schemas import SkillCreate, SkillOut, SkillUpdate

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=list[SkillOut])
def list_skills(client: Client = Depends(get_user_supabase_client)) -> list[dict]:
    response = client.table("skills").select("*").order("name").execute()
    return response.data


@router.post("", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def create_skill(
    skill: SkillCreate,
    client: Client = Depends(get_user_supabase_client),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    payload = skill.model_dump(mode="json") | {"user_id": user_id}
    response = client.table("skills").insert(payload).execute()
    return response.data[0]


@router.get("/{skill_id}", response_model=SkillOut)
def get_skill(skill_id: UUID, client: Client = Depends(get_user_supabase_client)) -> dict:
    response = client.table("skills").select("*").eq("id", str(skill_id)).execute()
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skill not found")
    return response.data[0]


@router.patch("/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: UUID,
    skill: SkillUpdate,
    client: Client = Depends(get_user_supabase_client),
) -> dict:
    payload = skill.model_dump(mode="json", exclude_unset=True)
    if not payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    response = client.table("skills").update(payload).eq("id", str(skill_id)).execute()
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skill not found")
    return response.data[0]


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(skill_id: UUID, client: Client = Depends(get_user_supabase_client)) -> None:
    client.table("skills").delete().eq("id", str(skill_id)).execute()
