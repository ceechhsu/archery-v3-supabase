import { createClient } from '@/utils/supabase/server'
import { submitMatchScores } from '@/app/actions/matches'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { matchId } = await request.json()
        
        if (!matchId) {
            return NextResponse.json(
                { error: 'Match ID required' },
                { status: 400 }
            )
        }

        const result = await submitMatchScores({ matchId })
        
        return NextResponse.json(result)
    } catch (error) {
        console.error('Error submitting scores:', error)
        return NextResponse.json(
            { error: 'Failed to submit scores' },
            { status: 500 }
        )
    }
}
