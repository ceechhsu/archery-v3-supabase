import { createClient } from '@/utils/supabase/server'

export async function DashboardAnalytics({ userId }: { userId: string }) {
    const supabase = await createClient()

    const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
      id,
      ends (
        shots (
          score
        )
      )
    `)
        .eq('user_id', userId)

    if (error || !sessions) {
        return null
    }

    const totalSessions = sessions.length
    let totalArrows = 0
    let totalScore = 0

    sessions.forEach(session => {
        session.ends.forEach(end => {
            end.shots.forEach(shot => {
                totalArrows++
                totalScore += shot.score
            })
        })
    })

    // Format to 1 decimal place
    const lifetimeAvg = totalArrows > 0 ? (totalScore / totalArrows).toFixed(1) : '0'

    return (
        <div className="mb-8 grid grid-cols-3 gap-4 rounded-2xl bg-zinc-900 p-6 text-white shadow-lg dark:bg-zinc-900 dark:border dark:border-zinc-800">
            <div>
                <p className="text-sm font-medium text-zinc-400">Avg / Arrow</p>
                <p className="mt-1 text-3xl font-bold">{lifetimeAvg}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-zinc-400">Total Arrows</p>
                <p className="mt-1 text-3xl font-bold">{totalArrows}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-zinc-400">Sessions</p>
                <p className="mt-1 text-3xl font-bold">{totalSessions}</p>
            </div>
        </div>
    )
}
