import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/'

    // Always redirect back to the same origin that handled the callback.
    // This prevents session cookies being set on one host and redirecting to another.
    const origin = requestUrl.origin

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Exchange Code Error:', error)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
        }

        return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`)
    }

    return NextResponse.redirect(`${origin}/login?error=No_Code_Provided`)
}
