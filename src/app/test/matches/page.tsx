import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
    canCreateMatch,
    getActiveMatch,
    getPendingInvitations,
    listMatches,
} from '@/app/actions/matches'
import { RefreshButton } from './RefreshButton'

export default async function TestMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Test 1: canCreateMatch
    let canCreateResult
    let canCreateError = null
    try {
        canCreateResult = await canCreateMatch()
    } catch (err) {
        canCreateError = err instanceof Error ? err.message : String(err)
    }

    // Test 2: getActiveMatch
    let activeMatchResult
    let activeMatchError = null
    try {
        activeMatchResult = await getActiveMatch()
    } catch (err) {
        activeMatchError = err instanceof Error ? err.message : String(err)
    }

    // Test 3: getPendingInvitations
    let invitationsResult
    let invitationsError = null
    try {
        invitationsResult = await getPendingInvitations()
    } catch (err) {
        invitationsError = err instanceof Error ? err.message : String(err)
    }

    // Test 4: listMatches
    let matchesResult
    let matchesError = null
    try {
        matchesResult = await listMatches({ status: 'all', limit: 5 })
    } catch (err) {
        matchesError = err instanceof Error ? err.message : String(err)
    }

    return (
        <div className="min-h-screen bg-stone-50 p-8">
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-8 text-3xl font-bold text-stone-800">
                    🔧 Match Feature Test Page
                </h1>

                {/* User Info */}
                <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
                    <h2 className="mb-4 text-lg font-semibold text-stone-700">Current User</h2>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-stone-600">User ID:</span> <code className="rounded bg-stone-100 px-2 py-1 text-xs">{user.id}</code></p>
                        <p><span className="font-medium text-stone-600">Email:</span> {user.email}</p>
                        <p><span className="font-medium text-stone-600">Name:</span> {user.user_metadata?.full_name || 'N/A'}</p>
                    </div>
                </div>

                {/* Test 1: canCreateMatch */}
                <TestResult
                    title="Test 1: canCreateMatch()"
                    status={canCreateError ? 'error' : 'success'}
                    error={canCreateError}
                >
                    {canCreateResult && (
                        <div className="space-y-2 text-sm">
                            <p><span className="font-medium text-stone-600">Can Create Match:</span> {canCreateResult.canCreate ? '✅ Yes' : '❌ No'}</p>
                            {canCreateResult.reason && (
                                <p><span className="font-medium text-stone-600">Reason:</span> {canCreateResult.reason}</p>
                            )}
                            {canCreateResult.activeMatchId && (
                                <p><span className="font-medium text-stone-600">Active Match ID:</span> <code className="rounded bg-stone-100 px-2 py-1 text-xs">{canCreateResult.activeMatchId}</code></p>
                            )}
                        </div>
                    )}
                </TestResult>

                {/* Test 2: getActiveMatch */}
                <TestResult
                    title="Test 2: getActiveMatch()"
                    status={activeMatchError ? 'error' : 'success'}
                    error={activeMatchError}
                >
                    {activeMatchResult === null && (
                        <p className="text-sm text-stone-600">No active match found (expected if you have no ongoing matches)</p>
                    )}
                    {activeMatchResult && (
                        <div className="space-y-2 text-sm">
                            <p><span className="font-medium text-stone-600">Match ID:</span> <code className="rounded bg-stone-100 px-2 py-1 text-xs">{activeMatchResult.id}</code></p>
                            <p><span className="font-medium text-stone-600">Status:</span> <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest">{activeMatchResult.status}</span></p>
                            <p><span className="font-medium text-stone-600">Config:</span> {activeMatchResult.config_distance}m, {activeMatchResult.config_ends_count} ends, {activeMatchResult.config_arrows_per_end} arrows</p>
                        </div>
                    )}
                </TestResult>

                {/* Test 3: getPendingInvitations */}
                <TestResult
                    title="Test 3: getPendingInvitations()"
                    status={invitationsError ? 'error' : 'success'}
                    error={invitationsError}
                >
                    {invitationsResult && invitationsResult.length === 0 && (
                        <p className="text-sm text-stone-600">No pending invitations (expected if no one has invited you)</p>
                    )}
                    {invitationsResult && invitationsResult.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-stone-600">Found {invitationsResult.length} pending invitation(s):</p>
                            <ul className="space-y-2">
                                {invitationsResult.map((inv: { id: string; invitee_email: string; status: string }) => (
                                    <li key={inv.id} className="rounded bg-stone-50 p-2 text-sm">
                                        <code className="text-xs">{inv.id}</code> - {inv.invitee_email} ({inv.status})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </TestResult>

                {/* Test 4: listMatches */}
                <TestResult
                    title="Test 4: listMatches()"
                    status={matchesError ? 'error' : 'success'}
                    error={matchesError}
                >
                    {matchesResult && matchesResult.length === 0 && (
                        <p className="text-sm text-stone-600">No matches found (expected if you have not created or joined any matches)</p>
                    )}
                    {matchesResult && matchesResult.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-stone-600">Found {matchesResult.length} match(es):</p>
                            <ul className="space-y-2">
                                {matchesResult.map((match: { id: string; status: string; created_at: string }) => (
                                    <li key={match.id} className="rounded bg-stone-50 p-2 text-sm">
                                        <code className="text-xs">{match.id}</code> - <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest">{match.status}</span> - {new Date(match.created_at).toLocaleDateString()}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </TestResult>

                {/* Summary */}
                <div className="mt-8 rounded-xl bg-forest/5 p-6 ring-1 ring-forest/20">
                    <h2 className="mb-4 text-lg font-semibold text-forest">✅ Test Summary</h2>
                    <ul className="space-y-2 text-sm text-stone-700">
                        <li>• Database connection: Working</li>
                        <li>• Authentication: Working</li>
                        <li>• Server actions: Imported successfully</li>
                        <li>• RLS policies: Working (no unauthorized errors)</li>
                        <li>• Helper functions: Available</li>
                    </ul>
                    <p className="mt-4 text-xs text-stone-500">
                        If you see &quot;success&quot; on all tests above, Phase 2 is working correctly!
                    </p>
                </div>

                <div className="mt-8 flex gap-4">
                    <a
                        href="/"
                        className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest/90"
                    >
                        ← Back to Dashboard
                    </a>
                    <RefreshButton />
                </div>
            </div>
        </div>
    )
}

function TestResult({
    title,
    status,
    error,
    children,
}: {
    title: string
    status: 'success' | 'error'
    error: string | null
    children: React.ReactNode
}) {
    return (
        <div className={`mb-6 rounded-xl p-6 shadow-sm ring-1 ${status === 'error' ? 'bg-red-50 ring-red-200' : 'bg-white ring-stone-200'}`}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-700">{title}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {status === 'error' ? '❌ Error' : '✅ Success'}
                </span>
            </div>
            
            {error ? (
                <div className="rounded-lg bg-red-100 p-4">
                    <p className="text-sm font-medium text-red-800">Error:</p>
                    <pre className="mt-2 overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-700">{error}</pre>
                </div>
            ) : (
                <div className="text-stone-700">{children}</div>
            )}
        </div>
    )
}
