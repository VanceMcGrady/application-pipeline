from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client

from ..config import settings
from ..deps import get_bearer_token

router = APIRouter()


@router.get("/me")
def read_current_user(token: str = Depends(get_bearer_token)) -> dict[str, str | None]:
    """Proves the auth wiring end to end: given a caller's JWT, ask Supabase who they are."""
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    try:
        response = client.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session") from exc

    user = response.user
    return {"id": user.id, "email": user.email}
