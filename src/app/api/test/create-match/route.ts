import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createMatch } from '@/app/actions/matches'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await request.json()
        const { opponentEmail, config } = body

        if (!opponentEmail) {
            return NextResponse.json({ error: 'Missing opponentEmail' }, { status: 400 })
        }

        // Call the server action
        const result = await createMatch({ opponentEmail, config })

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Get the invitation ID
        const { data: invitation } = await supabase
            .from('match_invitations')
            .select('id')
            .eq('match_id', result.matchId)
            .single()

        return NextResponse.json({
            success: true,
            matchId: result.matchId,
            invitationId: invitation?.id,
        })

    } catch (err) {
        console.error('Error in test create-match API:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
