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
        return {"sub": "local-dev"}
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

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Configuração de auth incompleta")
