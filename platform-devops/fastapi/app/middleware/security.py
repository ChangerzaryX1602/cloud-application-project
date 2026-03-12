from __future__ import annotations

import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware that propagates or generates an ``X-Request-ID`` header.

    If the incoming request already carries an ``X-Request-ID`` header its
    value is preserved and echoed back to the caller.  Otherwise a new UUID4
    is generated and attached to the response.

    This allows distributed tracing tools (and log correlation) to link all
    log entries for a single HTTP transaction via a shared identifier.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
