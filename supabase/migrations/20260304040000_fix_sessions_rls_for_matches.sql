-- ============================================
-- Fix RLS visibility for Matches and Sessions
-- ============================================

-- Issue 1: `matches` select policy only evaluates if you are challenger or opponent
-- This is fine, but let's make it simpler and explicitly cover all cases.
DROP POLICY IF EXISTS matches_select_policy ON matches;
CREATE POLICY matches_select_policy ON matches
    FOR SELECT 
    USING (
        auth.uid() = challenger_user_id 
        OR auth.uid() = opponent_user_id
    );

-- Issue 2: `sessions` select policy had a complex recursive boolean check that was failing
-- because `sessions.is_submitted_to_match` from the OTHER session couldn't be evaluated 
-- securely in a single pass for some users.
-- Let's simplify: You can view a session if it belongs to a match you are in AND the match is completed.

DROP POLICY IF EXISTS sessions_select_policy ON sessions;

CREATE POLICY sessions_select_policy ON sessions
    FOR SELECT
    USING (
        -- User's own sessions
        user_id = auth.uid()
        
        -- OR: It's a session tied to a match the user is part of, AND that match is marked 'completed'
        OR (
            match_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = sessions.match_id
                AND (m.challenger_user_id = auth.uid() OR m.opponent_user_id = auth.uid())
                AND m.status = 'completed'
            )
        )
    );
