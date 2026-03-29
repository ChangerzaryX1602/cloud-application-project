from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.audit.router import router as audit_router
from app.auth.router import router as auth_router
from app.config import settings
from app.erpnext.client import erpnext_client
from app.middleware.rate_limit import limiter
from app.middleware.security import RequestIDMiddleware
from app.permissions.router import router as permissions_router
from app.roles.router import router as roles_router
from app.users.router import router as users_router
from app.webhooks.router import router as webhooks_router


# ---------------------------------------------------------------------------
# Structured logging setup
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    """Configure structlog for JSON output in production, pretty output in debug."""
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.DEBUG:
        renderer: structlog.types.Processor = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)


_configure_logging()
logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage startup / shutdown of shared resources."""
    logger.info(
        "platform_devops_api_starting",
        erpnext_url=settings.ERPNEXT_URL,
        debug=settings.DEBUG,
    )
    yield
    logger.info("platform_devops_api_shutting_down")
    await erpnext_client.close()


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Platform & DevOps API",
    description=(
        "Security gateway that proxies to ERPNext. "
        "ERPNext is the system of record for users and roles."
    ),
    version="1.0.0",
    root_path="/api",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# --- Rate limiter -----------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Middleware (order matters: first added = outermost) --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)

# --- Prometheus metrics -----------------------------------------------------
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    excluded_handlers=["/health", "/metrics"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# --- Routers ----------------------------------------------------------------
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(audit_router)
app.include_router(permissions_router)
app.include_router(webhooks_router)


# ---------------------------------------------------------------------------
# Built-in endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    tags=["health"],
    summary="Health check",
    include_in_schema=True,
)
async def health() -> dict[str, str]:
    """Liveness probe — returns 200 when the service is running."""
    return {"status": "ok"}
