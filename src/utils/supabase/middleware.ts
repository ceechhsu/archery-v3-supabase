import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // Create a response to modify
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create Supabase server client with cookie handlers
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    console.log('Setting cookies:', cookiesToSet.map(c => c.name))
                    // Set cookies on the request for this response
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // This will refresh the session if expired
    const { data: { user } } = await supabase.auth.getUser()

    // Protect routes
    const pathname = request.nextUrl.pathname
    const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/test-match')

    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}
