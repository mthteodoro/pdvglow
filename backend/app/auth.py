from typing import Annotated

import jwt
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings


security = HTTPBearer(auto_error=False)


def _decode_with_secret(token: str, secret: str) -> dict:
    return jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")


def _decode_with_jwks(token: str, jwks_url: str) -> dict:
    jwks_client = jwt.PyJWKClient(jwks_url)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256", "ES256"],
        audience="authenticated",
        options={"verify_exp": True},
    )


async def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    settings = get_settings()
    if not settings.auth_required:
        return {"sub": "local-dev", "app_metadata": {}}
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente")

    token = credentials.credentials
    try:
        if settings.supabase_jwks_url:
            return _decode_with_jwks(token, settings.supabase_jwks_url)
        if settings.supabase_jwt_secret:
            return _decode_with_secret(token, settings.supabase_jwt_secret)
    except (jwt.PyJWTError, requests.RequestException) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Configuração de autenticação incompleta — configure SUPABASE_JWKS_URL ou SUPABASE_JWT_SECRET")


def require_admin(user: Annotated[dict, Depends(require_user)]) -> dict:
    if user.get("app_metadata", {}).get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return user
