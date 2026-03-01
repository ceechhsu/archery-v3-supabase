import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScorecardClient } from './ScorecardClient'
import { ArrowLeft } from 'lucide-react'

export default async function LogSessionPage() {
    const supabase = await createClient()

    // Verify auth
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-24 ">
            <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md  ">
                <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
                    <Link
                        href="/"
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-zinc-100 :bg-zinc-800"
                    >
                        <ArrowLeft className="h-5 w-5 text-zinc-900 " />
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 ">
                        Log Session
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8">
                <ScorecardClient userId={user.id} />
            </main>
        </div>
    )
}
