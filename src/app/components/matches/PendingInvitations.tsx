'use client'

import { useState } from 'react'
import { acceptInvitation, declineInvitation } from '@/app/actions/matches'
import { Mail, Check, X } from 'lucide-react'

interface Invitation {
    id: string
    invitee_email: string
    status: string
    expires_at: string
    match?: {
        id: string
        config_distance: number
        config_ends_count: number
        config_arrows_per_end: number
        challenger_user_id: string
    } | null
}

interface PendingInvitationsProps {
    invitations: Invitation[]
}

export function PendingInvitations({ invitations }: PendingInvitationsProps) {
    const [processing, setProcessing] = useState<string | null>(null)
    const [message, setMessage] = useState('')

    if (!invitations || invitations.length === 0) return null

    async function handleAccept(invitationId: string) {
        setProcessing(invitationId)
        setMessage('')

        const result = await acceptInvitation({ invitationId })

        if (result.error) {
            setMessage(result.error)
        } else {
            window.location.reload()
        }

        setProcessing(null)
    }

    async function handleDecline(invitationId: string) {
        setProcessing(invitationId)
        setMessage('')

        const result = await declineInvitation({ invitationId })

        if (result.error) {
            setMessage(result.error)
        } else {
            window.location.reload()
        }

        setProcessing(null)
    }

    return (
        <div className="mb-6 space-y-3">
            {message && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {message}
                </div>
            )}

            {invitations.map((invitation) => (
                <div
                    key={invitation.id}
                    className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Mail className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-stone-800">
                                Match Invitation
                            </p>
                            <p className="text-sm text-stone-600">
                                Someone invited you to a {invitation.match?.config_distance}m match
                                ({invitation.match?.config_ends_count} ends, {invitation.match?.config_arrows_per_end} arrows)
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                                Expires: {new Date(invitation.expires_at).toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAccept(invitation.id)}
                                disabled={processing === invitation.id}
                                className="flex items-center gap-1 rounded-lg bg-forest px-3 py-2 text-sm font-medium text-white hover:bg-forest/90 disabled:opacity-50"
                            >
                                <Check className="h-4 w-4" />
                                Accept
                            </button>
                            <button
                                onClick={() => handleDecline(invitation.id)}
                                disabled={processing === invitation.id}
                                className="flex items-center gap-1 rounded-lg bg-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300 disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
