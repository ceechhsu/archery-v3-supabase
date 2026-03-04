#!/bin/bash
source .env.local
URL="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_ACCESS_TOKEN:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

curl -s "$URL/rest/v1/sessions?match_id=eq.eefa585c-6aee-4b2b-a1f1-52bda70494e6&select=id,user_id,ends(id,end_index,shots(score))" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY"
