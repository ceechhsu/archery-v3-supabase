'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface RealtimeInvitationsListenerProps {
    userEmail: string
}

export function RealtimeInvitationsListener({ userEmail }: RealtimeInvitationsListenerProps) {
    useEffect(() => {
        if (!userEmail) return

        const supabase = createClient()

        // Subscribe to new invitations for this user
        const channel = supabase
            .channel(`invitations-${userEmail}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_invitations',
                    filter: `invitee_email=eq.${userEmail.toLowerCase()}`,
                },
                (payload) => {
                    // When a new invitation is inserted, reload the page
                    const newInvitation = payload.new as { status: string; expires_at: string }
                    
                    // Only reload if it's a pending invitation that hasn't expired
                    if (
                        newInvitation.status === 'pending' &&
                        new Date(newInvitation.expires_at) > new Date()
                    ) {
                        window.location.reload()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userEmail])

    // This component doesn't render anything visible
    return null
}
