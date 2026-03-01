import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        // We should be redirecting the user even if there's an error. 
        // Usually you'd redirect to an error page, but for simplicity we'll redirect to the home page
        // and let the middleware bounce them back to login if the session wasn't established.
        if (!error) {
            return NextResponse.redirect(requestUrl.origin)
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(requestUrl.origin)
}
