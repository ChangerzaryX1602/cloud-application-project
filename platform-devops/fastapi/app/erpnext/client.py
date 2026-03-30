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

    async def list_user_roles(self, user_names: list[str]) -> dict[str, list[str]]:
        """Return a mapping of {email: [role, ...]} for the given users."""
        if not user_names:
            return {}
        params: dict[str, Any] = {
            "fields": json.dumps(["parent", "role"]),
            "filters": json.dumps([["Has Role", "parent", "in", user_names]]),
            "limit_page_length": 500,
        }
        response = await self._request("GET", "/api/resource/Has Role", params=params)
        rows: list[dict[str, Any]] = response.json().get("data", [])
        result: dict[str, list[str]] = {}
        for row in rows:
            parent = row.get("parent", "")
            role = row.get("role", "")
            if parent and role:
                result.setdefault(parent, []).append(role)
        return result

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
    # Permissions (DocPerm)
    # ------------------------------------------------------------------

    async def list_permissions(
        self,
        doctype: str | None = None,
        role: str | None = None,
        limit: int = 50,
        start: int = 0,
    ) -> dict[str, Any]:
        """List ERPNext DocPerm records."""
        params: dict[str, Any] = {
            "fields": json.dumps([
                "name", "parent", "role", "permlevel",
                "read", "write", "create", "delete",
                "submit", "cancel", "amend",
            ]),
            "limit_page_length": limit,
            "limit_start": start,
            "order_by": "parent asc, role asc",
        }
        filters: list[list[str]] = []
        if doctype:
            filters.append(["DocPerm", "parent", "=", doctype])
        if role:
            filters.append(["DocPerm", "role", "=", role])
        if filters:
            params["filters"] = json.dumps(filters)
        response = await self._request("GET", "/api/resource/DocPerm", params=params)
        return response.json()

    async def create_permission(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new DocPerm record."""
        response = await self._request("POST", "/api/resource/DocPerm", json_body=data)
        return response.json()

    async def update_permission(self, name: str, data: dict[str, Any]) -> dict[str, Any]:
        """Update a DocPerm record."""
        encoded = urllib.parse.quote(name, safe="")
        response = await self._request(
            "PUT", f"/api/resource/DocPerm/{encoded}", json_body=data
        )
        return response.json()

    async def delete_permission(self, name: str) -> None:
        """Delete a DocPerm record."""
        encoded = urllib.parse.quote(name, safe="")
        await self._request("DELETE", f"/api/resource/DocPerm/{encoded}")

    async def log_permission_change(
        self,
        action: str,
        perm_name: str,
        doctype_name: str,
        role: str,
        user: str,
    ) -> None:
        """Write an Activity Log entry for a permission change."""
        subject = f"Permission {action}: DocType '{doctype_name}', Role '{role}'"
        try:
            await self._request(
                "POST",
                "/api/resource/Activity Log",
                json_body={
                    "doctype": "Activity Log",
                    "subject": subject,
                    "reference_doctype": "DocPerm",
                    "reference_name": perm_name,
                    "user": user,
                    "operation": action,
                },
            )
        except Exception:
            logger.warning("permission_audit_log_failed", perm_name=perm_name)

    async def list_permission_logs(
        self,
        doctype: str | None = None,
        user: str | None = None,
        limit: int = 50,
        start: int = 0,
    ) -> dict[str, Any]:
        """List Activity Log entries related to DocPerm changes."""
        filters: list[list[str]] = [
            ["Activity Log", "reference_doctype", "=", "DocPerm"],
        ]
        if user:
            filters.append(["Activity Log", "user", "=", user])
        if doctype:
            filters.append(["Activity Log", "subject", "like", f"%'{doctype}'%"])
        params: dict[str, Any] = {
            "fields": json.dumps([
                "name", "user", "subject", "reference_doctype",
                "reference_name", "creation", "operation",
            ]),
            "filters": json.dumps(filters),
            "limit_page_length": limit,
            "limit_start": start,
            "order_by": "creation desc",
        }
        response = await self._request(
            "GET", "/api/resource/Activity Log", params=params
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
            "fields": json.dumps([
                "name", "user", "subject", "operation", "creation",
            ]),
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


    async def list_activity_log_types(self) -> list[str]:
        """Return distinct subject (operation) values from Activity Log."""
        params: dict[str, Any] = {
            "fields": json.dumps(["subject"]),
            "distinct": "true",
            "limit_page_length": 500,
        }
        response = await self._request(
            "GET", "/api/resource/Activity Log", params=params
        )
        rows: list[dict[str, Any]] = response.json().get("data", [])
        seen: set[str] = set()
        result: list[str] = []
        for row in rows:
            val = row.get("subject", "").strip()
            if val and val not in seen:
                seen.add(val)
                result.append(val)
        return sorted(result)


# Module-level singleton
erpnext_client = ERPNextClient()
