# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KKU Cloud Application Project — a multi-service SSO and observability platform. Components:
- **Zitadel + login-ui**: Custom SSO login interface
- **Platform & DevOps**: ERPNext-backed admin console with FastAPI gateway
- Orchestration via Docker Compose with Traefik, PostgreSQL, Jenkins, Prometheus, and Grafana

## Commands

### login-ui (Next.js)

```bash
cd login-ui
npm run dev       # Development server
npm run build     # Production build
npm start         # Run production build
npm run lint      # ESLint
```

### Platform & DevOps (FastAPI + Next.js)

```bash
cd platform-devops/fastapi
pip install -r requirements.txt    # Install Python deps
uvicorn app.main:app --reload     # Dev server (port 8000)
pytest                           # Run tests (if added)

cd platform-devops/nextjs
npm run dev                       # Next.js dev server (port 3000)
npm run build                      # Production build
npm start                         # Run production build
npm run lint                      # ESLint
```

### Infrastructure

```bash
docker compose up -d                                    # Start all services
docker compose down                                     # Stop all services
docker build -t kku-login-ui:latest ./login-ui           # Build login UI image
docker compose -f docker-compose.yml \
  -f overrides/compose.platform-devops.yaml up -d       # Start with Platform & DevOps
```

## Architecture

### Services (docker-compose.yml)

| Service | Role |
|---------|------|
| Traefik | Reverse proxy, TLS termination, Let's Encrypt ACME |
| PostgreSQL | Database for Zitadel and ERPNext |
| Zitadel | Identity & Access Management (IAM/OIDC) |
| login-ui | Custom Next.js login interface at `sso.mysterchat.com` |
| platform-fastapi | API gateway at `platform.mysterchat.com/api` |
| platform-nextjs | Admin console at `platform.mysterchat.com` |
| Jenkins | CI/CD at `ci.mysterchat.com` |
| Prometheus + Grafana | Monitoring at `monitoring.mysterchat.com` |

### Platform & DevOps Architecture

**Design principle**: ERPNext is the system of record. FastAPI never stores users/roles — it proxies to ERPNext REST API and enforces security policies. Next.js is a thin admin UI.

**Authentication flow**:
1. User opens Next.js console → redirects to ERPNext OAuth2
2. ERPNext authenticates → returns auth code
3. Next.js sends code to FastAPI
4. FastAPI exchanges code with ERPNext → gets JWT with email/roles
5. FastAPI issues its own signed JWT with enriched claims
6. Next.js stores JWT in httpOnly cookie, passes on all API calls

**FastAPI services** (`platform-devops/fastapi/`):
- `app/main.py` — Entry point with CORS, rate limiting, Prometheus /metrics
- `app/auth/` — OAuth2 PKCE flow, JWT sign/verify
- `app/users/` — User CRUD (proxied to ERPNext)
- `app/roles/` — Role and Role Profile management
- `app/audit/` — Activity Log queries from ERPNext
- `app/webhooks/` — Inbound ERPNext webhook events (HMAC verified)
- `app/erpnext/client.py` — Async httpx client wrapping ERPNext REST API

**Next.js admin UI** (`platform-devops/nextjs/`):
- `app/(auth)/` — Login (OAuth2 redirect) + Callback (token exchange)
- `app/(console)/layout.tsx` — Sidebar navigation + top bar with logout
- Pages: Dashboard, Users (list/detail/create), Roles (profiles), Audit Logs, Settings
- `lib/api.ts` — Typed fetch client to FastAPI
- `hooks/useAuth.ts` — Cookie token reading with JWT expiry check

**Docker Compose override**: `overrides/compose.platform-devops.yaml` defines `platform-fastapi` and `platform-nextjs` services with Traefik labels for routing.

All services share the `traefik` external Docker network.

### login-ui Architecture

**Next.js App Router** with basePath `/ui/v2/login` and standalone output.

**Authentication flow across pages:**
1. `/loginname` — user lookup
2. `/password` — password verification
3. `/passkey` or `/otp` — 2FA (WebAuthn or TOTP)
4. `/signedin` — success

**API Routes** (`src/app/api/`): Each route proxies to Zitadel's API using a service account token.
- `loginname/` — search user
- `password/` — verify password, determine 2FA method
- `register/` — create user
- `passkey/challenge/` and `passkey/verify/` — WebAuthn
- `totp/` — TOTP verification

**Key library files:**
- `src/lib/zitadel.ts` — Zitadel API client (all IAM calls)
- `src/lib/auth.ts` — service token management (reads from env var or file)
- `src/lib/config.ts` — configuration utilities

**Middleware** (`src/middleware.ts`): Rewrites OAuth/OIDC requests from the login path to the Zitadel backend.

## Environment Variables

### login-ui
See `login-ui/.env.example`:

```
ZITADEL_API_URL=https://zitadel:8080
ZITADEL_SERVICE_USER_TOKEN=           # or use file:
ZITADEL_SERVICE_USER_TOKEN_FILE=/app/pat/login-client.pat
NEXT_PUBLIC_BASE_PATH=/ui/v2/login
NEXT_PUBLIC_APPLICATION_NAME=KKU Cloud Application Project SSO
DEBUG=false
```

### Platform & DevOps
See `platform-devops/.env.example`:

```
ERPNEXT_URL=http://frontend:8080              # ERPNext instance URL
ERPNEXT_CLIENT_ID=platform_devops              # OAuth2 client ID
ERPNEXT_CLIENT_SECRET=change_me_client_secret  # OAuth2 client secret
ERPNEXT_API_KEY=                            # Service user API key (for server-to-server calls)
ERPNEXT_API_SECRET=                           # Service user API secret
JWT_SECRET=change_me_jwt_secret_min_32_chars   # FastAPI JWT signing key
REDIS_URL=redis://redis-cache:6379             # Redis for rate limiting
WEBHOOK_SECRET=                               # HMAC secret for webhook verification
ALLOWED_ORIGINS=https://platform.mysterchat.com
```

Generate secrets with: `openssl rand -hex 32`

## Key Conventions

### login-ui
- TypeScript strict mode enabled (`tsconfig.json`)
- Tailwind CSS with KKU brand colors — primary red `#B91C1C`
- UI is in Thai language
- Session state is passed between pages via URL params or cookies (managed by Zitadel session tokens)

### Platform & DevOps
- **No direct database access** — All user/role data flows through ERPNext REST API
- **Soft delete** — `DELETE /users/{email}` sets `enabled=0` (preserves audit trail)
- **HMAC webhooks** — Signature verification skipped when `WEBHOOK_SECRET` is empty (dev-friendly)
- **Role-based access** — System Manager role required for create/update operations
- **PKCE OAuth2** — Code verifier stored in `sessionStorage` (client-side only)
