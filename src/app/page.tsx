import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from './actions/auth'
import { DashboardAnalytics } from './components/DashboardAnalytics'

export default async function Home() {
  const supabase = await createClient()

  // Verify auth safely
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 ">
            Archery Log
          </h1>
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

        <Link
          href="/log"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-4 text-base font-semibold text-white shadow-sm hover:bg-zinc-800   :bg-zinc-200 transition-colors"
        >
          + Log New Session
        </Link>

        <div className="mb-0 flex items-center justify-between mt-8 mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 ">
            Recent Sessions
          </h2>
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((session) => {
              // Calculate statistics for the card
              let totalArrows = 0
              let totalScore = 0
              session.ends?.forEach((end) => {
                end.shots?.forEach((shot) => {
                  totalArrows++
                  totalScore += shot.score
                })
              })

              const avgScore = totalArrows > 0 ? (totalScore / totalArrows).toFixed(1) : '0'
              const dateObj = new Date(session.session_date)

              return (
                <div
                  key={session.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm  "
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-500 ">
                          {dateObj.toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-zinc-900 ">
                          {totalScore} <span className="text-sm font-normal text-zinc-500 ">pts</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-500 ">
                          Avg/Arrow
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-zinc-900 ">
                          {avgScore}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 ">
                      <div>{totalArrows} Arrows</div>
                      <div>•</div>
                      <div>{session.ends?.length || 0} Ends</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50  ">
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 ">
              No sessions yet
            </h3>
            <p className="mt-2 text-sm text-zinc-500 ">
              Get started by logging your first practice.
            </p>
            <Link
              href="/log"
              className="mt-6 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800   :bg-zinc-200"
            >
              Log Session
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
