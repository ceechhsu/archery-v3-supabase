// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from './actions/auth'
import { DashboardClient } from './components/DashboardClient'
import { NavigationTabBar } from './components/NavigationTabBar'
import { ActiveMatchBanner } from './components/matches/ActiveMatchBanner'
import { PendingInvitations } from './components/matches/PendingInvitations'
import { ChallengeButton } from './components/matches/ChallengeButton'
import { Target, Users, CheckCircle } from 'lucide-react'
import type { MatchDetails } from '@/types/matches.types'
import { DeclinedMatchNotifications, type DeclinedMatch } from './components/matches/DeclinedMatchNotifications'

type DashboardShot = {
  score: number
  is_x?: boolean | null
  is_m?: boolean | null
}

type DashboardSession = {
  id: string
  session_date: string
  distance: number | null
  notes: string | null
  match_id: string | null
  is_submitted_to_match: boolean
  submitted_at: string | null
  ends: {
    id: string
    photo_url: string | null
    shots: DashboardShot[]
  }[]
  match: {
    id: string
    status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled'
    completed_at: string | null
    challenger_user_id: string
    opponent_user_id: string | null
    challenger_total: number | null
    opponent_total: number | null
  } | null
}

type DashboardCalendarEntry = {
  id: string
  session_date: string
  display_date: string
  distance: number | null
  notes: string | null
  ends: {
    id: string
    photo_url: string | null
    shots: DashboardShot[]
  }[]
  is_match: boolean
  match_id: string | null
  match_score_summary: string | null
  opponent_name?: string | null
  opponent_avatar_url?: string | null
}

interface HomePageProps {
  searchParams: Promise<{
    matchAccepted?: string
    matchDeclined?: string
  }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Verify auth safely
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Extract metadata for the Welcome header
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Archer'
  const firstName = fullName.split(' ')[0]
  const avatarUrl = user.user_metadata?.avatar_url || ''

