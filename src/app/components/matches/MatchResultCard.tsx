import type { MatchWithPlayers } from '@/types/matches.types'
import { Trophy, Target, X } from 'lucide-react'

interface MatchResultCardProps {
    match: MatchWithPlayers
    currentUserId: string
}

export function MatchResultCard({ match, currentUserId }: MatchResultCardProps) {
    const isChallenger = match.challenger_user_id === currentUserId
    const isWinner = match.winner_user_id === currentUserId
    const isTie = match.is_tie

    const opponent = isChallenger ? match.opponent : match.challenger
    const opponentName = opponent?.full_name || 
                        'Opponent'

    const yourScore = isChallenger ? match.challenger_total : match.opponent_total
    const opponentScore = isChallenger ? match.opponent_total : match.challenger_total
    const yourXCount = isChallenger ? match.challenger_x_count : match.opponent_x_count
    const opponentXCount = isChallenger ? match.opponent_x_count : match.challenger_x_count

    let resultIcon = null
    let resultText = ''
    let resultColor = ''

    if (isTie) {
        resultIcon = <Target className="h-5 w-5" />
        resultText = 'Tie'
        resultColor = 'bg-stone-100 text-stone-700'
    } else if (isWinner) {
        resultIcon = <Trophy className="h-5 w-5" />
        resultText = 'You Won!'
        resultColor = 'bg-amber-100 text-amber-700'
    } else {
        resultIcon = <Target className="h-5 w-5" />
        resultText = 'You Lost'
        resultColor = 'bg-stone-100 text-stone-600'
    }

    return (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${resultColor}`}>
                        {resultIcon}
                        {resultText}
                    </span>
                    <span className="text-sm text-stone-500">vs {opponentName}</span>
                </div>
                <span className="text-xs text-stone-400">
                    {new Date(match.created_at).toLocaleDateString()}
                </span>
            </div>

            {/* Score Comparison */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-stone-50 p-3">
                <div className="text-center">
                    <p className="text-xs text-stone-500">You</p>
                    <p className="text-2xl font-bold text-stone-800">{yourScore ?? '-'}</p>
                    <p className="flex items-center justify-center gap-1 text-xs text-stone-500">
                        <X className="h-3 w-3" />
                        {yourXCount ?? 0}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-stone-500">{opponentName}</p>
                    <p className="text-2xl font-bold text-stone-800">{opponentScore ?? '-'}</p>
                    <p className="flex items-center justify-center gap-1 text-xs text-stone-500">
                        <X className="h-3 w-3" />
                        {opponentXCount ?? 0}
                    </p>
                </div>
            </div>

            {/* Match Config */}
            <p className="mt-3 text-xs text-stone-400">
                {match.config_distance}m • {match.config_ends_count} ends • {match.config_arrows_per_end} arrows
            </p>
        </div>
    )
}
