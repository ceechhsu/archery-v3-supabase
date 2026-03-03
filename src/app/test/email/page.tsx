'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function TestEmailPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success?: boolean; message: string; invitationId?: string } | null>(null)
    const [invitations, setInvitations] = useState<Array<{ id: string; status: string; expires_at: string }>>([])

    const supabase = createClient()

    async function testCreateMatch() {
        setLoading(true)
        setResult(null)

        try {
            // Create a match via API
            const response = await fetch('/api/test/create-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opponentEmail: email,
                    config: { distance: 18, endsCount: 2, arrowsPerEnd: 5 }
                })
            })

            const data = await response.json()

            if (data.error) {
                setResult({ success: false, message: data.error })
            } else {
                setResult({ 
                    success: true, 
                    message: `Match created! Invitation ID: ${data.invitationId}`,
                    invitationId: data.invitationId
                })
                // Refresh invitations list
                fetchInvitations()
            }
        } catch (err) {
            setResult({ 
                success: false, 
                message: err instanceof Error ? err.message : 'Unknown error'
            })
        } finally {
            setLoading(false)
        }
    }

    async function fetchInvitations() {
        const { data, error } = await supabase
            .from('match_invitations')
            .select('id, status, expires_at')
            .order('created_at', { ascending: false })
            .limit(5)

        if (!error && data) {
            setInvitations(data)
        }
    }

    return (
        <div className="min-h-screen bg-stone-50 p-8">
            <div className="mx-auto max-w-2xl">
                <h1 className="mb-8 text-3xl font-bold text-stone-800">
                    📧 Phase 3: Email Integration Test
                </h1>

                {/* Test Create Match */}
                <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                    <h2 className="mb-4 text-lg font-semibold text-stone-700">
                        Test 1: Create Match (Triggers Email)
                    </h2>
                    <p className="mb-4 text-sm text-stone-600">
                        Enter your email to create a test match. This will test:
                        <br />• Match creation
                        <br />• Invitation creation
                        <br />• Edge Function invocation
                    </p>
                    
                    <div className="flex gap-3">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="flex-1 rounded-lg border border-stone-300 px-4 py-2 focus:border-forest focus:outline-none"
                        />
                        <button
                            onClick={testCreateMatch}
                            disabled={loading || !email}
                            className="rounded-lg bg-forest px-6 py-2 text-sm font-medium text-white hover:bg-forest/90 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Match'}
                        </button>
                    </div>

                    {result && (
                        <div className={`mt-4 rounded-lg p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                {result.success ? '✅ Success' : '❌ Error'}
                            </p>
                            <p className={`mt-1 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                {result.message}
                            </p>
                        </div>
                    )}
                </div>

                {/* Manual Test Links */}
                {result?.invitationId && (
                    <div className="mb-8 rounded-xl bg-blue-50 p-6 ring-1 ring-blue-200">
                        <h2 className="mb-4 text-lg font-semibold text-blue-800">
                            Test 2: Accept/Decline Links
                        </h2>
                        <p className="mb-4 text-sm text-blue-700">
                            Copy these links to test the invitation handler:
                        </p>
                        
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-medium text-blue-600">Accept Link:</p>
                                <code className="block break-all rounded bg-white p-2 text-xs">
                                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/match/invite?token=${result.invitationId}&action=accept`}
                                </code>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-blue-600">Decline Link:</p>
                                <code className="block break-all rounded bg-white p-2 text-xs">
                                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/match/invite?token=${result.invitationId}&action=decline`}
                                </code>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            <a
                                href={`/match/invite?token=${result.invitationId}&action=accept`}
                                className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest/90"
                            >
                                Test Accept
                            </a>
                            <a
                                href={`/match/invite?token=${result.invitationId}&action=decline`}
                                className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
                            >
                                Test Decline
                            </a>
                        </div>
                    </div>
                )}

                {/* Checklist */}
                <div className="rounded-xl bg-forest/5 p-6 ring-1 ring-forest/20">
                    <h2 className="mb-4 text-lg font-semibold text-forest">
                        ✅ Phase 3 Verification Checklist
                    </h2>
                    <ul className="space-y-3 text-sm text-stone-700">
                        <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Edge Function created: supabase/functions/send-match-invitation/index.ts</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>Invitation handler page: /match/invite</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>createMatch() invokes Edge Function</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span>Edge Function deployed: <strong>NOT YET</strong> (requires Supabase CLI)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span>SMTP configured: <strong>NOT YET</strong> (optional for testing)</span>
                        </li>
                    </ul>

                    <div className="mt-6 rounded-lg bg-white p-4">
                        <p className="text-sm font-medium text-stone-800">To enable actual emails:</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-stone-600">
                            <li>Install Supabase CLI: <code>npm install -g supabase</code></li>
                            <li>Login: <code>supabase login</code></li>
                            <li>Deploy function: <code>supabase functions deploy send-match-invitation</code></li>
                            <li>Configure SMTP in Supabase Dashboard → Auth → Email</li>
                        </ol>
                    </div>
                </div>

                <div className="mt-8">
                    <a
                        href="/test/matches"
                        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                        ← Back to Phase 2 Tests
                    </a>
                </div>
            </div>
        </div>
    )
}
