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
        let url = process?.env?.NEXT_PUBLIC_SITE_URL ?? process?.env?.VERCEL_URL

        if (headersList.get('origin')) {
            url = headersList.get('origin') as string
        } else if (headersList.get('host')) {
            url = `https://${headersList.get('host')}`
        } else {
            url = url || 'http://localhost:3000'
        }

        // Make sure to include `https://` when not localhost.
        url = url.includes('http') ? url : `https://${url}`
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
