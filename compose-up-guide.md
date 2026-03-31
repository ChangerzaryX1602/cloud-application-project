# Docker Compose Start Guide

## Step 1: Prerequisites — Create the Docker network

```bash
docker network create traefik
```

---

## Step 2: Set up environment variables

```bash
cp platform-devops/.env.example platform-devops/.env
```

Generate secrets:

```bash
openssl rand -hex 32  # use output as JWT_SECRET
openssl rand -hex 32  # use output as WEBHOOK_SECRET
```

Edit `platform-devops/.env` — fill in what you know now (leave API key/secret blank for now):

```env
ERPNEXT_URL=http://erpnext-frontend:8080
ERPNEXT_CLIENT_ID=platform_devops
ERPNEXT_CLIENT_SECRET=change_me_client_secret
ERPNEXT_API_KEY=           # fill in after Step 6
ERPNEXT_API_SECRET=        # fill in after Step 6
JWT_SECRET=<generated>
REDIS_URL=redis://erpnext-redis:6379
WEBHOOK_SECRET=<generated>
ALLOWED_ORIGINS=https://platform.mysterchat.com
```

---

## Step 3: Prepare ERPNext data directories *(first-time only)*

Create directories and set ownership to UID 1000 (frappe user inside container):

```bash
mkdir -p data/erpnext/{sites,logs,redis}
sudo chown -R 1000:1000 data/erpnext/
```

> **Note:** `apps.txt` and `common_site_config.json` are created automatically
> by the `erpnext-configurator` service on startup. No manual setup needed.

---

## Step 4: Start core infrastructure + ERPNext

```bash
# Core services (Traefik, Postgres, Zitadel, Jenkins, Prometheus, Grafana)
docker compose up -d

# ERPNext services (configurator runs once, then nginx+gunicorn start)
docker compose -f overrides/compose.erpnext.yaml up -d
```

Wait for `erpnext-configurator` to complete and `erpnext-frontend` to be running:

```bash
docker compose -f overrides/compose.erpnext.yaml ps
```

> - `erpnext-configurator` should show **`exited (0)`** — that is correct and expected
> - `erpnext-frontend` (nginx) should show **`running`**

---

## Step 5: Initialize ERPNext site *(first-time only)*

> **Notes:**
> - Use single quotes around the `-c` argument to avoid bash `!` expansion errors
> - Run against `erpnext-backend` (gunicorn), **not** `erpnext-frontend` (nginx)

```bash
docker exec -it erpnext-backend bash -c 'bench new-site erpnext.mysterchat.com \
  --db-type postgres \
  --db-host postgres \
  --db-port 5432 \
  --db-root-username postgres \
  --db-root-password ChangeMe123! \
  --db-name erpnext \
  --db-user erpnext \
  --db-password ChangeMe123! \
  --admin-password ChangeMe123! \
  --install-app erpnext'
```

This takes 3–5 minutes. If the site already exists, add `--force` to re-run.
If prompted `rollback? [y/N]` due to a Redis error, type `y` then re-run
(the configurator should have already set the Redis config correctly).

Restart all ERPNext services after site creation:

```bash
docker compose -f overrides/compose.erpnext.yaml restart
```

If the admin password needs to be reset:

```bash
docker exec erpnext-backend bash -c 'bench --site erpnext.mysterchat.com set-admin-password ChangeMe123!'
```

---

## Step 6: Get ERPNext API Key & Secret

1. Open `https://erpnext.mysterchat.com`

   > **If DNS is not configured**, add all service domains to `/etc/hosts` first (one-time setup):
   > ```bash
   > echo "127.0.0.1 sso.mysterchat.com erpnext.mysterchat.com platform.mysterchat.com ci.mysterchat.com monitoring.mysterchat.com" | sudo tee -a /etc/hosts
   > ```
   > Verify with:
   > ```bash
   > grep mysterchat.com /etc/hosts
   > ```

2. Log in with:

   | Field    | Value               |
   |----------|---------------------|
   | Email    | `admin@example.com` (**not** `admin`) |
   | Password | `ChangeMe123!`      |

3. Go to: **top-right menu → My Profile → API Access** section
4. Click **Generate Keys** — copy the API Key and API Secret immediately *(shown once)*

**Alternatively via bench CLI (no browser needed):**

```bash
docker exec erpnext-backend bash -c "bench --site erpnext.mysterchat.com execute frappe.core.doctype.user.user.generate_keys --args '[\"Administrator\"]'"
```

Prints the key/secret to stdout.

---

## Step 7: Update `.env` with API credentials

Edit `platform-devops/.env`:

```env
ERPNEXT_API_KEY=<key from step 6>
ERPNEXT_API_SECRET=<secret from step 6>
```

---

## Step 7b: Create the OAuth2 client in ERPNext

The Platform console uses ERPNext OAuth2 for login. You must register it as a client before the login flow will work.

1. Go to `https://erpnext.mysterchat.com` and log in as Administrator
2. In the top search bar, type **OAuth Client** and open it (or navigate to `/app/oauth-client`)
3. Click **New** and fill in:

   | Field | Value |
   |-------|-------|
   | App Name | `Platform DevOps` |
   | Client ID | *(auto-generated — copy this)* |
   | Client Secret | *(auto-generated — copy this)* |
   | Redirect URIs | `https://platform.mysterchat.com/callback` |
   | Default Redirect URI | `https://platform.mysterchat.com/callback` |
   | Grant Type | `Authorization Code` |
   | Response Type | `Code` |
   | Skip Authorization | ✓ checked |

4. Click **Save** — ERPNext generates the Client ID and Secret
5. Copy both values into `platform-devops/.env`:

```env
ERPNEXT_CLIENT_ID=<generated client id>
ERPNEXT_CLIENT_SECRET=<generated client secret>
```

6. Restart FastAPI to pick up the new credentials (no rebuild needed):

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  up -d platform-fastapi
```

---

## Step 8: Start Platform & DevOps services

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  up -d
```

---

## Step 9: Verify everything is running

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  ps
```

Expected healthy services:

| Service | URL |
|---|---|
| Traefik dashboard | http://localhost:8080 |
| Zitadel SSO | https://sso.mysterchat.com |
| ERPNext | https://erpnext.mysterchat.com |
| Platform console | https://platform.mysterchat.com |
| Platform API | https://platform.mysterchat.com/api/health |
| Jenkins | https://ci.mysterchat.com |
| Grafana | https://monitoring.mysterchat.com |
| erpnext-configurator | `exited (0)` — normal |

---

## Quick re-start *(subsequent runs)*

Once set up, just run:

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  up -d
```

> `erpnext-configurator` will re-run and exit (0) automatically — this is normal.

---

## Full clean restart *(stop everything and re-run)*

### Stop and remove all containers (keep data volumes)

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  down
```

### Fix permissions on ERPNext data (if configurator fails)

```bash
sudo chown -R 1000:1000 data/erpnext/
chmod -R 755 data/erpnext/sites/
chmod -R 755 data/erpnext/logs/
```

### Re-start all services

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  up -d
```

Skip Steps 3 and 5 — the site data is preserved in `data/erpnext/`.

### To also wipe data and start completely fresh *(destructive)*

```bash
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  down -v

sudo rm -rf data/erpnext/ data/postgres/
```

Then follow the guide from **Step 3** again.

TESTTTTT
