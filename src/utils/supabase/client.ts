import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    const cookie = document.cookie
                        .split('; ')
                        .find((row) => row.startsWith(`${name}=`))
                    return cookie ? cookie.split('=')[1] : undefined
                },
                set(name: string, value: string, options: { expires?: Date; path?: string; domain?: string; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' }) {
                    let cookieString = `${name}=${value}`
                    if (options.path) {
                        cookieString += `; path=${options.path}`
                    }
                    if (options.expires) {
                        cookieString += `; expires=${options.expires.toUTCString()}`
                    }
                    if (options.domain) {
                        cookieString += `; domain=${options.domain}`
                    }
                    if (options.secure) {
                        cookieString += `; secure`
                    }
                    if (options.sameSite) {
                        cookieString += `; samesite=${options.sameSite}`
                    }
                    document.cookie = cookieString
                },
                remove(name: string, options: { path?: string; domain?: string }) {
                    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
                    if (options.path) {
                        cookieString += `; path=${options.path}`
                    }
                    if (options.domain) {
                        cookieString += `; domain=${options.domain}`
                    }
                    document.cookie = cookieString
                },
            },
        }
    )
}
