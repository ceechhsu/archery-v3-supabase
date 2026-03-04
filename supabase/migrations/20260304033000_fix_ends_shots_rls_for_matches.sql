-- ============================================
-- Fix Ends and Shots read access for Match Opponents
-- ============================================

-- Drop the previous restrictive policies added in the last migration
DROP POLICY IF EXISTS "Users can view ends if they can view the session" ON public.ends;
DROP POLICY IF EXISTS "Users can view shots if they can view the end" ON public.shots;

-- Create a more robust SELECT policy for ends that explicitly checks if the session is tied to a match
-- where the user is either the challenger or opponent.
CREATE POLICY "Users can view match ends"
ON public.ends
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = ends.session_id
        AND (
            s.user_id = auth.uid() -- Own session
            OR (
                -- Opponent's session in a match you are part of
                s.match_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.matches m
                    WHERE m.id = s.match_id
                    AND (m.challenger_user_id = auth.uid() OR m.opponent_user_id = auth.uid())
                )
            )
        )
    )
);

-- Similarly robust policy for shots
CREATE POLICY "Users can view match shots"
ON public.shots
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ends e
        JOIN public.sessions s ON e.session_id = s.id
        WHERE e.id = shots.end_id
        AND (
            s.user_id = auth.uid() -- Own session
            OR (
                -- Opponent's session in a match you are part of
                s.match_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.matches m
                    WHERE m.id = s.match_id
                    AND (m.challenger_user_id = auth.uid() OR m.opponent_user_id = auth.uid())
                )
            )
        )
    )
);
