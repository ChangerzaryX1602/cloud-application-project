# ERPNext Integration Setup

This directory contains configuration and documentation for the ERPNext integration into the KKU Cloud Application Project.

## Architecture

ERPNext is deployed as a set of Docker services:
- `erpnext-frontend` - Main web interface (port 8000)
- `erpnext-backend` - Background job worker
- `erpnext-scheduler` - Scheduled tasks
- `erpnext-socketio` - WebSocket server (port 9000)
- `erpnext-redis` - Redis for queue, cache, and socketio

All services are defined in `../overrides/compose.erpnext.yaml`.

## Database

ERPNext uses the existing PostgreSQL service with a dedicated `erpnext` database. The database is initialized on first startup using `../configs/erpnext-init.sql`.

## Accessing ERPNext

- **Web Interface**: https://erpnext.mysterchat.com
- **Default Admin**: `admin` / `ChangeMe123!` (change this immediately after first login!)

## Environment Variables

Edit `.env` to customize settings:

```bash
DB_PASSWORD=ChangeMe123!     # PostgreSQL password
ADMIN_PASSWORD=ChangeMe123!  # ERPNext admin password
```

## Starting ERPNext

```bash
# From project root
docker compose -f docker-compose.yml -f overrides/compose.erpnext.yaml up -d
```

## Verifying Setup

Use the verification script:
```bash
./scripts/verify-erpnext.sh
```

Or manually check:

1. **Check database:**
   ```bash
   docker exec -it cloud-project-postgres psql -U postgres -c "\l"
   # Should show 'erpnext' database
   ```

2. **Check containers:**
   ```bash
   docker ps | grep erpnext
   ```

3. **Access ERPNext:**
   Navigate to `https://erpnext.mysterchat.com` - should show Frappe setup wizard

## Platform & DevOps Integration

The FastAPI service in `platform-devops/fastapi` is configured to connect to ERPNext at `http://erpnext-frontend:8000`.

### Required Setup Steps

1. **Complete ERPNext setup wizard** at `https://erpnext.mysterchat.com`

2. **Create OAuth2 Client** in ERPNext:
   - Navigate to: Integration > New Integration
   - Select: OAuth2
   - Name: `platform_devops`
   - Redirect URL: `https://platform.mysterchat.com/callback`
   - Copy Client ID and Client Secret to `.env`:
     ```
     ERPNEXT_CLIENT_ID=platform_devops
     ERPNEXT_CLIENT_SECRET=<from ERPNext>
     ```

3. **Create Service User** for server-to-server calls:
   - Create a new user with System Manager role
   - Generate API Key and API Secret
   - Copy to `.env`:
     ```
     ERPNEXT_API_KEY=<from ERPNext>
     ERPNEXT_API_SECRET=<from ERPNext>
     ```

4. **Configure Webhooks** (for user sync):
   - Navigate to: DocType > Webhook
   - Create webhook for:
     - `User` events (create, update, delete)
     - `Role` events
     - URL: `https://platform.mysterchat.com/api/webhooks/erpnext`
   - Set WEBHOOK_SECRET in `.env`

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it cloud-project-postgres psql -U erpnext -d erpnext
```

### ERPNext Container Not Starting

```bash
# Check logs
docker logs erpnext-frontend
docker logs erpnext-backend

# Verify Redis is running
docker logs erpnext-redis
```

### Setup Wizard Not Appearing

The setup wizard should appear on first access. If not:

```bash
# Recreate the ERPNext containers
docker compose -f docker-compose.yml -f overrides/compose.erpnext.yaml down erpnext-frontend erpnext-backend erpnext-scheduler erpnext-socketio

# Remove the site data (WARNING: deletes all ERPNext data!)
rm -rf ./data/erpnext/sites/*

# Restart
docker compose -f docker-compose.yml -f overrides/compose.erpnext.yaml up -d erpnext-frontend erpnext-backend erpnext-scheduler erpnext-socketio
```

## Data Persistence

All ERPNext data is stored in `../data/erpnext/`:
- `sites/` - Site data and database migrations
- `logs/` - Application logs
- `redis/` - Redis persistence
- `assets/` - Compiled assets

Backup this directory regularly.

## References

- [frappe_docker](https://github.com/frappe/frappe_docker)
- [ERPNext Documentation](https://docs.erpnext.com)
- [Frappe Framework](https://frappeframework.com)
