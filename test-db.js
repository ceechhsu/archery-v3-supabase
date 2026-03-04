const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('Fetching raw matches...');
    const { data: matches } = await supabase.from('matches').select('id, status, challenger_user_id, opponent_user_id, challenger_session_id, opponent_session_id').eq('status', 'completed');
    
    if (!matches || matches.length === 0) {
        console.log('No completed matches found.');
        return;
    }
    
    const match = matches[0];
    console.log('Checking match:', match.id);
    
    const { data: cSession } = await supabase.from('sessions').select('id, user_id').eq('id', match.challenger_session_id).single();
    const { data: cEnds } = await supabase.from('ends').select('id').eq('session_id', match.challenger_session_id);
    console.log('Challenger session ID:', cSession?.id, 'Ends count:', cEnds?.length || 0);

    const { data: oSession } = await supabase.from('sessions').select('id, user_id').eq('id', match.opponent_session_id).single();
    const { data: oEnds } = await supabase.from('ends').select('id').eq('session_id', match.opponent_session_id);
    console.log('Opponent session ID:', oSession?.id, 'Ends count:', oEnds?.length || 0);
    
    console.log('--- Now trying the nested query using the service role bypass ---');
    const { data: nestedChallenger } = await supabase.from('sessions').select('id, ends ( id )').eq('id', match.challenger_session_id).single()
    const { data: nestedOpponent } = await supabase.from('sessions').select('id, ends ( id )').eq('id', match.opponent_session_id).single()
    
    console.log('Nested Challenger ends:', nestedChallenger?.ends?.length || 0)
    console.log('Nested Opponent ends:', nestedOpponent?.ends?.length || 0)
}
check();
