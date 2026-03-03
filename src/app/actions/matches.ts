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
        const { error: inviteError } = await supabase
            .from('match_invitations')
            .insert({
                match_id: match.id,
                invitee_email: opponentEmail.toLowerCase().trim(),
                status: 'pending',
                expires_at: invitationExpiresAt.toISOString(),
            })
        
        if (inviteError) {
            console.error('Error creating invitation:', inviteError)
            // Clean up the match
            await supabase.from('matches').delete().eq('id', match.id)
            return { matchId: '', error: 'Failed to create invitation' }
        }
        
        // 3. Send email invitation (Phase 3)
        // For now, we'll just return success
        // TODO: Integrate with Supabase email in Phase 3
        
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
 */
export async function acceptInvitation(input: AcceptInvitationInput): Promise<AcceptInvitationResponse> {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { matchId: '', error: 'Not authenticated' }
    }
    
    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
        .from('match_invitations')
        .select('*, match:matches(*)')
        .eq('id', input.invitationId)
        .eq('status', 'pending')
        .single()
    
    if (inviteError || !invitation) {
        return { matchId: '', error: 'Invitation not found or already responded' }
    }
    
    // Verify the invitation is for this user
    const userEmail = user.email?.toLowerCase()
    if (invitation.invitee_email !== userEmail) {
        return { matchId: '', error: 'This invitation is not for you' }
    }
    
    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        await supabase
            .from('match_invitations')
            .update({ status: 'expired' })
            .eq('id', input.invitationId)
        
        return { matchId: '', error: 'Invitation has expired' }
    }
    
    // Check if user already has active match
    const { data: hasActive } = await supabase
        .rpc('user_has_active_match', { p_user_id: user.id })
    
    if (hasActive) {
        return { matchId: '', error: 'You already have an active match' }
    }
    
    const matchId = invitation.match_id
    const now = new Date().toISOString()
    
    try {
        // Update invitation
        await supabase
            .from('match_invitations')
            .update({
                status: 'accepted',
                invitee_user_id: user.id,
                responded_at: now,
            })
            .eq('id', input.invitationId)
        
        // Update match
        await supabase
            .from('matches')
            .update({
                opponent_user_id: user.id,
                status: 'accepted',
                accepted_at: now,
            })
            .eq('id', matchId)
        
        revalidatePath('/')
        return { matchId }
        
    } catch (err) {
        console.error('Error accepting invitation:', err)
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
    
    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
        .from('match_invitations')
        .select('*')
        .eq('id', input.invitationId)
        .eq('status', 'pending')
        .single()
    
    if (inviteError || !invitation) {
        return { error: 'Invitation not found or already responded' }
    }
    
    // Verify the invitation is for this user
    const userEmail = user.email?.toLowerCase()
    if (invitation.invitee_email !== userEmail) {
        return { error: 'This invitation is not for you' }
    }
    
    const now = new Date().toISOString()
    
    try {
        // Update invitation
        await supabase
            .from('match_invitations')
            .update({
                status: 'declined',
                invitee_user_id: user.id,
                responded_at: now,
            })
            .eq('id', input.invitationId)
        
        // Cancel the match
        await supabase
            .from('matches')
            .update({
                status: 'cancelled',
                cancelled_by_user_id: user.id,
                cancelled_reason: 'Invitation declined',
                cancelled_at: now,
            })
            .eq('id', invitation.match_id)
        
        revalidatePath('/')
        return {}
        
    } catch (err) {
        console.error('Error declining invitation:', err)
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
    
    const { data: invitations, error } = await supabase
        .from('match_invitations')
        .select(`
            *,
            match:match_id(
                id,
                config_distance,
                config_ends_count,
                config_arrows_per_end,
                challenger_user_id
            )
        `)
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
        await supabase
            .from('matches')
            .update({
                status: 'cancelled',
                cancelled_by_user_id: user.id,
                cancelled_reason: input.reason || 'Cancelled by challenger',
                cancelled_at: now,
                updated_at: now,
            })
            .eq('id', input.matchId)
        
        // Also cancel any pending invitations
        await supabase
            .from('match_invitations')
            .update({ status: 'expired' })
            .eq('match_id', input.matchId)
            .eq('status', 'pending')
        
        revalidatePath('/')
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
    
    // Get the match
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', input.matchId)
        .single()
    
    if (matchError || !match) {
        return { status: 'waiting', error: 'Match not found' }
    }
    
    // Determine which player we are
    const isChallenger = match.challenger_user_id === user.id
    const isOpponent = match.opponent_user_id === user.id
    
    if (!isChallenger && !isOpponent) {
        return { status: 'waiting', error: 'You are not part of this match' }
    }
    
    // Get the session for this player
    const sessionId = isChallenger ? match.challenger_session_id : match.opponent_session_id
    
    if (!sessionId) {
        return { status: 'waiting', error: 'You have not created a session for this match' }
    }
    
    // Check if already submitted
    const { data: session } = await supabase
        .from('sessions')
        .select('is_submitted_to_match')
        .eq('id', sessionId)
        .single()
    
    if (session?.is_submitted_to_match) {
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
        await supabase
            .from('sessions')
            .update({
                is_submitted_to_match: true,
                submitted_at: now,
            })
            .eq('id', sessionId)
        
        // Update match with scores
        const updateData: Record<string, unknown> = {
            updated_at: now,
        }
        
        if (isChallenger) {
            updateData.challenger_total = totalScore
            updateData.challenger_x_count = xCount
        } else {
            updateData.opponent_total = totalScore
            updateData.opponent_x_count = xCount
        }
        
        // Check if both have submitted
        const otherSessionId = isChallenger ? match.opponent_session_id : match.challenger_session_id
        
        if (otherSessionId) {
            const { data: otherSession } = await supabase
                .from('sessions')
                .select('is_submitted_to_match')
                .eq('id', otherSessionId)
                .single()
            
            if (otherSession?.is_submitted_to_match) {
                // Both submitted - complete the match
                await supabase
                    .from('matches')
                    .update({
                        ...updateData,
                        status: 'completed',
                        completed_at: now,
                    })
                    .eq('id', input.matchId)
                
                // Calculate winner
                await supabase.rpc('calculate_match_winner', { p_match_id: input.matchId })
                
                revalidatePath('/')
                return { status: 'completed' }
            }
        }
        
        // Only this player submitted
        await supabase
            .from('matches')
            .update(updateData)
            .eq('id', input.matchId)
        
        revalidatePath('/')
        return { status: 'waiting', opponentSubmitted: false }
        
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
