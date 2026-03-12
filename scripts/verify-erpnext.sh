#!/bin/bash
# ERPNext Setup Verification Script

echo "=== KKU Cloud Application Project - ERPNext Setup Verification ==="
echo ""

# Check if docker compose is available
if ! command -v docker compose &> /dev/null; then
    echo "ERROR: docker compose is not available"
    exit 1
fi

# Check if containers are running
echo "1. Checking ERPNext containers..."
if docker compose -f docker-compose.yml -f overrides/compose.erpnext.yaml ps | grep -q "erpnext"; then
    echo "   ✓ ERPNext containers exist"
    docker compose -f docker-compose.yml -f overrides/compose.erpnext.yaml ps | grep erpnext
else
    echo "   ✗ ERPNext containers not found. Run: docker compose -f docker-compose.yml -f overrides/compose.erpnext.yaml up -d"
fi
echo ""

# Check PostgreSQL database
echo "2. Checking ERPNext database..."
if docker exec cloud-project-postgres psql -U postgres -c "\l" | grep -q "erpnext"; then
    echo "   ✓ ERPNext database exists"
else
    echo "   ✗ ERPNext database not found"
fi
echo ""

# Check if PostgreSQL user exists
echo "3. Checking erpnext database user..."
if docker exec cloud-project-postgres psql -U postgres -c "\du" | grep -q "erpnext"; then
    echo "   ✓ ERPNext database user exists"
else
    echo "   ✗ ERPNext database user not found"
fi
echo ""

# Check Redis
echo "4. Checking Redis..."
if docker ps | grep -q "erpnext-redis"; then
    echo "   ✓ Redis container is running"
    if docker exec erpnext-redis redis-cli ping &> /dev/null; then
        echo "   ✓ Redis is responding"
    else
        echo "   ✗ Redis is not responding"
    fi
else
    echo "   ✗ Redis container not found"
fi
echo ""

# Check ERPNext frontend
echo "5. Checking ERPNext frontend..."
if docker ps | grep -q "erpnext-frontend"; then
    echo "   ✓ Frontend container is running"
    if docker exec erpnext-frontend curl -s -f http://localhost:8000/ &> /dev/null; then
        echo "   ✓ Frontend is responding on port 8000"
    else
        echo "   ✗ Frontend is not responding (may still be starting)"
    fi
else
    echo "   ✗ Frontend container not found"
fi
echo ""

# Check worker
echo "6. Checking ERPNext worker..."
if docker ps | grep -q "erpnext-backend"; then
    echo "   ✓ Worker container is running"
else
    echo "   ✗ Worker container not found"
fi
echo ""

# Check Traefik routes
echo "7. Checking Traefik configuration..."
if docker exec traefik cat /etc/traefik/traefik.yml 2>/dev/null | grep -q "erpnext" || \
   docker exec traefik curl -s http://localhost:8080/api/http/routers 2>/dev/null | grep -q "erpnext"; then
    echo "   ✓ Traefik routes for ERPNext exist"
else
    echo "   ℹ Traefik routes verification not available"
fi
echo ""

# Check logs for errors
echo "8. Checking for errors in recent logs..."
echo "   Recent erpnext-frontend logs (last 20 lines):"
docker logs --tail 20 erpnext-frontend 2>&1 | grep -i "error\|warning" || echo "   No errors found in recent logs"
echo ""

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Navigate to https://erpnext.mysterchat.com to complete the setup wizard"
echo "2. Change the default admin password immediately"
echo "3. Configure OAuth2 client for Platform & DevOps integration"
echo "4. See erpnext/README.md for detailed integration instructions"
