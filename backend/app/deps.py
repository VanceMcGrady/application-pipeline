from fastapi import Depends, Header, HTTPException, status
from supabase import Client, create_client

from .config import settings


def get_bearer_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.removeprefix("Bearer ")


def get_user_supabase_client(token: str = Depends(get_bearer_token)) -> Client:
    """Supabase client scoped to the caller's JWT.

    Every query made through this client is subject to Postgres RLS via
    auth.uid() — never use the service-role client for user-scoped data.
    """
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(token)
    return client


def get_service_supabase_client() -> Client:
    """Service-role client that bypasses RLS.

    Reserved for genuinely unscoped operations (e.g. writing to the shared
    postings table) — never for per-user reads/writes.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
