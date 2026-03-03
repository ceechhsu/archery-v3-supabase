-- ============================================
-- Migration: Add 1-vs-1 Match Feature
-- Date: March 3, 2026
-- Phase: 1 - Database Schema
-- ============================================

-- ============================================
-- 1. CREATE MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Match configuration (set by challenger)
    config_distance INTEGER NOT NULL DEFAULT 18,
    config_ends_count INTEGER NOT NULL DEFAULT 2,
    config_arrows_per_end INTEGER NOT NULL DEFAULT 5,
    
    -- Players
    challenger_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable until accepted
    
    -- Pre-created sessions (nullable until match is accepted)
    challenger_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    opponent_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Status workflow: pending → accepted → active → completed | cancelled
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'accepted', 'active', 'completed', 'cancelled')),
    
    -- Denormalized results for fast reads (nullable until match completes)
    challenger_total INTEGER,
    opponent_total INTEGER,
    challenger_x_count INTEGER,
    opponent_x_count INTEGER,
    winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_tie BOOLEAN NOT NULL DEFAULT false,
    
    -- Cancellation tracking
    cancelled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cancelled_reason TEXT,
    
    -- Timestamps
    invitation_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for matches table
CREATE INDEX IF NOT EXISTS idx_matches_challenger ON matches(challenger_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_opponent ON matches(opponent_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_challenger_session ON matches(challenger_session_id);
CREATE INDEX IF NOT EXISTS idx_matches_opponent_session ON matches(opponent_session_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- ============================================
-- 2. CREATE MATCH_INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS match_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    invitee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- filled when user accepts
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired', 'declined')),
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for match_invitations table
CREATE INDEX IF NOT EXISTS idx_invitations_email ON match_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_match ON match_invitations(match_id);
CREATE INDEX IF NOT EXISTS idx_invitations_user ON match_invitations(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON match_invitations(status);

-- ============================================
-- 3. MODIFY SESSIONS TABLE
-- ============================================
-- Add match-related columns (nullable, so backward compatible)
ALTER TABLE sessions 
    ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_submitted_to_match BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_match ON sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_sessions_submitted ON sessions(is_submitted_to_match);

-- ============================================
-- 4. ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES FOR MATCHES TABLE
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS matches_select_policy ON matches;
DROP POLICY IF EXISTS matches_insert_policy ON matches;
DROP POLICY IF EXISTS matches_update_policy ON matches;
DROP POLICY IF EXISTS matches_delete_policy ON matches;

-- Players can only see matches they're part of
CREATE POLICY matches_select_policy ON matches
    FOR SELECT 
    USING (
        auth.uid() = challenger_user_id 
        OR auth.uid() = opponent_user_id
    );

-- Only challenger can create
CREATE POLICY matches_insert_policy ON matches
    FOR INSERT 
    WITH CHECK (auth.uid() = challenger_user_id);

-- Players can update their own matches (with status restrictions handled in app)
CREATE POLICY matches_update_policy ON matches
    FOR UPDATE 
    USING (
        auth.uid() = challenger_user_id 
        OR auth.uid() = opponent_user_id
    );

-- No direct deletes - use status change to cancelled
CREATE POLICY matches_delete_policy ON matches
    FOR DELETE
    USING (false); -- Prevent direct deletion

-- ============================================
-- 6. RLS POLICIES FOR MATCH_INVITATIONS TABLE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS invitations_select_policy ON match_invitations;
DROP POLICY IF EXISTS invitations_insert_policy ON match_invitations;
DROP POLICY IF EXISTS invitations_update_policy ON match_invitations;

-- User can see invitation if:
-- 1. They're the challenger (via match)
-- 2. Their email matches the invitee_email
-- 3. They're the invited user (after accepting)
CREATE POLICY invitations_select_policy ON match_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = match_invitations.match_id 
            AND matches.challenger_user_id = auth.uid()
        )
        OR invitee_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
        OR invitee_user_id = auth.uid()
    );

-- Only system can insert (via match creation)
CREATE POLICY invitations_insert_policy ON match_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches 
            WHERE matches.id = match_invitations.match_id 
            AND matches.challenger_user_id = auth.uid()
        )
    );

-- Only invited user can update (accept/decline)
CREATE POLICY invitations_update_policy ON match_invitations
    FOR UPDATE
    USING (
        invitee_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
        OR invitee_user_id = auth.uid()
    );

