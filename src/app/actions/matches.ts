'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type {
    CreateMatchInput,
    CreateMatchResponse,
    AcceptInvitationInput,
    AcceptInvitationResponse,
    DeclineInvitationInput,
    CancelMatchInput,
    SubmitMatchScoresInput,
    SubmitMatchScoresResponse,
    MatchDetails,
    ListMatchesInput,
    MatchWithPlayers,
    CanCreateMatchResult,
    MatchConfig,
} from '@/types/matches.types'
import { DEFAULT_MATCH_CONFIG } from '@/types/matches.types'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user can create a new match
 * (must not have any active matches)
 */
export async function canCreateMatch(): Promise<CanCreateMatchResult> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { canCreate: false, reason: 'NOT_AUTHENTICATED' }
    }

    // Check if user has active match using the helper function
    const { data: hasActive, error: checkError } = await supabase
        .rpc('user_has_active_match', { p_user_id: user.id })

    if (checkError) {
        console.error('Error checking active match:', checkError)
        return { canCreate: false, reason: 'CHECK_ERROR' }
    }

    if (hasActive) {
        // Get the active match ID
        const { data: activeMatchId } = await supabase
            .rpc('get_user_active_match', { p_user_id: user.id })

        if (activeMatchId) {
            const { data: activeMatch } = await supabase
                .from('matches')
                .select('id, status, challenger_user_id, opponent_user_id, challenger_total, opponent_total')
                .eq('id', activeMatchId)
                .maybeSingle()

            // Self-heal stale pending match when invitation already resolved.
            if (activeMatch?.status === 'pending' && activeMatch.challenger_user_id === user.id) {
                const { data: invitation } = await supabase
                    .from('match_invitations')
                    .select('status')
                    .eq('match_id', activeMatchId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (invitation && invitation.status !== 'pending') {
                    await supabase
                        .from('matches')
                        .update({
                            status: 'cancelled',
                            cancelled_reason: `Invitation ${invitation.status}`,
                            cancelled_at: new Date().toISOString(),
                        })
                        .eq('id', activeMatchId)

                    return { canCreate: true }
                }
            }

            // Self-heal stale active match when both scores are already present.
            // We use match totals here because session rows for the other player are blocked by RLS.
            if (activeMatch?.status === 'active' && activeMatch.opponent_user_id) {
                const bothSubmitted = activeMatch.challenger_total !== null && activeMatch.opponent_total !== null
                if (bothSubmitted) {
                    const now = new Date().toISOString()
                    const { error: completeError } = await supabase
                        .from('matches')
                        .update({
                            status: 'completed',
                            completed_at: now,
                            updated_at: now,
                        })
                        .eq('id', activeMatchId)

                    if (!completeError) {
                        await supabase.rpc('calculate_match_winner', { p_match_id: activeMatchId })
                        return { canCreate: true }
                    }
                }
            }
        }

        return {
            canCreate: false,
            reason: 'HAS_ACTIVE_MATCH',
            activeMatchId: activeMatchId || undefined
        }
    }

    return { canCreate: true }
}

/**
 * Get current user's active match (if any)
 */
export async function getActiveMatch(): Promise<MatchDetails | null> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get active match ID
    const { data: matchId } = await supabase
        .rpc('get_user_active_match', { p_user_id: user.id })

    if (!matchId) return null

    // Get full match details
    return getMatchDetails({ matchId })
}

/**
 * Get match details with all related data
 */
