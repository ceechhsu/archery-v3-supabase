// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cancelMatch, submitMatchScores } from '@/app/actions/matches'
import { MatchPageView } from '@/app/components/matches/MatchPageView'
interface MatchPageProps {
    params: Promise<{ id: string }>
}

export default async function MatchPage({ params }: MatchPageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch match details
    const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !match) {
        return (
            <div className="min-h-screen bg-stone-50 p-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h1 className="text-2xl font-bold text-stone-800">Match Not Found</h1>
                    <p className="mt-2 text-stone-600">This match doesn&apos;t exist or you don&apos;t have access.</p>
                    <Link href="/" className="mt-4 inline-block rounded-lg bg-forest px-4 py-2 text-white">
                        Go Home
                    </Link>
                </div>
            </div>
        )
    }

    // Check if user is part of this match
    const isChallenger = match.challenger_user_id === user.id
    const isOpponent = match.opponent_user_id === user.id

    if (!isChallenger && !isOpponent) {
        redirect('/')
    }

    // Get invitation details if pending
    let invitation = null
    if (match.status === 'pending') {
        const { data: inv } = await supabase
            .from('match_invitations')
            .select('*')
            .eq('match_id', id)
            .single()
        invitation = inv
    }

    const isPending = match.status === 'pending'
    const isActive = match.status === 'active'
    const isCompleted = match.status === 'completed'
    const isCancelled = match.status === 'cancelled'

    // Determine exact session IDs if match is completed, otherwise fallback to finding any session linked to this match
    const userSessionId = isCompleted
        ? (isChallenger ? match.challenger_session_id : match.opponent_session_id)
        : null

    const opponentSessionId = isCompleted
        ? (isChallenger ? match.opponent_session_id : match.challenger_session_id)
        : null

    // Check if user has created a session for this match
    let userSessionQuery = supabase
        .from('sessions')
        .select(`
            id, 
            is_submitted_to_match, 
            submitted_at,
            ends (
                id,
                end_index,
                photo_url,
                shots (
                    score,
                    is_x,
                    is_m,
                    shot_index
                )
            )
        `)

    if (userSessionId) {
        userSessionQuery = userSessionQuery.eq('id', userSessionId)
    } else {
        userSessionQuery = userSessionQuery.eq('match_id', id).eq('user_id', user.id)
    }

    const { data: userSession } = await userSessionQuery.maybeSingle()

    // Check opponent's session status
    const opponentUserId = isChallenger ? match.opponent_user_id : match.challenger_user_id

    let opponentSessionQuery = supabase
        .from('sessions')
        .select(`
            id, 
            is_submitted_to_match,
            ends (
                id,
                end_index,
                photo_url,
                shots (
                    score,
                    is_x,
                    is_m,
                    shot_index
                )
            )
        `)

    if (opponentSessionId) {
        opponentSessionQuery = opponentSessionQuery.eq('id', opponentSessionId)
    } else {
        opponentSessionQuery = opponentSessionQuery.eq('match_id', id).eq('user_id', opponentUserId)
    }

    const { data: opponentSession } = await opponentSessionQuery.maybeSingle()

    const hasCreatedSession = !!userSession
    const hasSubmittedScores = userSession?.is_submitted_to_match ?? false
    const opponentHasSubmitted = opponentSession?.is_submitted_to_match ?? false

    console.log('[MatchPage] User Session Ends:', JSON.stringify(userSession?.ends, null, 2))
    console.log('[MatchPage] Opp Session Ends:', JSON.stringify(opponentSession?.ends, null, 2))

    // Build invitation link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const inviteLink = invitation
        ? `${siteUrl}/match/invite?token=${invitation.id}&action=accept`
        : null

    return <MatchPageView
        id={id}
        match={match}
        user={user}
        isChallenger={isChallenger}
        isOpponent={isOpponent}
        isPending={isPending}
        isActive={isActive}
        isCompleted={isCompleted}
        isCancelled={isCancelled}
        invitation={invitation}
        inviteLink={inviteLink}
        userSession={userSession}
        opponentSession={opponentSession}
        hasCreatedSession={hasCreatedSession}
        hasSubmittedScores={hasSubmittedScores}
        opponentHasSubmitted={opponentHasSubmitted}
    />
}
