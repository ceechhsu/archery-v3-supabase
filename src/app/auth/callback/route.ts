import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    // Determine the true host from headers in case we are behind a Vercel proxy
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const origin = isLocalEnv ? requestUrl.origin : (forwardedHost ? `https://${forwardedHost}` : requestUrl.origin)

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Exchange Code Error:', error)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
        }

        return NextResponse.redirect(`${origin}/`)
    }

    return NextResponse.redirect(`${origin}/login?error=No_Code_Provided`)
}
