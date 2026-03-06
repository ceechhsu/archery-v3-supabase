'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'

export interface DeclinedMatch {
    id: string
    reason: string
    avatar_url: string | null
    name: string
}

interface Props {
    matches: DeclinedMatch[]
}

export function DeclinedMatchNotifications({ matches }: Props) {
    const [visibleMatches, setVisibleMatches] = useState<DeclinedMatch[]>([])

    useEffect(() => {
        // Filter out matches that have been dismissed in localStorage
        const nonDismissed = matches.filter(match => {
            return !localStorage.getItem(`dismissed_cancelled_match_${match.id}`)
        })
        setVisibleMatches(nonDismissed)
    }, [matches])

    const handleDismiss = (matchId: string) => {
        localStorage.setItem(`dismissed_cancelled_match_${matchId}`, 'true')
        setVisibleMatches(prev => prev.filter(m => m.id !== matchId))
    }

    if (visibleMatches.length === 0) return null

    return (
        <div className="mb-6 space-y-3">
            {visibleMatches.map(match => (
                <div
                    key={match.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0 rounded-full bg-amber-100 p-1">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-amber-900">
                                Match {match.reason.toLowerCase() === 'invitation declined' ? 'Declined' : 'Cancelled'}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-sm text-amber-800">
                                {match.avatar_url && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={match.avatar_url}
                                        alt={match.name}
                                        className="h-5 w-5 rounded-full object-cover ring-1 ring-amber-200"
                                    />
                                )}
                                <span>
                                    <span className="font-medium text-amber-900">{match.name}</span>{' '}
                                    {match.reason.toLowerCase() === 'invitation declined'
                                        ? 'declined your match invitation.'
                                        : `did not respond in time. The invitation expired.`}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => handleDismiss(match.id)}
                        className="shrink-0 p-1 text-amber-500 transition-colors hover:text-amber-700 hover:bg-amber-100 rounded-lg"
                        title="Dismiss notification"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            ))}
        </div>
    )
}
