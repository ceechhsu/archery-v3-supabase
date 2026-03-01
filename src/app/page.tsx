import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from './actions/auth'
import { DashboardAnalytics } from './components/DashboardAnalytics'
import { DashboardClient } from './components/DashboardClient'

export default async function Home() {
  const supabase = await createClient()

  // Verify auth safely
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Extract metadata for the Welcome header
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Archer'
  const firstName = fullName.split(' ')[0]
  const avatarUrl = user.user_metadata?.avatar_url || ''

  // Fetch recent sessions
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      `
      id,
      session_date,
      notes,
      ends (
        id,
        photo_url,
        shots (
          score
        )
      )
    `
    )
    .order('session_date', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error.message)
  }

  return (
    <div className="min-h-screen bg-zinc-50 ">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md  ">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900 hover:text-zinc-600 transition-colors">
              ArrowLog
            </Link>
            <div className="flex items-center gap-2 border-l border-zinc-300 pl-3">
              <span className="text-sm font-medium text-zinc-600 hidden sm:inline-block">Welcome, {firstName}</span>
              {avatarUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt={firstName} className="h-7 w-7 rounded-full shadow-sm" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900  :text-zinc-50"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">

        <DashboardAnalytics userId={user.id} />

        <DashboardClient initialSessions={sessions || []} />
      </main>
    </div>
  )
}