  // Fetch recent sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select(
      `
      id,
      session_date,
      distance,
      notes,
      match_id,
      is_submitted_to_match,
      submitted_at,
      ends (
        id,
        photo_url,
        shots (
          score,
          is_x,
          is_m
        )
      ),
      match:matches!match_id (
        id,
        status,
        completed_at,
        challenger_user_id,
        opponent_user_id,
        challenger_total,
        opponent_total
      )
    `
    )
    .order('session_date', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError.message)
  }

  const normalizedSessions = (sessions ?? []) as unknown as DashboardSession[]

  // --- Start dynamic profile fetching for opponents ---
  const opponentIds = new Set<string>()
  for (const session of normalizedSessions) {
    if (session.match && session.match.status === 'completed') {
      const oppId = session.match.challenger_user_id === user.id ? session.match.opponent_user_id : session.match.challenger_user_id
      if (oppId) opponentIds.add(oppId)
    }
  }

  let profileMap = new Map<string, { name: string, avatar: string | null }>()
  if (opponentIds.size > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(opponentIds))
    if (profiles) {
      profileMap = new Map(profiles.map(p => [
        p.id,
        {
          name: p.full_name?.split(' ')[0] || 'Opponent',
          avatar: p.avatar_url
        }
      ]))
    }
  }
  // --- End dynamic profile fetching ---

  // Build dashboard calendar entries:
  // - solo sessions always included
  // - match sessions included only when match is completed
  // - one consolidated entry per match per user, using submitted session only
  // - match entry date is match completed_at
  const matchEntriesByMatchId = new Map<string, DashboardCalendarEntry>()
  const dashboardEntries: DashboardCalendarEntry[] = []

  for (const session of normalizedSessions) {
    const match = session.match
    const isMatchSession = !!session.match_id

    if (!isMatchSession) {
      dashboardEntries.push({
        id: session.id,
        session_date: session.session_date,
        display_date: session.session_date,
        distance: session.distance,
        notes: session.notes,
        ends: session.ends || [],
        is_match: false,
        match_id: null,
        match_score_summary: null,
        opponent_name: null,
        opponent_avatar_url: null,
      })
      continue
    }

    // Hide match sessions until match is completed.
    if (!match || match.status !== 'completed') {
      continue
    }

    // Only use submitted sessions for consolidated match history entry.
    if (!session.is_submitted_to_match) {
      continue
    }

    const matchId = session.match_id
    if (!matchId) {
      continue
    }

    const isChallenger = match.challenger_user_id === user.id
    const yourScore = isChallenger ? match.challenger_total : match.opponent_total
    const opponentScore = isChallenger ? match.opponent_total : match.challenger_total

    // Get their real first name or fallback to "Opponent"
    const oppId = isChallenger ? match.opponent_user_id : match.challenger_user_id
    const oppProfile = oppId ? profileMap.get(oppId) : null
    const oppName = oppProfile?.name || 'Opponent'
    const oppAvatar = oppProfile?.avatar || null

    const scoreSummary =
      yourScore !== null && opponentScore !== null
        ? `${yourScore} - ${opponentScore}`
        : null

    const entry: DashboardCalendarEntry = {
      id: session.id,
      session_date: session.session_date,
      display_date: match.completed_at || session.session_date,
      distance: session.distance,
      notes: session.notes,
      ends: session.ends || [],
      is_match: true,
      match_id: matchId,
      match_score_summary: scoreSummary,
      opponent_name: oppName,
      opponent_avatar_url: oppAvatar,
    }

    const existing = matchEntriesByMatchId.get(matchId)
    if (!existing) {
      matchEntriesByMatchId.set(matchId, entry)
      continue
    }

    // If multiple submitted sessions exist for same match/user, keep the latest submitted one.
    const existingSubmitted = normalizedSessions.find((s) => s.id === existing.id)?.submitted_at
    const incomingSubmitted = session.submitted_at
    const existingTime = existingSubmitted ? new Date(existingSubmitted).getTime() : 0
    const incomingTime = incomingSubmitted ? new Date(incomingSubmitted).getTime() : 0
    if (incomingTime >= existingTime) {
      matchEntriesByMatchId.set(matchId, entry)
    }
  }

  dashboardEntries.push(...matchEntriesByMatchId.values())
  dashboardEntries.sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime())

  // Fetch up to 5 potential active matches to handle cases where 
  // older ones are secretly cancelled but still marked 'pending'
  const { data: potentialActiveMatches, error: activeMatchError } = await supabase
    .from('matches')
    .select('*')
    .or(`challenger_user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
    .in('status', ['pending', 'accepted', 'active'])
    .order('created_at', { ascending: false })
    .limit(5)

  let activeMatchData = null

  if (activeMatchError) {
    console.error('Error fetching active matches:', activeMatchError)
  }

  // Iterate to find the TRUE active match, discarding those that are actually declined
  if (potentialActiveMatches && potentialActiveMatches.length > 0) {
    for (const match of potentialActiveMatches) {
      // If it's your pending challenge, verify the invitation wasn't already rejected
      if (match.status === 'pending' && match.challenger_user_id === user.id) {
        const { data: invitationState } = await supabase
          .from('match_invitations')
          .select('status')
          .eq('match_id', match.id)
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invitationState && invitationState.status !== 'pending') {
          // Invitation is not pending (e.g. declined/expired). This match is dead.
          continue
        }
      }

      // If we reach here, it's a valid active match!
      activeMatchData = match
      break
    }
  }

  // Self-heal stale active match rows when both scores are present.
  // We use totals here because session rows for the opponent are not readable via RLS.
  if (activeMatchData?.status === 'active' && activeMatchData.opponent_user_id) {
    const bothSubmitted = activeMatchData.challenger_total !== null && activeMatchData.opponent_total !== null
    if (bothSubmitted) {
      const now = new Date().toISOString()
      await supabase
        .from('matches')
        .update({
          status: 'completed',
          completed_at: activeMatchData.completed_at || now,
          updated_at: now,
        })
        .eq('id', activeMatchData.id)

      await supabase.rpc('calculate_match_winner', { p_match_id: activeMatchData.id })
      activeMatchData = null
    }
  }

  // Fetch opponent profile for active match
  // For pending matches, opponent_user_id is null, so we need to get it from the invitation
  let opponentProfileForActive: { name: string | null; avatar: string | null } = { name: null, avatar: null }
  let opponentUserId: string | null = null
  
  if (activeMatchData) {
    opponentUserId = activeMatchData.opponent_user_id
    
    // If opponent_user_id is null (pending match), get invitee_user_id from invitation
    if (!opponentUserId && activeMatchData.status === 'pending') {
      const { data: invitation } = await supabase
        .from('match_invitations')
        .select('invitee_user_id, invitee_email')
        .eq('match_id', activeMatchData.id)
        .order('invited_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (invitation?.invitee_user_id) {
        opponentUserId = invitation.invitee_user_id
      } else if (invitation?.invitee_email) {
        // Fallback to email-based name if user hasn't registered yet
        opponentProfileForActive = {
          name: invitation.invitee_email.split('@')[0],
          avatar: null
        }
      }
    }
    
    // Fetch profile if we have a user ID
    if (opponentUserId) {
      const { data: oppProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', opponentUserId)
        .single()
      if (oppProfile) {
        opponentProfileForActive = {
          name: oppProfile.full_name?.split(' ')[0] || null,
          avatar: oppProfile.avatar_url
        }
      }
    }
  }

  let activeMatch: MatchDetails | null = null
  if (activeMatchData) {
    activeMatch = {
      ...activeMatchData,
      challenger: {
        id: activeMatchData.challenger_user_id,
        full_name: null,
        avatar_url: null
      },
      opponent: opponentProfileForActive.name
        ? {
          id: opponentUserId || activeMatchData.opponent_user_id || '',
          full_name: opponentProfileForActive.name,
          avatar_url: opponentProfileForActive.avatar
        }
        : null,
      winner: activeMatchData.winner_user_id
        ? {
          id: activeMatchData.winner_user_id,
          full_name: null
        }
        : null,
      yourScore: activeMatchData.challenger_user_id === user.id
        ? activeMatchData.challenger_total
        : activeMatchData.opponent_total,
      opponentScore: activeMatchData.challenger_user_id === user.id
        ? activeMatchData.opponent_total
        : activeMatchData.challenger_total,
      yourXCount: activeMatchData.challenger_user_id === user.id
        ? activeMatchData.challenger_x_count
        : activeMatchData.opponent_x_count,
      opponentXCount: activeMatchData.challenger_user_id === user.id
        ? activeMatchData.opponent_x_count
        : activeMatchData.challenger_x_count,
      isWinner: activeMatchData.winner_user_id === user.id,
      isLoser: activeMatchData.winner_user_id && activeMatchData.winner_user_id !== user.id && !activeMatchData.is_tie,
      isTie: activeMatchData.is_tie,
    } as MatchDetails
  }

  // Fetch pending invitations
  const { data: pendingInvitations } = await supabase
    .from('match_invitations')
    .select(`
      *,
      match:match_id(
        id,
        config_distance,
        config_ends_count,
        config_arrows_per_end
      )
    `)
    .eq('invitee_email', user.email?.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())

  // Fetch completed matches for history
  const { data: completedMatches } = await supabase
    .from('matches')
    .select('*')
    .or(`challenger_user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5)

  // Fetch declined/expired matches in the last 7 days where the user was the challenger
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // First find recent matches where this user is challenger
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('id, opponent_user_id')
    .eq('challenger_user_id', user.id)
    .gte('created_at', sevenDaysAgo.toISOString())

  const declinedMatches: DeclinedMatch[] = []

  if (recentMatches && recentMatches.length > 0) {
    const matchIds = recentMatches.map(m => m.id)

    // Find invitations for these matches that were declined or expired
    const { data: relevantInvites } = await supabase
      .from('match_invitations')
      .select('id, match_id, status, invitee_email, invitee_user_id')
      .in('match_id', matchIds)
      .in('status', ['declined', 'expired'])

    if (relevantInvites && relevantInvites.length > 0) {
      // Need an extra fetch if the opponent's user_id isn't already in our profileMap
      const missingOpponentIds = relevantInvites
        .map(i => i.invitee_user_id)
        .filter((id): id is string => id !== null && !profileMap.has(id))

      if (missingOpponentIds.length > 0) {
        const { data: moreProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', missingOpponentIds)

        if (moreProfiles) {
          moreProfiles.forEach(p => {
            profileMap.set(p.id, {
              name: p.full_name?.split(' ')[0] || 'Opponent',
              avatar: p.avatar_url
            })
          })
        }
      }

      for (const inv of relevantInvites) {
        let oppName = inv.invitee_email.split('@')[0]
        let oppAvatar = null

        // Prefer the user's profile if we have it
        if (inv.invitee_user_id && profileMap.has(inv.invitee_user_id)) {
          const p = profileMap.get(inv.invitee_user_id)!
          oppName = p.name
          oppAvatar = p.avatar
        } else {
          // Also check if the match object itself had an opponent_id
          const matchObj = recentMatches.find(m => m.id === inv.match_id)
          if (matchObj?.opponent_user_id && profileMap.has(matchObj.opponent_user_id)) {
            const p = profileMap.get(matchObj.opponent_user_id)!
            oppName = p.name
            oppAvatar = p.avatar
          }
        }

        declinedMatches.push({
          id: inv.match_id, // Important: use match_id so the localStorage matches
          reason: inv.status === 'declined' ? 'Invitation declined' : 'Invitation expired',
          name: oppName,
          avatar_url: oppAvatar,
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-serif font-bold tracking-tight text-forest hover:text-forest-light transition-colors"
            >
              <Target className="h-6 w-6 text-terracotta" />
              ArrowLog
            </Link>
            <div className="flex items-center gap-2 border-l border-stone-300 pl-3">
              {avatarUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={firstName}
                  className="h-7 w-7 rounded-full shadow-sm ring-2 ring-stone-100"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="text-sm font-medium text-stone-600">
                Welcome, {firstName}
              </span>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-stone-500 hover:text-forest transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <NavigationTabBar />

        {/* Success Messages */}
        {params.matchAccepted && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">
              Match accepted! You can now start logging your scores.
            </p>
          </div>
        )}
        {params.matchDeclined && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-amber-800 font-medium">
              Match invitation declined.
            </p>
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <PendingInvitations invitations={pendingInvitations} />
        )}

        {/* Active Match Banner */}
        {activeMatch && <ActiveMatchBanner match={activeMatch} />}

        {/* Declined/Expired Match Notifications */}
        {declinedMatches.length > 0 && (
          <DeclinedMatchNotifications matches={declinedMatches} />
        )}

        {/* Challenge Button (if no active match) */}
        {!activeMatch && (
          <div className="mb-6">
            <ChallengeButton />
          </div>
        )}


        {/* Sessions Section */}
        <DashboardClient initialSessions={dashboardEntries} />
      </main>
    </div>
  )
}
