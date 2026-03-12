from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

logger = structlog.get_logger(__name__)

_bearer_scheme = HTTPBearer(auto_error=True)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Parameters
    ----------
    data:
        Payload claims to embed in the token.
    expires_delta:
        Optional custom expiry window; defaults to ``JWT_EXPIRE_MINUTES``.

    Returns
    -------
    str
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(tz=timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_token(token: str) -> dict[str, Any]:
    """Verify a JWT and return its decoded payload.

    Raises
    ------
    HTTPException
        HTTP 401 if the token is missing, expired, or has an invalid signature.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("sub") is None:
            raise credentials_exception
        return payload
    except JWTError as exc:
        logger.warning("jwt_verification_failed", error=str(exc))
        raise credentials_exception from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> dict[str, Any]:
    """FastAPI dependency – extract and verify the Bearer token.

    Returns the decoded JWT payload so downstream handlers can inspect
    ``sub``, ``email``, ``roles``, etc.
    """
    return verify_token(credentials.credentials)


def require_role(role: str):
    """Return a FastAPI dependency that enforces a minimum role.

    Parameters
    ----------
    role:
        The ERPNext role name that must appear in the token's ``roles`` list.
    """

    async def _check(
        user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        if role not in user.get("roles", []):
            logger.warning(
                "authorization_denied",
                required_role=role,
                user_roles=user.get("roles"),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _check