export async function getMatchDetails({ matchId }: { matchId: string }): Promise<MatchDetails | null> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get match without user relationships (auth.users is in different schema)
    const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

    if (error || !match) {
        console.error('Error fetching match:', error)
        return null
    }

    // Get challenger session
    const { data: challengerSession } = await supabase
        .from('sessions')
        .select('id, session_date, is_submitted_to_match, submitted_at')
        .eq('id', match.challenger_session_id)
        .single()

    // Get opponent session (might be null if not accepted yet)
    const { data: opponentSession } = match.opponent_session_id
        ? await supabase
            .from('sessions')
            .select('id, session_date, is_submitted_to_match, submitted_at')
            .eq('id', match.opponent_session_id)
            .single()
        : { data: null }

    // Determine perspective (are we challenger or opponent?)
    const isChallenger = match.challenger_user_id === user.id
    const isOpponent = match.opponent_user_id === user.id

    if (!isChallenger && !isOpponent) {
        return null // User not part of this match
    }

    // Calculate derived fields
    const yourScore = isChallenger ? match.challenger_total : match.opponent_total
    const opponentScore = isChallenger ? match.opponent_total : match.challenger_total
    const yourXCount = isChallenger ? match.challenger_x_count : match.opponent_x_count
    const opponentXCount = isChallenger ? match.opponent_x_count : match.challenger_x_count

    return {
        ...match,
        challenger_session: challengerSession,
        opponent_session: opponentSession,
        yourScore,
        opponentScore,
        yourXCount,
        opponentXCount,
        isWinner: match.winner_user_id === user.id,
        isLoser: match.winner_user_id && match.winner_user_id !== user.id && !match.is_tie,
        isTie: match.is_tie,
    } as MatchDetails
}

// ============================================
// MATCH CREATION
// ============================================

/**
 * Create a new match and send invitation
 */
export async function createMatch(input: CreateMatchInput): Promise<CreateMatchResponse> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { matchId: '', error: 'Not authenticated' }
    }

    // Check if user can create match
    const canCreate = await canCreateMatch()
    if (!canCreate.canCreate) {
        return {
            matchId: '',
            error: canCreate.reason === 'HAS_ACTIVE_MATCH'
                ? 'You already have an active match'
                : 'Cannot create match at this time'
        }
    }

    const { opponentEmail, config } = input
    const finalConfig = { ...DEFAULT_MATCH_CONFIG, ...config }

    // Validate config
    if (finalConfig.distance < 1 || finalConfig.endsCount < 1 || finalConfig.arrowsPerEnd < 1) {
        return { matchId: '', error: 'Invalid match configuration' }
    }

    // Calculate expiration (1 hour from now)
    const invitationExpiresAt = new Date()
    invitationExpiresAt.setHours(invitationExpiresAt.getHours() + 1)

    try {
        // 1. Create the match
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert({
                challenger_user_id: user.id,
                config_distance: finalConfig.distance,
                config_ends_count: finalConfig.endsCount,
                config_arrows_per_end: finalConfig.arrowsPerEnd,
                status: 'pending',
                invitation_expires_at: invitationExpiresAt.toISOString(),
            })
            .select()
            .single()

        if (matchError || !match) {
            console.error('Error creating match:', matchError)
            return { matchId: '', error: 'Failed to create match' }
        }

        // 2. Create the invitation
        const { data: invitation, error: inviteError } = await supabase
            .from('match_invitations')
            .insert({
                match_id: match.id,
                invitee_email: opponentEmail.toLowerCase().trim(),
                status: 'pending',
                expires_at: invitationExpiresAt.toISOString(),
            })
            .select()
            .single()

        if (inviteError || !invitation) {
            console.error('Error creating invitation:', inviteError)
            // Clean up the match
            await supabase.from('matches').delete().eq('id', match.id)
            return {
                matchId: '',
                error: `Failed to create invitation: ${inviteError?.message || 'Unknown error'}`
            }
        }

        // 3. Send email invitation via Edge Function
        const challengerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'A player'

        try {
            // Get the site URL for the email links
            const { data: { session } } = await supabase.auth.getSession()
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

            // Invoke the Edge Function to send email
            const { error: emailError } = await supabase.functions.invoke('send-match-invitation', {
                body: {
                    invitationId: invitation.id,
                    challengerName,
                    opponentEmail: opponentEmail.toLowerCase().trim(),
                    matchConfig: finalConfig,
                },
            })

            if (emailError) {
                console.error('Error sending invitation email:', emailError)
                // Continue - email is not critical, user can share link manually
            }
        } catch (emailErr) {
            console.error('Failed to send email:', emailErr)
            // Continue - email is not critical
        }

        revalidatePath('/')
        return { matchId: match.id }

    } catch (err) {
        console.error('Unexpected error creating match:', err)
        return { matchId: '', error: 'Unexpected error' }
    }
}

