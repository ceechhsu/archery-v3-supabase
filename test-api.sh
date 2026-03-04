#!/bin/bash
source .env.local
URL="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_ACCESS_TOKEN:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# 1. Get a completed match
MATCH=$(curl -s "$URL/rest/v1/matches?status=eq.completed&select=id,challenger_session_id,opponent_session_id&limit=1" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY")

echo "Match Data: $MATCH"

# 2. Extract session IDs
C_SESSION=$(echo $MATCH | grep -o '"challenger_session_id":"[^"]*' | cut -d'"' -f4)
O_SESSION=$(echo $MATCH | grep -o '"opponent_session_id":"[^"]*' | cut -d'"' -f4)

echo "Challenger Session: $C_SESSION"
echo "Opponent Session: $O_SESSION"

# 3. Fetch ends for challenger
C_ENDS=$(curl -s "$URL/rest/v1/ends?session_id=eq.$C_SESSION&select=id,end_index" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY")

echo "Challenger Ends: $C_ENDS"

# 4. Fetch ends for opponent
O_ENDS=$(curl -s "$URL/rest/v1/ends?session_id=eq.$O_SESSION&select=id,end_index" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY")

echo "Opponent Ends: $O_ENDS"
