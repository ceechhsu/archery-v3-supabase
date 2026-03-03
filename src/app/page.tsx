import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from './actions/auth'
import { DashboardClient } from './components/DashboardClient'
import { NavigationTabBar } from './components/NavigationTabBar'
import { ActiveMatchBanner } from './components/matches/ActiveMatchBanner'
import { PendingInvitations } from './components/matches/PendingInvitations'
import { MatchResultCard } from './components/matches/MatchResultCard'
import { ChallengeButton } from './components/matches/ChallengeButton'
import { Target, Users } from 'lucide-react'
import type { MatchDetails } from '@/types/matches.types'

export default async function Home() {
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
      ends (
        id,
        photo_url,
        shots (
          score,
          is_x,
          is_m
        )
      )
    `
    )
    .order('session_date', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError.message)
  }

  // Fetch active match
  const { data: activeMatchData, error: activeMatchError } = await supabase
    .from('matches')
    .select('*')
    .or(`challenger_user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
    .in('status', ['pending', 'accepted', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeMatchError) {
    console.error('Error fetching active match:', activeMatchError)
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
      opponent: activeMatchData.opponent_user_id 
        ? { 
            id: activeMatchData.opponent_user_id, 
            full_name: null, 
            avatar_url: null 
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
        
        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <PendingInvitations invitations={pendingInvitations} />
        )}
        
        {/* Active Match Banner */}
        {activeMatch && <ActiveMatchBanner match={activeMatch} />}
        
        {/* Challenge Button (if no active match) */}
        {!activeMatch && (
          <div className="mb-6">
            <ChallengeButton />
          </div>
        )}

        {/* Completed Matches Section */}
        {completedMatches && completedMatches.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-stone-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-forest" />
                Recent Matches
              </h2>
            </div>
            <div className="space-y-3">
              {completedMatches.map((match) => (
                <MatchResultCard 
                  key={match.id} 
                  match={match} 
                  currentUserId={user.id} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Sessions Section */}
        <DashboardClient initialSessions={sessions || []} />
      </main>
    </div>
  )
}
