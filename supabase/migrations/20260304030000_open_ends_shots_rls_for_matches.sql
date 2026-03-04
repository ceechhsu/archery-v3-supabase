-- ============================================
-- Add Read Access to Ends and Shots for Match Opponents
-- ============================================

-- By default, ends and shots are only visible if the user owns the parent session.
-- For completed matches, users need to be able to read their opponent's ends and shots.
-- Since we already have a complex RLS policy on the sessions table that handles 
-- exactly when a match opponent's session is visible, we can just piggyback off that.
-- If the user can SELECT the session, they should be able to SELECT its ends and shots.

-- Create permissive SELECT policies for ends
CREATE POLICY "Users can view ends if they can view the session"
ON public.ends
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sessions
        WHERE sessions.id = ends.session_id
    )
);

-- Create permissive SELECT policies for shots
CREATE POLICY "Users can view shots if they can view the end"
ON public.shots
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ends
        WHERE ends.id = shots.end_id
    )
);