// ============================================
// INVITATION HANDLING
// ============================================

/**
 * Accept a match invitation
 * Uses atomic database function to ensure both invitation and match are updated together
 */
export async function acceptInvitation(input: AcceptInvitationInput): Promise<AcceptInvitationResponse> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { matchId: '', error: 'Not authenticated' }
    }

    console.log('[acceptInvitation] Starting for user:', user.id, 'invitation:', input.invitationId)

    try {
        // Use the atomic database function
        const { data: result, error: rpcError } = await supabase
            .rpc('accept_match_invitation', {
                p_invitation_id: input.invitationId,
                p_user_id: user.id,
                p_user_email: user.email?.toLowerCase() || '',
            })

        if (rpcError) {
            console.error('[acceptInvitation] RPC error:', rpcError)
            return { matchId: '', error: `Failed to accept invitation: ${rpcError.message}` }
        }

        // The result comes back as an array with a single object
        const outcome = result?.[0]

        if (!outcome) {
            console.error('[acceptInvitation] No result from RPC')
            return { matchId: '', error: 'Failed to accept invitation - no response' }
        }

        console.log('[acceptInvitation] RPC result:', outcome)

        if (!outcome.success) {
            return { matchId: '', error: outcome.error_message || 'Failed to accept invitation' }
        }

        console.log('[acceptInvitation] Successfully accepted, matchId:', outcome.match_id)

        // Force revalidation of all related paths
        revalidatePath('/')
        revalidatePath('/match')
        revalidatePath(`/match/${outcome.match_id}`)

        return { matchId: outcome.match_id }

    } catch (err) {
        console.error('[acceptInvitation] Unexpected error:', err)
        return { matchId: '', error: 'Failed to accept invitation' }
    }
}

/**
 * Decline a match invitation
 */
export async function declineInvitation(input: DeclineInvitationInput): Promise<{ error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Use the atomic database function
        const { data: result, error: rpcError } = await supabase
            .rpc('decline_match_invitation', {
                p_invitation_id: input.invitationId,
                p_user_id: user.id,
                p_user_email: user.email?.toLowerCase() || '',
            })

        if (rpcError) {
            console.error('[declineInvitation] RPC error:', rpcError)
            return { error: `Failed to decline invitation: ${rpcError.message}` }
        }

        // Handle both array and single object returns
        const outcome = Array.isArray(result) ? result[0] : result

        if (!outcome) {
            console.error('[declineInvitation] No result from RPC')
            return { error: 'Failed to decline invitation - no response' }
        }

        if (!outcome.success) {
            return { error: outcome.error_message || 'Failed to decline invitation' }
        }

        // Force revalidation of all related paths
        revalidatePath('/')
        revalidatePath('/match')
        revalidatePath(`/match/${outcome.match_id}`)

        return {}

    } catch (err) {
        console.error('[declineInvitation] Unexpected error:', err)
        return { error: 'Failed to decline invitation' }
    }
}

/**
 * Get pending invitations for current user
 */
export async function getPendingInvitations() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return []

    // Simplified query - fetch invitations without match relationship
    // The match relationship was causing PostgREST issues
    const { data: invitations, error } = await supabase
        .from('match_invitations')
        .select('*')
        .eq('invitee_email', user.email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

    if (error) {
        console.error('Error fetching invitations:', error)
        return []
    }

    return invitations || []
}

// ============================================
// MATCH MANAGEMENT
// ============================================

/**
 * Cancel a match (challenger only, before completion)
 */
