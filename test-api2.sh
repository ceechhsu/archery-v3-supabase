#!/bin/bash
source .env.local
URL="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_ACCESS_TOKEN:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# Let's get the specific match again
MATCH=$(curl -s "$URL/rest/v1/matches?status=eq.completed&select=id,challenger_session_id,opponent_session_id&limit=1" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY")

C_SESSION=$(echo $MATCH | grep -o '"challenger_session_id":"[^"]*' | cut -d'"' -f4)

# Get full nested payload for challenger session
PAYLOAD=$(curl -s "$URL/rest/v1/sessions?id=eq.$C_SESSION&select=id,ends(*,shots(*))" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY")

echo "REST API Nested Read Result: $PAYLOAD"
