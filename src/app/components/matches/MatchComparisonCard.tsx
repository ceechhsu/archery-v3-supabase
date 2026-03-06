'use client'

import React from 'react'

// Types based on the queried data
type Shot = {
    score: number | null
    is_x: boolean | null
    is_m: boolean | null
    shot_index: number
}

type End = {
    id: string
    end_index: number
    shots: Shot[]
}

type SessionData = {
    id: string
    is_submitted_to_match: boolean
    ends?: End[] | null
} | null

interface MatchComparisonCardProps {
    matchConfig: {
        distance: number
        endsCount: number
        arrowsPerEnd: number
    }
    isChallenger: boolean
    challengerSession: SessionData
    opponentSession: SessionData
}

// Shot badge color based on archery target scoring
const getShotBadgeColor = (shot: Shot): string => {
    if (shot.is_x || shot.score === 10) return 'bg-[#ffe142] text-yellow-950 border-[#e6c83b]'
    if (shot.score === 9) return 'bg-[#ffe142] text-yellow-950 border-[#e6c83b]'
    if (shot.score === 8 || shot.score === 7) return 'bg-[#f03224] text-white border-[#d92d20]'
    if (shot.score === 6 || shot.score === 5) return 'bg-[#3eb6e6] text-white border-[#2d9fd1]'
    if (shot.score === 4 || shot.score === 3) return 'bg-[#1b1918] text-white border-[#000000]'
    if (shot.score === 2 || shot.score === 1) return 'bg-white text-stone-800 border-stone-300'
    if (shot.is_m || shot.score === 0) return 'bg-stone-200 text-stone-500 border-stone-300'
    return 'bg-stone-100 text-stone-400 border-stone-200'
}

const formatShotValue = (shot: Shot): string => {
    if (shot.is_x) return 'X'
    if (shot.is_m || shot.score === 0) return 'M'
    return shot.score?.toString() || '-'
}

export function MatchComparisonCard({ matchConfig, isChallenger, challengerSession, opponentSession }: MatchComparisonCardProps) {
    // Generate an array of end indices: [1, 2, ..., config_ends_count]
    const endIndices = Array.from({ length: matchConfig.endsCount }, (_, i) => i + 1)

    // Helper to get a specific player's end by end_index
    const getPlayerEnd = (session: SessionData, index: number) => {
        // Database end_index is 0-indexed, but this map receives 1-indexed values
        return session?.ends?.find(e => e.end_index === index - 1)
    }

    // Helper to calculate total for an end (accounting for X = 10 points, M = 0)
    const calculateEndTotal = (end?: End) => {
        if (!end || !end.shots) return 0
        return end.shots.reduce((sum, shot) => {
            if (shot.is_m) return sum // Miss = 0
            if (shot.is_x) return sum + 10 // X = 10 points
            return sum + (shot.score || 0)
        }, 0)
    }

    return (
        <div className="space-y-6">
            {endIndices.map((endIdx) => {
                const challengerEnd = getPlayerEnd(challengerSession, endIdx)
                const opponentEnd = getPlayerEnd(opponentSession, endIdx)

                const challengerTotal = calculateEndTotal(challengerEnd)
                const opponentTotal = calculateEndTotal(opponentEnd)

                // Define UI order: "You" first, "Opponent" second
                const userPerspective = isChallenger ?
                    { label: 'You', data: challengerEnd, total: challengerTotal, isWinner: challengerTotal > opponentTotal } :
                    { label: 'You', data: opponentEnd, total: opponentTotal, isWinner: opponentTotal > challengerTotal }

                const opponentPerspective = isChallenger ?
                    { label: 'Opp.', data: opponentEnd, total: opponentTotal, isWinner: opponentTotal > challengerTotal } :
                    { label: 'Opp.', data: challengerEnd, total: challengerTotal, isWinner: challengerTotal > opponentTotal }

                return (
                    <div key={`end-${endIdx}`} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 pb-2">
                        {/* Header for the End */}
                        <div className="bg-stone-50 border-b border-stone-100 p-2">
                            <h3 className="text-sm font-semibold text-stone-600 tracking-wider">END {endIdx}</h3>
                        </div>

                        {/* Rows: Stacked to fit mobile screens comfortably */}
                        <div className="flex flex-col">
                            {/* You Row */}
                            <div className={`flex items-center justify-between p-3 ${userPerspective.isWinner ? 'bg-forest/5' : ''}`}>
                                <div className="w-12 text-sm font-medium text-stone-700">{userPerspective.label}</div>
                                <div className="flex items-center gap-1.5 flex-1 justify-center">
                                    {/* Map actual shots, or blank placeholders, up to arrowsPerEnd */}
                                    {Array.from({ length: matchConfig.arrowsPerEnd }, (_, shotIdx) => {
                                        // Database shot_index is 0-indexed
                                        const shot = userPerspective.data?.shots?.find(s => s.shot_index === shotIdx)

                                        if (!shot) {
                                            return <div key={`empty-${shotIdx}`} className="h-8 w-8 rounded-full border border-stone-200 bg-stone-50" />
                                        }

                                        return (
                                            <div
                                                key={`shot-${shotIdx}`}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${getShotBadgeColor(shot)}`}
                                            >
                                                {formatShotValue(shot)}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="w-12 text-right">
                                    <span className="text-sm bg-stone-100 text-stone-700 px-2 py-1 rounded inline-block min-w-8 text-center font-bold">
                                        {userPerspective.total}
                                    </span>
                                </div>
                            </div>

                            {/* Divider Between Rows */}
                            <div className="h-px w-full bg-stone-100" />

                            {/* Opponent Row */}
                            <div className={`flex items-center justify-between p-3 ${opponentPerspective.isWinner ? 'bg-forest/5' : ''}`}>
                                <div className="w-12 text-sm font-medium text-stone-500">{opponentPerspective.label}</div>
                                <div className="flex items-center gap-1.5 flex-1 justify-center">
                                    {Array.from({ length: matchConfig.arrowsPerEnd }, (_, shotIdx) => {
                                        // Database shot_index is 0-indexed
                                        const shot = opponentPerspective.data?.shots?.find(s => s.shot_index === shotIdx)

                                        if (!shot) {
                                            return <div key={`empty-${shotIdx}`} className="h-8 w-8 rounded-full border border-stone-200 bg-stone-50" />
                                        }

                                        return (
                                            <div
                                                key={`shot-${shotIdx}`}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold opacity-90 ${getShotBadgeColor(shot)}`}
                                            >
                                                {formatShotValue(shot)}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="w-12 text-right">
                                    <span className="text-sm border border-stone-200 text-stone-600 px-2 py-1 rounded inline-block min-w-8 text-center font-medium">
                                        {opponentPerspective.total}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
