-- ============================================
-- Migration: Add decline_match_invitation function
-- Purpose: Allow invitee to decline and auto-cancel match atomically
-- ============================================

CREATE OR REPLACE FUNCTION decline_match_invitation(
    p_invitation_id UUID,
    p_user_id UUID,
    p_user_email TEXT
)
RETURNS TABLE(success BOOLEAN, match_id UUID, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
    v_match_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Get the invitation
    SELECT * INTO v_invitation
    FROM match_invitations
    WHERE id = p_invitation_id
      AND status = 'pending'
      AND invitee_email = LOWER(p_user_email);
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation not found or already responded'::TEXT;
        RETURN;
    END IF;
    
    -- Check if invitation expired
    IF v_invitation.expires_at < v_now THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation has expired'::TEXT;
        RETURN;
    END IF;
    
    v_match_id := v_invitation.match_id;
    
    -- Update the invitation to declined
    UPDATE match_invitations
    SET status = 'declined',
        invitee_user_id = p_user_id,
        responded_at = v_now
    WHERE id = p_invitation_id;
    
    -- Cancel the match
    UPDATE matches
    SET status = 'cancelled',
        cancelled_by_user_id = p_user_id,
        cancelled_reason = 'Invitation declined',
        cancelled_at = v_now,
        updated_at = v_now
    WHERE id = v_match_id;
    
    RETURN QUERY SELECT TRUE, v_match_id, NULL::TEXT;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION decline_match_invitation IS 'Declines a match invitation and cancels the associated match atomically';
