// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { acceptInvitation, declineInvitation } from '@/app/actions/matches'

interface InvitePageProps {
    searchParams: Promise<{
        token?: string
        action?: 'accept' | 'decline'
    }>
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
    const params = await searchParams
    const { token, action } = params

    // Validate required parameters
    if (!token || !action) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <span className="text-2xl">❌</span>
                        </div>
                        <h1 className="mb-2 text-xl font-bold text-stone-800">
                            Invalid Invitation Link
                        </h1>
                        <p className="text-stone-600">
                            This invitation link is missing required information.
                        </p>
                        <a
                            href="/"
                            className="mt-6 inline-block rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If not logged in, redirect to login with return URL
    if (!user) {
        const returnUrl = `/match/invite?token=${token}&action=${action}`
        redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    }

    // Find the invitation by token (invitation ID)
    const { data: invitation, error: inviteError } = await supabase
        .from('match_invitations')
        .select('*, match:matches(*)')
        .eq('id', token)
        .eq('status', 'pending')
        .single()

    if (inviteError || !invitation) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h1 className="mb-2 text-xl font-bold text-stone-800">
                            Invitation Not Found
                        </h1>
                        <p className="text-stone-600">
                            This invitation may have expired, been declined, or already accepted.
                        </p>
                        <a
                            href="/"
                            className="mt-6 inline-block rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Verify the invitation is for this user
    const userEmail = user.email?.toLowerCase()
    if (invitation.invitee_email !== userEmail) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <span className="text-2xl">🔒</span>
                        </div>
                        <h1 className="mb-2 text-xl font-bold text-stone-800">
                            Wrong Account
                        </h1>
                        <p className="text-stone-600">
                            This invitation was sent to {invitation.invitee_email}, but you are logged in as {userEmail}.
                        </p>
                        <a
                            href="/"
                            className="mt-6 inline-block rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                            <span className="text-2xl">⏰</span>
                        </div>
                        <h1 className="mb-2 text-xl font-bold text-stone-800">
                            Invitation Expired
                        </h1>
                        <p className="text-stone-600">
                            This invitation has expired. Invitations are valid for 1 hour.
                        </p>
                        <a
                            href="/"
                            className="mt-6 inline-block rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Perform the action
    if (action === 'accept') {
        const result = await acceptInvitation({ invitationId: token })
        
        if (result.error) {
            console.error('Accept invitation error:', result.error)
            return (
                <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
                        <div className="text-center">
                            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <span className="text-2xl">❌</span>
                            </div>
                            <h1 className="mb-2 text-xl font-bold text-stone-800">
                                Could Not Accept
                            </h1>
                            <p className="text-stone-600">{result.error}</p>
                            <a
                                href="/"
                                className="mt-6 inline-block rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90"
                            >
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            )
        }

        // Success - redirect to dashboard with success message and cache bust
        console.log('Invitation accepted successfully, matchId:', result.matchId)
        const cacheBust = Date.now()
        redirect(`/?matchAccepted=true&t=${cacheBust}`)
    } else {
        // Decline
        const result = await declineInvitation({ invitationId: token })
        
        if (result.error) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
                        <div className="text-center">
                            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <span className="text-2xl">❌</span>
                            </div>
                            <h1 className="mb-2 text-xl font-bold text-stone-800">
                                Could Not Decline
                            </h1>
                            <p className="text-stone-600">{result.error}</p>
                            <a
                                href="/"
                                className="mt-6 inline-block rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90"
                            >
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            )
        }

        // Success - redirect to dashboard with cache bust
        redirect(`/?matchDeclined=true&t=${Date.now()}`)
    }
}
