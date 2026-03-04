-- Fix auth.users insert trigger after matches schema rename.
-- The previous function referenced removed columns (player_b_id/player_b_email)
-- and caused OAuth signups to fail with "Database error saving new user".

CREATE OR REPLACE FUNCTION public.resolve_match_player_b()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.match_invitations
    SET invitee_user_id = NEW.id
    WHERE invitee_user_id IS NULL
      AND status = 'pending'
      AND lower(invitee_email) = lower(NEW.email);

    RETURN NEW;
END;
$$;