-- ============================================
-- 7. RLS POLICY FOR SESSIONS TABLE (BLIND SCORING)
-- ============================================

-- Drop and recreate the select policy to include match visibility
-- Note: This modifies the existing policy, so we need to be careful

-- First, check if there's an existing select policy and drop it
DROP POLICY IF EXISTS sessions_select_policy ON sessions;

-- Create comprehensive select policy
CREATE POLICY sessions_select_policy ON sessions
    FOR SELECT
    USING (
        -- User's own sessions
        user_id = auth.uid()
        
        -- OR: Match opponent's session when BOTH are submitted
        OR (
            match_id IS NOT NULL
            AND is_submitted_to_match = true
            AND EXISTS (
                SELECT 1 FROM matches m
                WHERE m.id = sessions.match_id
                AND (
                    -- User is challenger, looking at opponent's submitted session
                    (
                        m.challenger_user_id = auth.uid() 
                        AND m.opponent_session_id = sessions.id
                        AND EXISTS (
                            SELECT 1 FROM sessions s2
                            WHERE s2.id = m.challenger_session_id
                            AND s2.is_submitted_to_match = true
                        )
                    )
                    OR
                    -- User is opponent, looking at challenger's submitted session
                    (
                        m.opponent_user_id = auth.uid() 
                        AND m.challenger_session_id = sessions.id
                        AND EXISTS (
                            SELECT 1 FROM sessions s2
                            WHERE s2.id = m.opponent_session_id
                            AND s2.is_submitted_to_match = true
                        )
                    )
                )
            )
        )
    );

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to check if user has an active match
CREATE OR REPLACE FUNCTION user_has_active_match(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM matches
        WHERE (challenger_user_id = p_user_id OR opponent_user_id = p_user_id)
        AND status IN ('pending', 'accepted', 'active')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active match for user
CREATE OR REPLACE FUNCTION get_user_active_match(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_match_id UUID;
BEGIN
    SELECT id INTO v_match_id
    FROM matches
    WHERE (challenger_user_id = p_user_id OR opponent_user_id = p_user_id)
    AND status IN ('pending', 'accepted', 'active')
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN v_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate winner and update match
CREATE OR REPLACE FUNCTION calculate_match_winner(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_challenger_total INTEGER;
    v_opponent_total INTEGER;
    v_challenger_x_count INTEGER;
    v_opponent_x_count INTEGER;
    v_challenger_id UUID;
    v_opponent_id UUID;
    v_winner_id UUID;
    v_is_tie BOOLEAN := false;
BEGIN
    -- Get totals from sessions
    SELECT 
        COALESCE(m.challenger_total, 0),
        COALESCE(m.opponent_total, 0),
        COALESCE(m.challenger_x_count, 0),
        COALESCE(m.opponent_x_count, 0),
        m.challenger_user_id,
        m.opponent_user_id
    INTO 
        v_challenger_total,
        v_opponent_total,
        v_challenger_x_count,
        v_opponent_x_count,
        v_challenger_id,
        v_opponent_id
    FROM matches m
    WHERE m.id = p_match_id;
    
    -- Determine winner
    IF v_challenger_total > v_opponent_total THEN
        v_winner_id := v_challenger_id;
    ELSIF v_opponent_total > v_challenger_total THEN
        v_winner_id := v_opponent_id;
    ELSE
        -- Tie - check X count
        IF v_challenger_x_count > v_opponent_x_count THEN
            v_winner_id := v_challenger_id;
        ELSIF v_opponent_x_count > v_challenger_x_count THEN
            v_winner_id := v_opponent_id;
        ELSE
            -- True tie
            v_is_tie := true;
            v_winner_id := NULL;
        END IF;
    END IF;
    
    -- Update match
    UPDATE matches
    SET 
        winner_user_id = v_winner_id,
        is_tie = v_is_tie,
        status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;

-- Create trigger
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE matches IS 'Stores 1-vs-1 match data between two archers';
COMMENT ON TABLE match_invitations IS 'Tracks email invitations for matches';
COMMENT ON COLUMN matches.status IS 'pending->accepted->active->completed OR cancelled';
COMMENT ON COLUMN sessions.match_id IS 'Links session to a match (if part of competitive match)';
COMMENT ON COLUMN sessions.is_submitted_to_match IS 'True when player has submitted their match scores';