export async function cancelMatch(input: CancelMatchInput): Promise<{ error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Get the match
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', input.matchId)
        .single()

    if (matchError || !match) {
        return { error: 'Match not found' }
    }

    // Only challenger can cancel
    if (match.challenger_user_id !== user.id) {
        return { error: 'Only the challenger can cancel this match' }
    }

    // Can't cancel completed matches
    if (match.status === 'completed') {
        return { error: 'Cannot cancel a completed match' }
    }

    const now = new Date().toISOString()

    try {
        const { data: updatedMatch, error: updateError } = await supabase
            .from('matches')
            .update({
                status: 'cancelled',
                cancelled_by_user_id: user.id,
                cancelled_reason: input.reason || 'Cancelled by challenger',
                cancelled_at: now,
                updated_at: now,
            })
            .eq('id', input.matchId)
            .eq('challenger_user_id', user.id)
            .in('status', ['pending', 'accepted', 'active'])
            .select('id')
            .maybeSingle()

        if (updateError || !updatedMatch) {
            console.error('Error cancelling match:', updateError)
            return { error: 'Could not cancel this match (it may already be completed)' }
        }

        // Also cancel any pending invitations
        await supabase
            .from('match_invitations')
            .update({ status: 'expired' })
            .eq('match_id', input.matchId)
            .eq('status', 'pending')

        revalidatePath('/')
        revalidatePath(`/match/${input.matchId}`)
        return {}

    } catch (err) {
        console.error('Error cancelling match:', err)
        return { error: 'Failed to cancel match' }
    }
}

/**
 * Submit match scores
 */
export async function submitMatchScores(input: SubmitMatchScoresInput): Promise<SubmitMatchScoresResponse> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { status: 'waiting', error: 'Not authenticated' }
    }

    console.log('[submitMatchScores] Starting for match:', input.matchId, 'user:', user.id)

    // Get the match
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', input.matchId)
        .single()

    if (matchError || !match) {
        console.error('[submitMatchScores] Match not found:', matchError)
        return { status: 'waiting', error: 'Match not found' }
    }

    console.log('[submitMatchScores] Found match:', match.id, 'status:', match.status)

    // Determine which player we are
    const isChallenger = match.challenger_user_id === user.id
    const isOpponent = match.opponent_user_id === user.id

    if (!isChallenger && !isOpponent) {
        return { status: 'waiting', error: 'You are not part of this match' }
    }

    // Find this player's latest session linked to the match.
    // We intentionally do not rely only on match.challenger_session_id/opponent_session_id,
    // because those pointers can be stale or missing.
    const { data: userSessions, error: userSessionsError } = await supabase
        .from('sessions')
        .select('id, is_submitted_to_match, created_at')
        .eq('match_id', input.matchId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

    if (userSessionsError) {
        console.error('[submitMatchScores] Error fetching user session:', userSessionsError)
        return { status: 'waiting', error: 'Failed to load your match session' }
    }

    const playerSession = userSessions?.[0]
    const sessionId = playerSession?.id

    if (!sessionId || !playerSession) {
        return { status: 'waiting', error: 'You have not created a session for this match' }
    }

    // Check if already submitted
    if (playerSession.is_submitted_to_match) {
        return { status: 'waiting', error: 'You have already submitted your scores' }
    }

    // Calculate totals from the session
    const { data: ends } = await supabase
        .from('ends')
        .select(`
            id,
            shots:shots(score, is_x, is_m)
        `)
        .eq('session_id', sessionId)

    let totalScore = 0
    let xCount = 0

    ends?.forEach(end => {
        end.shots?.forEach((shot: { score: number; is_x: boolean; is_m: boolean }) => {
            if (!shot.is_m) {
                totalScore += shot.is_x ? 10 : shot.score
                if (shot.is_x) xCount++
            }
        })
    })

    const now = new Date().toISOString()

    try {
        // Mark session as submitted
        const { error: submitSessionError } = await supabase
            .from('sessions')
            .update({
                is_submitted_to_match: true,
                submitted_at: now,
            })
            .eq('id', sessionId)

        if (submitSessionError) {
            console.error('[submitMatchScores] Error marking session submitted:', submitSessionError)
            return { status: 'waiting', error: 'Failed to submit your session' }
        }

        // Update match with scores
        const updateData: Record<string, unknown> = {
            updated_at: now,
        }

        if (isChallenger) {
            updateData.challenger_total = totalScore
            updateData.challenger_x_count = xCount
            updateData.challenger_session_id = sessionId
        } else {
            updateData.opponent_total = totalScore
            updateData.opponent_x_count = xCount
            updateData.opponent_session_id = sessionId
        }

        // Persist this player's totals/session pointer first.
        const { error: saveScoreError } = await supabase
            .from('matches')
            .update(updateData)
            .eq('id', input.matchId)

        if (saveScoreError) {
            console.error('[submitMatchScores] Error saving score to match:', saveScoreError)
            return { status: 'waiting', error: 'Failed to save match score' }
        }

        // Re-read match state after saving this player's totals.
        // Do not query both players' sessions here: RLS only allows reading current user's sessions.
        const { data: refreshedMatch, error: refreshedMatchError } = await supabase
            .from('matches')
            .select('challenger_total, opponent_total')
            .eq('id', input.matchId)
            .single()

        if (refreshedMatchError || !refreshedMatch) {
            console.error('[submitMatchScores] Error loading refreshed match:', refreshedMatchError)
            revalidatePath('/')
            revalidatePath(`/match/${input.matchId}`)
            return { status: 'waiting', opponentSubmitted: false }
        }

        const challengerSubmitted = refreshedMatch.challenger_total !== null
        const opponentSubmitted = refreshedMatch.opponent_total !== null
        const bothSubmitted = challengerSubmitted && opponentSubmitted

        if (bothSubmitted) {
            const completionUpdate: Record<string, unknown> = {
                status: 'completed',
                completed_at: now,
                updated_at: now,
            }

            const { error: completeStatusError } = await supabase
                .from('matches')
                .update(completionUpdate)
                .eq('id', input.matchId)

            if (completeStatusError) {
                console.error('[submitMatchScores] Error completing match:', completeStatusError)
                return { status: 'waiting', error: 'Scores submitted, but could not finalize match' }
            }

            const { error: winnerError } = await supabase
                .rpc('calculate_match_winner', { p_match_id: input.matchId })

            if (winnerError) {
                console.error('[submitMatchScores] Error calculating winner:', winnerError)
                return { status: 'waiting', error: 'Scores submitted, but winner calculation failed' }
            }

            revalidatePath('/')
            revalidatePath(`/match/${input.matchId}`)
            return { status: 'completed' }
        }

        revalidatePath('/')
        revalidatePath(`/match/${input.matchId}`)
        return { status: 'waiting', opponentSubmitted: isChallenger ? opponentSubmitted : challengerSubmitted }

    } catch (err) {
        console.error('Error submitting scores:', err)
        return { status: 'waiting', error: 'Failed to submit scores' }
    }
}

