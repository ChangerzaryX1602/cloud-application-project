from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.jwt import create_access_token, get_current_user, verify_token
from app.auth.oauth2 import exchange_code_for_token, get_authorization_url, parse_id_token
from app.config import settings
from app.erpnext.client import erpnext_client

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class TokenRequest(BaseModel):
    code: str
    redirect_uri: str
    code_verifier: str


class RefreshRequest(BaseModel):
    token: str


class LogoutRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Exchange OAuth2 authorization code for a FastAPI JWT",
)
async def get_token(body: TokenRequest) -> TokenResponse:
    """Exchange an ERPNext OAuth2 authorization code for a FastAPI JWT.

    Flow:
    1. Exchange the code with ERPNext to obtain an id_token.
    2. Parse the id_token to extract email and roles.
    3. Issue a new FastAPI-signed JWT containing those claims.
    """
    logger.info("auth_token_exchange", redirect_uri=body.redirect_uri)

    try:
        token_response = await exchange_code_for_token(
            code=body.code,
            redirect_uri=body.redirect_uri,
            code_verifier=body.code_verifier,
        )
    except Exception as exc:
        logger.error("oauth2_exchange_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token exchange with ERPNext failed",
        ) from exc

    id_token: str = token_response.get("id_token", "")
    claims: dict[str, Any] = {}

    if id_token:
        claims = parse_id_token(id_token)

    email: str = (
        claims.get("email")
        or claims.get("sub")
        or token_response.get("email", "")
    )
    roles: list[str] = claims.get("roles", [])

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not determine user identity from ERPNext token",
        )

    access_token = create_access_token(
        data={"sub": email, "email": email, "roles": roles}
    )
    logger.info("auth_token_issued", email=email)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh a FastAPI JWT",
)
async def refresh_token(body: RefreshRequest) -> TokenResponse:
    """Verify the current token and issue a fresh one with the same claims."""
    payload = verify_token(body.token)

    # Strip standard JWT claims that we will regenerate
    payload.pop("exp", None)
    payload.pop("iat", None)
    payload.pop("nbf", None)

    access_token = create_access_token(data=payload)
    logger.info("auth_token_refreshed", sub=payload.get("sub"))

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/logout",
    summary="Revoke token in ERPNext and log out",
)
async def logout(body: LogoutRequest) -> dict[str, str]:
    """Revoke the provided token in ERPNext."""
    await erpnext_client.revoke_token(body.token)
    logger.info("auth_logout")
    return {"message": "logged out"}


@router.get(
    "/authorize-url",
    summary="Build the ERPNext OAuth2 authorization URL",
)
async def authorize_url(
    redirect_uri: str = Query(..., description="OAuth2 redirect URI"),
    state: str = Query(..., description="CSRF / state token"),
    code_challenge: str = Query(..., description="PKCE S256 code challenge"),
) -> dict[str, str]:
    """Return the ERPNext OAuth2 PKCE authorization URL."""
    url = get_authorization_url(
        redirect_uri=redirect_uri,
        state=state,
        code_challenge=code_challenge,
    )
    return {"url": url}
