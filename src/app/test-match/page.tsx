import React from 'react'
import { MatchComparisonCard } from '@/app/components/matches/MatchComparisonCard'

export default function TestMatchPage() {
    const dummyMatchConfig = {
        distance: 18,
        endsCount: 2,
        arrowsPerEnd: 3
    }

    const dummyChallengerSession = {
        id: 'session-user',
        is_submitted_to_match: true,
        ends: [
            {
                id: 'end-1-user',
                end_index: 1,
                shots: [
                    { score: 10, is_x: true, is_m: false, shot_index: 1 },
                    { score: 9, is_x: false, is_m: false, shot_index: 2 },
                    { score: 8, is_x: false, is_m: false, shot_index: 3 }
                ]
            },
            {
                id: 'end-2-user',
                end_index: 2,
                shots: [
                    { score: 9, is_x: false, is_m: false, shot_index: 1 },
                    { score: 9, is_x: false, is_m: false, shot_index: 2 },
                    { score: 7, is_x: false, is_m: false, shot_index: 3 }
                ]
            }
        ]
    }

    const dummyOpponentSession = {
        id: 'session-opp',
        is_submitted_to_match: true,
        ends: [
            {
                id: 'end-1-opp',
                end_index: 1,
                shots: [
                    { score: 10, is_x: false, is_m: false, shot_index: 1 },
                    { score: 10, is_x: false, is_m: false, shot_index: 2 },
                    { score: 9, is_x: false, is_m: false, shot_index: 3 }
                ]
            },
            {
                id: 'end-2-opp',
                end_index: 2,
                shots: [
                    { score: 8, is_x: false, is_m: false, shot_index: 1 },
                    { score: 8, is_x: false, is_m: false, shot_index: 2 },
                    { score: 0, is_x: false, is_m: true, shot_index: 3 }
                ]
            }
        ]
    }

    return (
        <div className="min-h-screen bg-stone-50 p-4">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-2xl font-bold mb-4">UI Test Page: Arrow Setup</h1>

                <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                    <MatchComparisonCard
                        matchConfig={dummyMatchConfig}
                        isChallenger={true}
                        challengerSession={dummyChallengerSession}
                        opponentSession={dummyOpponentSession}
                    />
                </div>
            </div>
        </div>
    )
}
