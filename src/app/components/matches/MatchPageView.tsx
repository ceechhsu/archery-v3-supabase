'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Target, ArrowLeft, Mail, Clock, X, CheckCircle, Trophy, Hourglass } from 'lucide-react'
import { MatchComparisonCard } from '@/app/components/matches/MatchComparisonCard'
import { RealtimeMatchListener } from '@/app/components/matches/RealtimeMatchListener'
import { CopyButton } from '@/app/components/CopyButton'
import { cancelMatch, submitMatchScores } from '@/app/actions/matches'

export function MatchPageView({ 
    id, match, user, isChallenger, isOpponent, isPending, isActive, 
    isCompleted, isCancelled, invitation, inviteLink, userSession, 
    opponentSession, hasCreatedSession, hasSubmittedScores, opponentHasSubmitted 
}: any) {
    const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    const getFullPhotoUrl = (photoPath: string) => {
        if (!supabaseUrl || !photoPath) return null
        return `${supabaseUrl}/storage/v1/object/public/session_photos/${photoPath}`
    }

    return (
        <div className="min-h-screen bg-stone-50 p-4 relative">
            <RealtimeMatchListener matchId={id} />
            <div className="mx-auto max-w-2xl">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-full bg-white p-2 shadow-sm hover:bg-stone-100"
                    >
                        <ArrowLeft className="h-5 w-5 text-stone-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-stone-800">Match Details</h1>
                </div>

                {/* Status Card */}
                <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isPending ? 'bg-amber-100' :
                            isActive ? 'bg-forest/10' :
                                isCompleted ? 'bg-blue-100' :
                                    'bg-stone-100'
                            }`}>
                            <Target className={`h-6 w-6 ${isPending ? 'text-amber-600' :
                                isActive ? 'text-forest' :
                                    isCompleted ? 'text-blue-600' :
                                        'text-stone-500'
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-stone-500">Status</p>
                            <p className="text-lg font-semibold text-stone-800 capitalize">
                                {match.status === 'pending' ? 'Waiting for opponent' : match.status}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Configuration */}
                <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                    <h2 className="mb-4 text-lg font-semibold text-stone-800">Match Configuration</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg bg-stone-50 p-4 text-center">
                            <p className="text-2xl font-bold text-forest">{match.config_distance}m</p>
                            <p className="text-xs text-stone-500">Distance</p>
                        </div>
                        <div className="rounded-lg bg-stone-50 p-4 text-center">
                            <p className="text-2xl font-bold text-forest">{match.config_ends_count}</p>
                            <p className="text-xs text-stone-500">Ends</p>
                        </div>
                        <div className="rounded-lg bg-stone-50 p-4 text-center">
                            <p className="text-2xl font-bold text-forest">{match.config_arrows_per_end}</p>
                            <p className="text-xs text-stone-500">Arrows/End</p>
                        </div>
                    </div>
                </div>

                {/* Pending State - Show Invitation Link */}
                {isPending && isChallenger && inviteLink && (
                    <div className="mb-6 rounded-xl bg-amber-50 p-6 ring-1 ring-amber-200">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-800">
                            <Mail className="h-5 w-5" />
                            Share Invitation
                        </h2>
                        <p className="mb-4 text-sm text-amber-700">
                            Share this link with your opponent to invite them to the match:
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteLink}
                                className="flex-1 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm text-stone-600"
                            />
                            <CopyButton text={inviteLink} />
                        </div>

                        {invitation && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
                                <Clock className="h-4 w-4" />
                                Expires: {new Date(invitation.expires_at).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}

                {isPending && isOpponent && (
                    <div className="mb-6 rounded-xl bg-blue-50 p-6 ring-1 ring-blue-200">
                        <p className="text-blue-800">
                            You've been invited to this match! Check your email or ask the challenger for the invitation link.
                        </p>
                    </div>
                )}

                {/* Live Scores Display */}
                {(isActive || isCompleted) && (
                    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                        <h2 className="mb-4 text-lg font-semibold text-stone-800">Live Scores</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`rounded-lg p-4 text-center ${isChallenger ? 'bg-forest/10 ring-1 ring-forest/30' : 'bg-stone-50'}`}>
                                <p className="text-xs text-stone-500 uppercase tracking-wider">
                                    {isChallenger ? 'You (Challenger)' : 'Challenger'}
                                </p>
                                <p className="text-3xl font-bold text-forest">
                                    {match.challenger_total ?? '-'}
                                </p>
                                {match.challenger_x_count > 0 && (
                                    <p className="text-sm text-forest/70">
                                        {match.challenger_x_count} X's
                                    </p>
                                )}
                                {match.challenger_session_id && (
                                    <p className="text-xs text-green-600 mt-1">✓ Submitted</p>
                                )}
                            </div>
                            <div className={`rounded-lg p-4 text-center ${isOpponent ? 'bg-forest/10 ring-1 ring-forest/30' : 'bg-stone-50'}`}>
                                <p className="text-xs text-stone-500 uppercase tracking-wider">
                                    {isOpponent ? 'You (Opponent)' : 'Opponent'}
                                </p>
                                <p className="text-3xl font-bold text-forest">
                                    {match.opponent_total ?? '-'}
                                </p>
                                {match.opponent_x_count > 0 && (
                                    <p className="text-sm text-forest/70">
                                        {match.opponent_x_count} X's
                                    </p>
                                )}
                                {match.opponent_session_id && (
                                    <p className="text-xs text-green-600 mt-1">✓ Submitted</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Arrow-by-Arrow Breakdown (Completed Only) */}
                {isCompleted && (
                    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                        <h2 className="mb-4 text-lg font-semibold text-stone-800">Arrow Setup</h2>
                        <MatchComparisonCard
                            matchConfig={{
                                distance: match.config_distance,
                                endsCount: match.config_ends_count,
                                arrowsPerEnd: match.config_arrows_per_end
                            }}
                            isChallenger={isChallenger}
                            challengerSession={isChallenger ? userSession : opponentSession}
                            opponentSession={isChallenger ? opponentSession : userSession}
                            onPhotoClick={(path) => {
                                const url = getFullPhotoUrl(path)
                                if (url) setEnlargedPhoto(url)
                            }}
                        />
                    </div>
                )}

                {/* Active State - Show different UI based on progress */}
                {isActive && (
                    <div className="mb-6 space-y-4">
                        {/* Step 1: Need to create session */}
                        {!hasCreatedSession && (
                            <div className="rounded-xl bg-amber-50 p-6 ring-1 ring-amber-200">
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-800">
                                    <Target className="h-5 w-5" />
                                    Log Your Session
                                </h2>
                                <p className="mb-4 text-amber-700">
                                    Create a practice session to record your scores for this match.
                                </p>
                                <Link
                                    href={`/log?matchId=${id}`}
                                    className="inline-block rounded-lg bg-amber-600 px-6 py-2 text-white hover:bg-amber-700"
                                >
                                    Log Your Scores
                                </Link>
                            </div>
                        )}

                        {/* Step 2: Session created, need to submit */}
                        {hasCreatedSession && !hasSubmittedScores && (
                            <div className="rounded-xl bg-forest/5 p-6 ring-1 ring-forest/20">
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-forest">
                                    <CheckCircle className="h-5 w-5" />
                                    Ready to Submit
                                </h2>
                                <p className="mb-4 text-stone-600">
                                    You've logged your session. Submit your scores to complete your part of the match.
                                </p>
                                <form action={async () => {
                                    await submitMatchScores({ matchId: id })
                                    window.location.href = `/match/${id}?t=${Date.now()}`
                                }}>
                                    <button
                                        type="submit"
                                        className="inline-block rounded-lg bg-forest px-6 py-2 text-white hover:bg-forest/90"
                                    >
                                        Submit Scores
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 3: Submitted, waiting for opponent */}
                        {hasSubmittedScores && !opponentHasSubmitted && (
                            <div className="rounded-xl bg-blue-50 p-6 ring-1 ring-blue-200">
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-800">
                                    <Hourglass className="h-5 w-5" />
                                    Waiting for Opponent
                                </h2>
                                <p className="text-blue-700">
                                    You've submitted your scores! Waiting for your opponent to finish and submit their scores.
                                </p>
                            </div>
                        )}

                        {/* Step 4: Both submitted - redirect to show completed state */}
                        {hasSubmittedScores && opponentHasSubmitted && (
                            <div className="rounded-xl bg-green-50 p-6 ring-1 ring-green-200">
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-800">
                                    <Trophy className="h-5 w-5" />
                                    Match Complete!
                                </h2>
                                <p className="text-green-700 mb-4">
                                    Both players have submitted their scores.
                                </p>
                                <Link
                                    href={`/match/${id}?t=${Date.now()}`}
                                    className="inline-block rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
                                >
                                    View Results
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Already submitted scores reminder */}
                {hasSubmittedScores && userSession?.submitted_at && (
                    <div className="rounded-lg bg-stone-100 p-4 text-center text-sm text-stone-600">
                        ✓ You submitted your scores on {new Date(userSession.submitted_at).toLocaleString()}
                    </div>
                )}

                {/* Completed State - Winner Banner */}
                {isCompleted && (
                    <div className="mb-6">
                        {match.is_tie ? (
                            <div className="rounded-xl bg-amber-50 p-6 ring-1 ring-amber-200 text-center">
                                <p className="text-4xl mb-2">🤝</p>
                                <h2 className="text-xl font-bold text-amber-800">It's a Tie!</h2>
                                <p className="text-amber-700">Both players scored {match.challenger_total}</p>
                            </div>
                        ) : match.winner_user_id === user.id ? (
                            <div className="rounded-xl bg-green-50 p-6 ring-1 ring-green-200 text-center">
                                <p className="text-4xl mb-2">🏆</p>
                                <h2 className="text-xl font-bold text-green-800">You Won!</h2>
                                <p className="text-green-700">
                                    {isChallenger
                                        ? `${match.challenger_total} vs ${match.opponent_total}`
                                        : `${match.opponent_total} vs ${match.challenger_total}`
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-stone-50 p-6 ring-1 ring-stone-200 text-center">
                                <p className="text-4xl mb-2">😞</p>
                                <h2 className="text-xl font-bold text-stone-800">You Lost</h2>
                                <p className="text-stone-600">
                                    {isChallenger
                                        ? `${match.challenger_total} vs ${match.opponent_total}`
                                        : `${match.opponent_total} vs ${match.challenger_total}`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Cancel Button (Challenger only, not completed) */}
                {isChallenger && !isCompleted && !isCancelled && (
                    <form action={async () => {
                        await cancelMatch({ matchId: id })
                        window.location.href = '/'
                    }}>
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white py-3 font-medium text-red-600 hover:bg-red-50"
                        >
                            <X className="h-5 w-5" />
                            Cancel Match
                        </button>
                    </form>
                )}
            </div>

            {/* Enlarged Photo Modal */}
            {enlargedPhoto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setEnlargedPhoto(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setEnlargedPhoto(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-stone-300 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={enlargedPhoto}
                            alt="Enlarged end target"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
