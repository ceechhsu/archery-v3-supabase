import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cancelMatch } from '@/app/actions/matches'
import { Target, ArrowLeft, Mail, Clock, X, Copy, Check } from 'lucide-react'

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

    // Build invitation link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const inviteLink = invitation 
        ? `${siteUrl}/match/invite?token=${invitation.id}&action=accept`
        : null

    return (
        <div className="min-h-screen bg-stone-50 p-4">
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
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            isPending ? 'bg-amber-100' :
                            isActive ? 'bg-forest/10' :
                            isCompleted ? 'bg-blue-100' :
                            'bg-stone-100'
                        }`}>
                            <Target className={`h-6 w-6 ${
                                isPending ? 'text-amber-600' :
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
                            You&apos;ve been invited to this match! Check your email or ask the challenger for the invitation link.
                        </p>
                    </div>
                )}

                {/* Active State */}
                {isActive && (
                    <div className="mb-6 rounded-xl bg-forest/5 p-6 ring-1 ring-forest/20">
                        <h2 className="mb-4 text-lg font-semibold text-forest">Match in Progress</h2>
                        <p className="mb-4 text-stone-600">
                            Both players should log their scores. Once both submit, the winner will be determined.
                        </p>
                        <Link
                            href="/log"
                            className="inline-block rounded-lg bg-forest px-6 py-2 text-white hover:bg-forest/90"
                        >
                            Log Your Scores
                        </Link>
                    </div>
                )}

                {/* Completed State */}
                {isCompleted && (
                    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                        <h2 className="mb-4 text-lg font-semibold text-stone-800">Match Results</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-stone-50 p-4 text-center">
                                <p className="text-xs text-stone-500">Challenger</p>
                                <p className="text-2xl font-bold text-stone-800">{match.challenger_total ?? '-'}</p>
                            </div>
                            <div className="rounded-lg bg-stone-50 p-4 text-center">
                                <p className="text-xs text-stone-500">Opponent</p>
                                <p className="text-2xl font-bold text-stone-800">{match.opponent_total ?? '-'}</p>
                            </div>
                        </div>
                        {match.is_tie ? (
                            <p className="mt-4 text-center font-medium text-stone-600">🤝 It&apos;s a Tie!</p>
                        ) : match.winner_user_id === user.id ? (
                            <p className="mt-4 text-center font-medium text-forest">🏆 You Won!</p>
                        ) : (
                            <p className="mt-4 text-center font-medium text-stone-600">😞 You Lost</p>
                        )}
                    </div>
                )}

                {/* Cancel Button (Challenger only, not completed) */}
                {isChallenger && !isCompleted && !isCancelled && (
                    <form action={async () => {
                        'use server'
                        await cancelMatch({ matchId: id })
                        redirect('/')
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
        </div>
    )
}

// Copy button component
function CopyButton({ text }: { text: string }) {
    return (
        <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="rounded-lg bg-amber-200 px-4 py-2 text-amber-800 hover:bg-amber-300"
            title="Copy to clipboard"
        >
            <Copy className="h-5 w-5" />
        </button>
    )
}
