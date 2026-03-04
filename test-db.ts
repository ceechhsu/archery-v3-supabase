import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

console.log('Connecting to:', supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data: match, error: matchErr } = await supabase.from('matches').select('*').eq('status', 'completed').limit(1).single()
    if (!match) return console.log('No completed match:', matchErr)

    console.log('Testing match:', match.id)
    const { data: challengerSession, error: err1 } = await supabase
        .from('sessions')
        .select(`
            id, 
            ends ( 
                id, 
                end_index, 
                shots ( 
                    id, 
                    score 
                ) 
            )
        `)
        .eq('match_id', match.id)
        .eq('user_id', match.challenger_user_id)
        .single()

    console.log('Challenger Ends:', challengerSession?.ends?.length || 0, err1?.message || '')

    const { data: oppSession, error: err2 } = await supabase
        .from('sessions')
        .select(`
            id, 
            ends ( 
                id, 
                end_index, 
                shots ( 
                    id, 
                    score 
                ) 
            )
        `)
        .eq('match_id', match.id)
        .eq('user_id', match.opponent_user_id)
        .single()

    console.log('Opponent Ends:', oppSession?.ends?.length || 0, err2?.message || '')
}
check()
