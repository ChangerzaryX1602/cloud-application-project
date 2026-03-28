from __future__ import annotations

import urllib.parse
from typing import Any

import structlog
from jose import jwt

from app.config import settings
from app.erpnext.client import erpnext_client

logger = structlog.get_logger(__name__)


def get_authorization_url(
    redirect_uri: str,
    state: str,
    code_challenge: str,
) -> str:
    """Build the ERPNext OAuth2 PKCE authorization URL.

    Parameters
    ----------
    redirect_uri:
        The URI to which ERPNext will redirect after authorization.
    state:
        Opaque value used to maintain state between the request and callback.
    code_challenge:
        PKCE code challenge (S256) derived from the code verifier.

    Returns
    -------
    str
        Full authorization URL to redirect the user to.
    """
    params = urllib.parse.urlencode(
        {
            "response_type": "code",
            "client_id": settings.ERPNEXT_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
    )
    base = (settings.ERPNEXT_PUBLIC_URL or settings.ERPNEXT_URL).rstrip("/")
    return f"{base}/api/method/frappe.integrations.oauth2.authorize?{params}"


async def exchange_code_for_token(
    code: str,
    redirect_uri: str,
    code_verifier: str,
) -> dict[str, Any]:
    """Exchange an authorization code for an OAuth2 token response.

    Parameters
    ----------
    code:
        The authorization code received from ERPNext.
    redirect_uri:
        Must match the redirect URI used during authorization.
    code_verifier:
        The original PKCE code verifier (pre-hash).

    Returns
    -------
    dict
        Token response from ERPNext (access_token, id_token, etc.).
    """
    logger.info("oauth2_code_exchange", redirect_uri=redirect_uri)
    return await erpnext_client.exchange_oauth_code(
        code=code,
        redirect_uri=redirect_uri,
        code_verifier=code_verifier,
    )


def parse_id_token(id_token: str) -> dict[str, Any]:
    """Decode an ERPNext id_token JWT without signature verification.

    ERPNext is the signing authority; we only need to read the claims.
    The token is validated end-to-end by ERPNext before issuance.

    Parameters
    ----------
    id_token:
        Raw JWT string from the ERPNext token response.

    Returns
    -------
    dict
        Decoded claims including ``sub``, ``email``, ``roles``, etc.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            id_token,
            options={
                "verify_signature": False,
                "verify_exp": False,
                "verify_aud": False,
            },
            algorithms=["RS256", "HS256"],
        )
        return payload
    except Exception as exc:  # noqa: BLE001
        logger.warning("id_token_parse_failed", error=str(exc))
        # Fallback: attempt manual base64 decode of the payload segment
        import base64
        import json

        try:
            parts = id_token.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
                return json.loads(base64.urlsafe_b64decode(padded))
        except Exception:  # noqa: BLE001
            pass
        return {}
