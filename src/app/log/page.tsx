import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScorecardClient } from './ScorecardClient'
import { ArrowLeft, Target } from 'lucide-react'

export default async function LogSessionPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()

    // Verify auth
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check for edit mode
    const searchParams = await props.searchParams
    const editId = searchParams.edit
    let initialSession = null

    if (editId && typeof editId === 'string') {
        const { data: session } = await supabase
            .from('sessions')
            .select(`
                id,
                session_date,
                distance,
                notes,
                ends (
                    id,
                    end_index,
                    photo_url,
                    shots (
                        id,
                        shot_index,
                        score,
                        is_x,
                        is_m
                    )
                )
            `)
            .eq('id', editId)
            .single()

        if (session) {
            initialSession = session
        }
    }

    return (
        <div className="min-h-screen bg-stone-50 pb-24">
            <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur-md shadow-sm">
                <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
                    <Link
                        href="/"
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-stone-600" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-terracotta" />
                        <h1 className="text-xl font-serif font-bold tracking-tight text-stone-800">
                            {initialSession ? 'Edit Session' : 'Log Session'}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8">
                <ScorecardClient userId={user.id} initialSession={initialSession} />
            </main>
        </div>
    )
}
