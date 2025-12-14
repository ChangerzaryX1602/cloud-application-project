#!/bin/bash
# This script updates the Login UI text.
# Prerequisite: The 'login-client' user must have 'ORG_OWNER' permission in the Organization.

PAT=$(cat ../data/zitadel/login-client.pat | tr -d '\n')

echo "Updating Login UI text..."

curl -k -v -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PAT" \
  --data '{"title": "KKU Cloud Application Project SSO by อาจารย์ชัชชัย", "heading": "KKU Cloud Application Project SSO by อาจารย์ชัชชัย"}' \
  https://localhost/management/v1/text/login/en

echo -e "\nDone."
