# Platform & DevOps Module

A complete admin console for user and role management, backed by ERPNext as the system of record.

## Quick Start

1. **Configure environment variables:**
   ```bash
   cd platform-devops
   cp .env.example .env
   # Edit .env with your ERPNext credentials and secrets
   ```

2. **Generate secrets:**
   ```bash
   openssl rand -hex 32  # Use for JWT_SECRET and WEBHOOK_SECRET
   ```

3. **Start services:**
   ```bash
   docker compose -f docker-compose.yml -f overrides/compose.platform-devops.yaml up -d
   ```

4. **Access the console:** `https://platform.mysterchat.com`

## Setup in ERPNext

### 1. Register OAuth2 Client
Navigate to `ERPNext → OAuth Client` and create:
- Client ID: `platform_devops`
- Grant Type: `Authorization Code`
- Redirect URI: `https://platform.mysterchat.com/callback`
- Scope: `openid all`
- Copy Client Secret to `ERPNEXT_CLIENT_SECRET` env var

### 2. Create Service User (for API key auth)
- Create a user in ERPNext with `System Manager` role
- Generate API Key/Secret from user profile
- Set `ERPNEXT_API_KEY` and `ERPNEXT_API_SECRET` env vars

### 3. Register Webhooks
In `ERPNext → Webhook`, create three entries:
| DocType | Event | Request URL |
|----------|--------|-------------|
| User | after_insert | `https://platform.mysterchat.com/api/webhooks/receive` |
| User | on_update | `https://platform.mysterchat.com/api/webhooks/receive` |
| User | on_trash | `https://platform.mysterchat.com/api/webhooks/receive` |

Set Webhook Secret to match `WEBHOOK_SECRET` env var for HMAC verification.

## Architecture

```
┌─────────────┐      OAuth2 PKCE       ┌─────────────┐
│   Next.js   │ ────────────────────────▶│   ERPNext   │
│   Console   │◀── JWT + Roles ─────────│   (IAM)     │
└─────────────┘                        └─────────────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌─────────────┐                          ┌─────────────┐
│  FastAPI    │◀───────── Webhook ───│  Webhook    │
│  Gateway    │                          │  Events     │
└─────────────┘                          └─────────────┘
```

## API Documentation

FastAPI docs available at `/docs` (dev mode only).

## Monitoring

- Prometheus metrics: `https://platform.mysterchat.com/api/metrics`
- Health check: `https://platform.mysterchat.com/api/health`
