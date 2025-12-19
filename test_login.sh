#!/bin/bash
cd ~/adspark-ai

echo "=== Testing Login ==="
echo ""

echo "1. Checking if user exists..."
docker exec -i $(docker ps -qf name=supabase-db) psql -U postgres -c "SELECT email, email_confirmed_at IS NOT NULL as confirmed FROM auth.users WHERE email = 'to4799po@gmail.com';"

echo ""
echo "2. Testing auth endpoint..."
curl -s -X POST "http://localhost/api/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{"email":"to4799po@gmail.com","password":"a22c1575"}'

echo ""
echo ""
echo "3. Checking auth service logs..."
docker compose logs supabase-auth --tail=20 | grep -i "token\|error\|invalid"
