'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface RealtimeMatchListenerProps {
    matchId: string
}

export function RealtimeMatchListener({ matchId }: RealtimeMatchListenerProps) {
    useEffect(() => {
        const supabase = createClient()

        // Subscribe to changes on the matches table for this specific match
        const channel = supabase
            .channel(`match-${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${matchId}`,
                },
                (payload) => {
                    // When the match is updated, reload the page to show the new state
                    if (payload.new && payload.old) {
                        const oldData = payload.old as { 
                            status: string
                            challenger_total: number | null
                            opponent_total: number | null
                            opponent_session_id: string | null
                        }
                        const newData = payload.new as { 
                            status: string
                            challenger_total: number | null
                            opponent_total: number | null
                            opponent_session_id: string | null
                        }
                        
                        const oldStatus = oldData.status
                        const newStatus = newData.status
                        
                        // Reload when:
                        // 1. Status changes (pending -> accepted/active/completed)
                        // 2. Opponent submits their scores (total changes from null to a number)
                        // 3. Opponent starts their session (opponent_session_id changes)
                        const statusChanged = oldStatus !== newStatus
                        const opponentSubmitted = oldData.opponent_total === null && newData.opponent_total !== null
                        const challengerSubmitted = oldData.challenger_total === null && newData.challenger_total !== null
                        const opponentStartedSession = oldData.opponent_session_id === null && newData.opponent_session_id !== null
                        
                        if (
                            statusChanged ||
                            opponentSubmitted ||
                            challengerSubmitted ||
                            opponentStartedSession
                        ) {
                            window.location.reload()
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId])

    // This component doesn't render anything visible
    return null
}
