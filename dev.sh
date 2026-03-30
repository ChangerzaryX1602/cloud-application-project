docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  up -d platform-fastapi
docker rm -f erpnext-redis erpnext-configurator erpnext-backend erpnext-frontend erpnext-websocket erpnext-queue-short erpnext-queue-long erpnext-scheduler
docker compose \
  -f docker-compose.yml \
  -f overrides/compose.erpnext.yaml \
  -f overrides/compose.platform-devops.yaml \
  --env-file platform-devops/.env \
  up -d