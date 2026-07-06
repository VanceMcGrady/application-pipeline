from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..deps import get_current_user_id, get_user_supabase_client
from ..schemas import EducationCreate, EducationOut, EducationUpdate

router = APIRouter(prefix="/education", tags=["education"])


@router.get("", response_model=list[EducationOut])
def list_education(client: Client = Depends(get_user_supabase_client)) -> list[dict]:
    response = client.table("education").select("*").order("institution").execute()
    return response.data


@router.post("", response_model=EducationOut, status_code=status.HTTP_201_CREATED)
def create_education(
    education: EducationCreate,
    client: Client = Depends(get_user_supabase_client),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    payload = education.model_dump(mode="json") | {"user_id": user_id}
    response = client.table("education").insert(payload).execute()
    return response.data[0]


@router.get("/{education_id}", response_model=EducationOut)
def get_education(
    education_id: UUID, client: Client = Depends(get_user_supabase_client)
) -> dict:
    response = (
        client.table("education").select("*").eq("id", str(education_id)).execute()
    )
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Education entry not found")
    return response.data[0]


@router.patch("/{education_id}", response_model=EducationOut)
def update_education(
    education_id: UUID,
    education: EducationUpdate,
    client: Client = Depends(get_user_supabase_client),
) -> dict:
    payload = education.model_dump(mode="json", exclude_unset=True)
    if not payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    response = (
        client.table("education")
        .update(payload)
        .eq("id", str(education_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Education entry not found")
    return response.data[0]


@router.delete("/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    education_id: UUID, client: Client = Depends(get_user_supabase_client)
) -> None:
    client.table("education").delete().eq("id", str(education_id)).execute()
