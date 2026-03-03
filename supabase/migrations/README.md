# Database Migrations

## Phase 1: 1-vs-1 Match Feature - Database Schema

### Migration File
`20260303000000_add_matches_feature.sql`

### What This Migration Creates

#### 1. New Tables

**`matches`** - Stores 1-vs-1 match data
- Match configuration (distance, ends, arrows per end)
- Player references (challenger, opponent)
- Session references (linked practice sessions)
- Status workflow (pending → accepted → active → completed | cancelled)
- Denormalized results (totals, X-counts, winner)

**`match_invitations`** - Tracks email invitations
- Links to match
- Tracks invitee email and response status
- Expiration handling

#### 2. Modified Tables

**`sessions`** - Added columns:
- `match_id` (UUID, nullable) - Links session to a match
- `is_submitted_to_match` (boolean) - Whether player submitted scores
- `submitted_at` (timestamp) - When scores were submitted

#### 3. Indexes
Created for performance:
- `idx_matches_challenger` - Query matches by challenger
- `idx_matches_opponent` - Query matches by opponent
- `idx_matches_status` - Filter by status
- `idx_sessions_match` - Query sessions by match
- `idx_invitations_email` - Lookup invitations by email

#### 4. Row Level Security (RLS)

**matches table:**
- Users can only see matches they're part of
- Only challenger can create
- Both players can update

**match_invitations table:**
- Challenger can see their invitations
- Invitee can see their pending invitations

**sessions table (updated):**
- Users can see their own sessions
- Users can see opponent's session ONLY when both have submitted (blind scoring)

#### 5. Helper Functions

- `user_has_active_match(p_user_id)` - Check if user has active match
- `get_user_active_match(p_user_id)` - Get user's active match ID
- `calculate_match_winner(p_match_id)` - Determine winner and update match

### How to Apply

#### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Go to SQL Editor
4. Click "New Query"
5. Copy contents of `20260303000000_add_matches_feature.sql`
6. Run the SQL

#### Option 2: Supabase CLI (if installed)

```bash
supabase migration up
```

### Verification

After applying, verify by running:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('matches', 'match_invitations');

-- Check columns added to sessions
SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' AND column_name IN ('match_id', 'is_submitted_to_match');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('matches', 'match_invitations');
```

### Rollback (if needed)

```sql
-- Drop tables (cascades policies and triggers)
DROP TABLE IF EXISTS match_invitations CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- Remove columns from sessions
ALTER TABLE sessions DROP COLUMN IF EXISTS match_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS is_submitted_to_match;
ALTER TABLE sessions DROP COLUMN IF EXISTS submitted_at;

-- Drop functions
DROP FUNCTION IF EXISTS user_has_active_match(UUID);
DROP FUNCTION IF EXISTS get_user_active_match(UUID);
DROP FUNCTION IF EXISTS calculate_match_winner(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();
```

### Notes

- All new columns are nullable for backward compatibility
- Existing sessions continue to work unchanged
- RLS policies ensure data isolation
- Indexes ensure query performance
