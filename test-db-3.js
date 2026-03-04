const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('Fetching the problematic match...');
    const { data: match } = await supabase.from('matches')
      .select('id, status, challenger_user_id, opponent_user_id, challenger_session_id, opponent_session_id')
      .eq('id', 'eefa585c-6aee-4b2b-a1f1-52bda70494e6')
      .single();
    
    if (!match) {
        console.log('Match not found.');
        return;
    }
    
    console.log('Match Details:', match);
    
    console.log('Fetching Challenger Session (ID:', match.challenger_session_id, ')');
    const { data: cSession } = await supabase.from('sessions')
        .select(`id, is_submitted_to_match, ends(id, end_index, shots(score))`)
        .eq('id', match.challenger_session_id)
        .single();
    console.log('Challenger Ends:', JSON.stringify(cSession?.ends, null, 2));

    console.log('Fetching Opponent Session (ID:', match.opponent_session_id, ')');
    const { data: oSession } = await supabase.from('sessions')
        .select(`id, is_submitted_to_match, ends(id, end_index, shots(score))`)
        .eq('id', match.opponent_session_id)
        .single();
    console.log('Opponent Ends:', JSON.stringify(oSession?.ends, null, 2));
}
check();
