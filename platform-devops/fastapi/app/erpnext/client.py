from __future__ import annotations

import json
import urllib.parse
from typing import Any

import httpx
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

_DEFAULT_USER_FIELDS = [
    "name",
    "email",
    "full_name",
    "enabled",
    "last_login",
    "last_ip",
    "roles",
]


class ERPNextClient:
    """Async HTTP client that proxies requests to the ERPNext REST API."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def get_client(self) -> httpx.AsyncClient:
        """Return (or lazily create) the shared async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.ERPNEXT_URL,
                timeout=30.0,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_auth_headers(self) -> dict[str, str]:
        """Build the Authorization header when API key/secret are configured."""
        if settings.ERPNEXT_API_KEY and settings.ERPNEXT_API_SECRET:
            return {
                "Authorization": (
                    f"token {settings.ERPNEXT_API_KEY}:{settings.ERPNEXT_API_SECRET}"
                )
            }
        return {}

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: Any = None,
        data: dict[str, str] | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        client = await self.get_client()
        headers: dict[str, str] = {**self._get_auth_headers()}
        if extra_headers:
            headers.update(extra_headers)

        response = await client.request(
            method,
            path,
            params=params,
            json=json_body,
            data=data,
            headers=headers,
        )

        log = logger.bind(
            method=method,
            path=path,
            status_code=response.status_code,
        )

        if response.is_error:
            log.warning("erpnext_request_error", body=response.text[:500])
            response.raise_for_status()
        else:
            log.debug("erpnext_request_ok")

        return response

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    async def exchange_oauth_code(
        self,
        code: str,
        redirect_uri: str,
        code_verifier: str,
    ) -> dict[str, Any]:
        """Exchange an authorization code for tokens via ERPNext OAuth2."""
        response = await self._request(
            "POST",
            "/api/method/frappe.integrations.oauth2.get_token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.ERPNEXT_CLIENT_ID,
                "client_secret": settings.ERPNEXT_CLIENT_SECRET,
                "code_verifier": code_verifier,
            },
        )
        return response.json()

    async def revoke_token(self, token: str) -> bool:
        """Revoke an OAuth2 token in ERPNext."""
        try:
            await self._request(
                "POST",
                "/api/method/frappe.integrations.oauth2.revoke_token",
                data={"token": token},
            )
            return True
        except httpx.HTTPStatusError:
            return False

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    async def list_users(
        self,
        filters: dict[str, Any] | None = None,
        fields: list[str] | None = None,
        limit: int = 20,
        start: int = 0,
    ) -> dict[str, Any]:
        """List ERPNext User documents."""
        selected_fields = fields or _DEFAULT_USER_FIELDS
        params: dict[str, Any] = {
            "fields": json.dumps(selected_fields),
            "limit_page_length": limit,
            "limit_start": start,
        }
        if filters:
            params["filters"] = json.dumps(filters)

        response = await self._request("GET", "/api/resource/User", params=params)
        return response.json()

    async def get_user(self, email: str) -> dict[str, Any]:
        """Fetch a single ERPNext User document."""
        encoded = urllib.parse.quote(email, safe="")
        response = await self._request("GET", f"/api/resource/User/{encoded}")
        return response.json()

    async def create_user(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new ERPNext User document."""
        response = await self._request("POST", "/api/resource/User", json_body=data)
        return response.json()

    async def update_user(self, email: str, data: dict[str, Any]) -> dict[str, Any]:
        """Update an ERPNext User document."""
        encoded = urllib.parse.quote(email, safe="")
        response = await self._request(
            "PUT", f"/api/resource/User/{encoded}", json_body=data
        )
        return response.json()

    async def delete_user(self, email: str) -> bool:
        """Hard-delete an ERPNext User document (prefer soft-disable via update_user)."""
        encoded = urllib.parse.quote(email, safe="")
        try:
            await self._request("DELETE", f"/api/resource/User/{encoded}")
            return True
        except httpx.HTTPStatusError:
            return False

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    async def list_roles(self) -> dict[str, Any]:
        """List all ERPNext Role documents."""
        response = await self._request(
            "GET",
            "/api/resource/Role",
            params={"limit_page_length": 200},
        )
        return response.json()

    async def list_role_profiles(self) -> dict[str, Any]:
        """List all ERPNext Role Profile documents."""
        response = await self._request(
            "GET",
            "/api/resource/Role Profile",
            params={"limit_page_length": 200},
        )
        return response.json()

    async def create_role_profile(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new ERPNext Role Profile document."""
        response = await self._request(
            "POST", "/api/resource/Role Profile", json_body=data
        )
        return response.json()

    async def update_role_profile(
        self, name: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Update an existing ERPNext Role Profile document."""
        encoded = urllib.parse.quote(name, safe="")
        response = await self._request(
            "PUT", f"/api/resource/Role Profile/{encoded}", json_body=data
        )
        return response.json()

    # ------------------------------------------------------------------
    # Audit / Activity Log
    # ------------------------------------------------------------------

    async def list_activity_logs(
        self,
        filters: dict[str, Any] | None = None,
        limit: int = 50,
        start: int = 0,
    ) -> dict[str, Any]:
        """List ERPNext Activity Log documents."""
        params: dict[str, Any] = {
            "limit_page_length": limit,
            "limit_start": start,
            "order_by": "creation desc",
        }
        if filters:
            params["filters"] = json.dumps(filters)

        response = await self._request(
            "GET", "/api/resource/Activity Log", params=params
        )
        return response.json()


# Module-level singleton
erpnext_client = ERPNextClient()
