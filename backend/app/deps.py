import jwt
from fastapi import Depends, Header, HTTPException, status
from supabase import Client, create_client

from .config import settings


def get_bearer_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.removeprefix("Bearer ")


def get_current_user_id(token: str = Depends(get_bearer_token)) -> str:
    """Reads the `sub` claim for use in insert payloads.

    This is not the security check — it's just so we have a user_id to
    write. Postgres independently re-verifies the JWT's signature and
    enforces `user_id = auth.uid()` via RLS, so a forged value here would
    simply be rejected by the insert policy, not trusted.
    """
    payload = jwt.decode(token, options={"verify_signature": False})
    return payload["sub"]


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
