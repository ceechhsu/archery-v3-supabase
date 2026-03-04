'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AcceptDebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]}: ${msg}`])
  }

  const testAcceptFlow = async () => {
    setLoading(true)
    setLogs([])
    
    try {
      const supabase = createClient()
      
      // Step 1: Get current user
      addLog('Step 1: Getting current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        addLog(`ERROR: Not authenticated - ${userError?.message}`)
        return
      }
      addLog(`User: ${user.id} (${user.email})`)
      
      // Step 2: Find pending invitations for this user
      addLog('Step 2: Finding pending invitations...')
      const { data: invitations, error: inviteError } = await supabase
        .from('match_invitations')
        .select('*')
        .eq('invitee_email', user.email?.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
      
      if (inviteError) {
        addLog(`ERROR fetching invitations: ${inviteError.message}`)
        return
      }
      
      if (!invitations || invitations.length === 0) {
        addLog('No pending invitations found')
        return
      }
      
      addLog(`Found ${invitations.length} pending invitation(s)`)
      const invitation = invitations[0]
      addLog(`Using invitation: ${invitation.id}`)
      addLog(`Match ID: ${invitation.match_id}`)
      
      // Step 3: Check the match before update
      addLog('Step 3: Checking match before update...')
      const { data: matchBefore, error: matchBeforeError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', invitation.match_id)
        .single()
      
      if (matchBeforeError) {
        addLog(`ERROR fetching match: ${matchBeforeError.message}`)
        return
      }
      
      addLog(`Match status before: ${matchBefore.status}`)
      addLog(`Opponent before: ${matchBefore.opponent_user_id || 'NULL'}`)
      
      // Step 4: Update the invitation
      addLog('Step 4: Updating invitation...')
      const now = new Date().toISOString()
      const { error: inviteUpdateError } = await supabase
        .from('match_invitations')
        .update({
          status: 'accepted',
          invitee_user_id: user.id,
          responded_at: now,
        })
        .eq('id', invitation.id)
      
      if (inviteUpdateError) {
        addLog(`ERROR updating invitation: ${inviteUpdateError.message}`)
        return
      }
      addLog('Invitation updated successfully')
      
      // Step 5: Update the match
      addLog('Step 5: Updating match...')
      const { data: updatedMatch, error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          opponent_user_id: user.id,
          status: 'accepted',
          accepted_at: now,
          updated_at: now,
        })
        .eq('id', invitation.match_id)
        .select()
        .single()
      
      if (matchUpdateError) {
        addLog(`ERROR updating match: ${matchUpdateError.message}`)
        addLog(`Error code: ${matchUpdateError.code}`)
        addLog(`Error details: ${JSON.stringify(matchUpdateError)}`)
        return
      }
      
      if (!updatedMatch) {
        addLog('ERROR: Match update returned no data - possible RLS issue or match not found')
        
        // Try to check if match exists
        const { data: checkMatch } = await supabase
          .from('matches')
          .select('id, status')
          .eq('id', invitation.match_id)
          .single()
        
        if (!checkMatch) {
          addLog('Match does not exist or is not visible to current user')
        } else {
          addLog(`Match exists with status: ${checkMatch.status}`)
        }
        return
      }
      
      addLog('Match updated successfully!')
      addLog(`New status: ${updatedMatch.status}`)
      addLog(`New opponent: ${updatedMatch.opponent_user_id}`)
      
    } catch (err) {
      addLog(`UNEXPECTED ERROR: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => setLogs([])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Accept Invitation Debug Page</h1>
      
      <div className="mb-6 space-x-4">
        <button
          onClick={testAcceptFlow}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Accept Flow'}
        </button>
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Logs
        </button>
      </div>
      
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500">Click "Test Accept Flow" to start debugging...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={log.includes('ERROR') ? 'text-red-400' : ''}>
              {log}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <h2 className="font-bold text-gray-800">Instructions:</h2>
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>Create a new match invitation from another account</li>
          <li>Log in as the invitee on this browser</li>
          <li>Click "Test Accept Flow" to see detailed debug logs</li>
        </ol>
      </div>
    </div>
  )
}