// ============================================
// LISTING MATCHES
// ============================================

/**
 * List matches for current user
 */
export async function listMatches(input: ListMatchesInput = {}): Promise<MatchWithPlayers[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { status = 'all', limit = 50, offset = 0 } = input

    let query = supabase
        .from('matches')
        .select('*')
        .or(`challenger_user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    // Filter by status
    if (status !== 'all') {
        if (status === 'active') {
            query = query.in('status', ['pending', 'accepted', 'active'])
        } else {
            query = query.eq('status', status)
        }
    }

    const { data: matches, error } = await query

    if (error) {
        console.error('Error listing matches:', error)
        return []
    }

    return matches || []
}

/**
 * Link a session to a match
 * Called when user creates a session during an active match
 */
export async function linkSessionToMatch(sessionId: string, matchId: string): Promise<{ error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Verify the match exists and user is part of it
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

    if (matchError || !match) {
        return { error: 'Match not found' }
    }

    const isChallenger = match.challenger_user_id === user.id
    const isOpponent = match.opponent_user_id === user.id

    if (!isChallenger && !isOpponent) {
        return { error: 'You are not part of this match' }
    }

    // Update the session
    const { error } = await supabase
        .from('sessions')
        .update({ match_id: matchId })
        .eq('id', sessionId)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error linking session:', error)
        return { error: 'Failed to link session to match' }
    }

    // Update match with session ID and change status to active
    const updateData: Record<string, unknown> = {
        status: 'active',
        updated_at: new Date().toISOString(),
    }

    if (isChallenger) {
        updateData.challenger_session_id = sessionId
    } else {
        updateData.opponent_session_id = sessionId
    }

    await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)

    revalidatePath('/')
    return {}
}
