import Link from 'next/link'
import type { MatchDetails } from '@/types/matches.types'
import { Target, ArrowRight } from 'lucide-react'

interface ActiveMatchBannerProps {
    match: MatchDetails
}

export function ActiveMatchBanner({ match }: ActiveMatchBannerProps) {
    const opponentName = match.opponent?.full_name || 'Opponent'
    const opponentAvatar = match.opponent?.avatar_url

    const isWaitingForOpponent = match.status === 'accepted' && !match.opponent_session_id
    const isInProgress = match.status === 'active'
    const isPending = match.status === 'pending'

    let statusText = ''
    let actionText = ''
    let href = ''

    if (isPending) {
        statusText = `Waiting for ${opponentName} to accept`
        actionText = 'View Invitation'
        href = `/match/${match.id}`
    } else if (isWaitingForOpponent) {
        statusText = `${opponentName} needs to start their session`
        actionText = 'Continue Scoring'
        href = `/log?matchId=${match.id}`
    } else if (isInProgress) {
        if (match.yourSubmitted && !match.opponentSubmitted) {
            statusText = `Waiting for ${opponentName} to submit`
            actionText = 'View Match'
            href = `/match/${match.id}`
        } else if (!match.yourSubmitted) {
            statusText = `Match in progress vs ${opponentName}`
            actionText = 'Continue Scoring'
            href = `/log?matchId=${match.id}`
        }
    }

    return (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-forest to-forest/80 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 overflow-hidden">
                        {opponentAvatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={opponentAvatar}
                                alt={opponentName}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <Target className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium">{statusText}</p>
                        <p className="text-xs text-white/80">
                            {match.config_distance}m • {match.config_ends_count} ends • {match.config_arrows_per_end} arrows
                        </p>
                    </div>
                </div>
                <Link
                    href={href}
                    className="flex items-center gap-1 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
                >
                    {actionText}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    )
}
