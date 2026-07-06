from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..deps import get_current_user_id, get_user_supabase_client
from ..schemas import RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleOut])
def list_roles(client: Client = Depends(get_user_supabase_client)) -> list[dict]:
    response = (
        client.table("roles").select("*").order("start_date", desc=True).execute()
    )
    return response.data


@router.post("", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(
    role: RoleCreate,
    client: Client = Depends(get_user_supabase_client),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    payload = role.model_dump(mode="json") | {"user_id": user_id}
    response = client.table("roles").insert(payload).execute()
    return response.data[0]


@router.get("/{role_id}", response_model=RoleOut)
def get_role(role_id: UUID, client: Client = Depends(get_user_supabase_client)) -> dict:
    response = client.table("roles").select("*").eq("id", str(role_id)).execute()
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    return response.data[0]


@router.patch("/{role_id}", response_model=RoleOut)
def update_role(
    role_id: UUID,
    role: RoleUpdate,
    client: Client = Depends(get_user_supabase_client),
) -> dict:
    payload = role.model_dump(mode="json", exclude_unset=True)
    if not payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    response = client.table("roles").update(payload).eq("id", str(role_id)).execute()
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    return response.data[0]


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_id: UUID, client: Client = Depends(get_user_supabase_client)) -> None:
    client.table("roles").delete().eq("id", str(role_id)).execute()
