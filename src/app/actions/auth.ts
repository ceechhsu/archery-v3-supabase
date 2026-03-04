'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
    const supabase = await createClient()

    // Make sure you have configured your Site URL and Redirect URLs in Supabase Auth -> URL Configuration
    // And enabled Google OAuth
    // Determine URL dynamically to handle localhost and Vercel properly
    const getURL = async () => {
        const headersList = await headers()
        const origin = headersList.get('origin')
        const host = headersList.get('x-forwarded-host') || headersList.get('host')
        const proto = headersList.get('x-forwarded-proto') || 'https'

        let url = process?.env?.NEXT_PUBLIC_SITE_URL ?? process?.env?.VERCEL_URL ?? 'http://localhost:3000'

        if (origin) {
            url = origin
        } else if (host) {
            const scheme = host.includes('localhost') ? 'http' : proto
            url = `${scheme}://${host}`
        }

        if (!url.startsWith('http')) {
            url = `https://${url}`
        }

        // Make sure to including trailing `/`.
        url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
        return url
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${await getURL()}auth/callback`,
        },
    })

    if (error) {
        console.error('Error logging in:', error.message)
        return redirect('/login?message=Could not authenticate user')
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
}
