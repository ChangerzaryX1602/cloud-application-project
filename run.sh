docker compose down
docker compose -f overrides/compose.erpnext.yaml down
docker network create traefik
cp platform-devops/.env.example platform-devops/.env
mkdir -p data/erpnext/{sites,logs,redis}
sudo chown -R 1000:1000 data/erpnext/
docker compose up -d
docker compose -f overrides/compose.erpnext.yaml up -d
docker compose -f overrides/compose.erpnext.yaml ps
sleep 60
docker exec -it erpnext-backend bash -c 'bench new-site erpnext.mysterchat.com \
  --force \
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
docker compose -f overrides/compose.erpnext.yaml restart
sleep 60
docker exec erpnext-backend bash -c 'bench --site erpnext.mysterchat.com set-admin-password ChangeMe123!'
# Generate API keys for Administrator and capture the secret
GENERATE_OUTPUT=$(docker exec erpnext-backend bash -c "bench --site erpnext.mysterchat.com execute frappe.core.doctype.user.user.generate_keys --args '[\"Administrator\"]'" 2>&1)
echo "generate_keys output: $GENERATE_OUTPUT"

# Extract both api_key and api_secret from the generate_keys output
ERPNEXT_API_KEY=$(echo "$GENERATE_OUTPUT" | sed -n 's/.*api_key["'"'"']: *["'"'"']\([^"'"'"']*\).*/\1/p')
ERPNEXT_API_SECRET=$(echo "$GENERATE_OUTPUT" | sed -n 's/.*api_secret["'"'"']: *["'"'"']\([^"'"'"']*\).*/\1/p')

echo "Captured API Key: $ERPNEXT_API_KEY"
echo "Captured API Secret: $ERPNEXT_API_SECRET"

# Write the .env file with captured keys
cat > platform-devops/.env << EOF
# ERPNext connection
ERPNEXT_URL=http://erpnext-frontend:8080             # internal Docker URL for server-to-server calls
ERPNEXT_PUBLIC_URL=http://localhost:8081            # public URL for browser redirects
ERPNEXT_CLIENT_ID=platform_devops
ERPNEXT_CLIENT_SECRET=change_me_client_secret

# ERPNext API key/secret for server-to-server calls
ERPNEXT_API_KEY=${ERPNEXT_API_KEY}
ERPNEXT_API_SECRET=${ERPNEXT_API_SECRET}

# FastAPI JWT signing key — generate with: openssl rand -hex 32
JWT_SECRET=1SKIQ907zXYpJ3ojN6phvcsZVsQECiXM0fKyiITB5GwKFfraEC

# Redis (reuse existing redis-cache if available)
REDIS_URL=redis://erpnext-redis:6379

# Webhook HMAC secret — must match the secret set in ERPNext Webhook DocType
WEBHOOK_SECRET=WDSNXPHJzHlDSIu30fiZkJWCPuhGBrkjB6Jh3BUOB5AZodVgzj

# CORS — comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:3000

# Next.js public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
EOF

echo "Written platform-devops/.env with API credentials"